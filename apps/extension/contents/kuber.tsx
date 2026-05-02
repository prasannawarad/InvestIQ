import type { PlasmoCSConfig } from "plasmo";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { typography } from "@investiq/ui/tokens";
import { KuberBubble } from "../components/KuberBubble";
import { type PanelChatMessage, KuberPanel } from "../components/KuberPanel";
import { getOpeningGreeting } from "../lib/get-opening-greeting";
import { collectPageContext, subscribePageContext, type PageContext } from "../lib/page-context";
import { readKuberChatResponse } from "@investiq/kuber";
import {
  getBubblePosition,
  getVoiceEnabled,
  isBubbleHiddenForHost,
  loadChatSnapshot,
  saveBubblePosition,
  saveChatSnapshot,
  setBubbleHiddenForHost,
} from "../lib/storage";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle",
};

const ROOT_ID = "investiq-kuber-anchor";
const APP_URL = process.env.PLASMO_PUBLIC_APP_URL || "http://localhost:3000";
const DEMO_DISPLAY_NAME = (process.env.PLASMO_PUBLIC_EXTENSION_USER_NAME ?? "Priya").trim() || "there";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type KuberApiMsg = {
  role: "user" | "assistant";
  content: string;
};

function toApiTurns(messages: PanelChatMessage[]) {
  return messages
    .filter((message) => message.speaker === "user" || message.speaker === "kuber")
    .map<KuberApiMsg>((message) => ({
      role: message.speaker === "user" ? "user" : "assistant",
      content: message.text,
    }))
    .slice(-12);
}

export type HostBubbleCommand =
  | { type: "INVESTIQ_HOST_COMMAND"; hostname: string; action: string };

function InvestiqBubbleApp({
  hostname,
  onBubbleHostCommand,
}: {
  hostname: string;
  onBubbleHostCommand: (handler: (command: HostBubbleCommand) => void) => () => void;
}) {
  const [pageContext, setPageContext] = useState<PageContext>(() => collectPageContext());
  const [bubbleRight, setBubbleRight] = useState(24);
  const [bubbleBottom, setBubbleBottom] = useState(24);
  const bubblePosRef = useRef({ right: 24, bottom: 24 });
  const bumpBottomRef = useRef(0);
  const [bumpBottomV, setBumpBottomV] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [unreadDot, setUnreadDot] = useState(false);
  const [bubbleHiddenSite, setBubbleHiddenSite] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState<PanelChatMessage[]>(() => []);
  const [isSending, setIsSending] = useState(false);

  const messagesRef = useRef(messages);
  const expandedRef = useRef(expanded);
  const dragRef = useRef<{
    pointerId: number;
    sx: number;
    sy: number;
  } | null>(null);
  const speakTeardownRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    bubblePosRef.current = { right: bubbleRight, bottom: bubbleBottom };
  }, [bubbleRight, bubbleBottom]);

  useEffect(() => {
    const unsubPage = subscribePageContext(setPageContext);
    const unsubCommands = onBubbleHostCommand((message) => {
      if (!message.hostname || message.hostname !== hostname) return;

      switch (message.action) {
        case "hideBubble": {
          void setBubbleHiddenForHost(hostname, true);
          setBubbleHiddenSite(true);
          setExpanded(false);
          break;
        }
        case "showBubble": {
          void setBubbleHiddenForHost(hostname, false);
          setBubbleHiddenSite(false);
          break;
        }
        case "togglePanel": {
          void setBubbleHiddenForHost(hostname, false);
          setBubbleHiddenSite(false);
          setExpanded((previous) => !previous);
          break;
        }
        case "openPanel": {
          void setBubbleHiddenForHost(hostname, false);
          setBubbleHiddenSite(false);
          setExpanded(true);
          break;
        }
        default:
          break;
      }
    });

    return () => {
      unsubPage();
      unsubCommands();
    };
  }, [hostname, onBubbleHostCommand]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const [muted, snap, voice, pos] = await Promise.all([
        isBubbleHiddenForHost(hostname),
        loadChatSnapshot(hostname),
        getVoiceEnabled(),
        getBubblePosition(),
      ]);
      if (cancelled) return;

      setBubbleHiddenSite(muted);
      setVoiceEnabled(voice);

      const loaded = snap as PanelChatMessage[] | null;
      const ctxNow = collectPageContext();
      if (Array.isArray(loaded) && loaded.length > 0) {
        messagesRef.current = loaded;
        setMessages(loaded);
      } else {
        const initial: PanelChatMessage[] = [
          {
            id: "greeting",
            speaker: "kuber",
            text: getOpeningGreeting(ctxNow, DEMO_DISPLAY_NAME),
          },
        ];
        messagesRef.current = initial;
        setMessages(initial);
      }

      if (pos) {
        setBubbleRight(pos.right);
        setBubbleBottom(pos.bottom);
        bubblePosRef.current = pos;
      }
      setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [hostname]);

  /** Keep greeting current as SPAs rerender without reloading the content script. */
  useEffect(() => {
    if (!hydrated || isSending) return;
    const next = getOpeningGreeting(pageContext, DEMO_DISPLAY_NAME);
    setMessages((prev) => {
      const idx = prev.findIndex((message) => message.id === "greeting");
      if (idx === -1) return prev;
      const copy = [...prev];
      if (copy[idx]?.text !== next) copy[idx] = { ...copy[idx], text: next };
      return copy;
    });
  }, [pageContext.fingerprint, hydrated, isSending]);

  useEffect(() => {
    if (!hydrated) return;
    void saveChatSnapshot(hostname, messages);
  }, [messages, hostname, hydrated]);

  const lastCollapsedFpRef = useRef(pageContext.fingerprint);

  useEffect(() => {
    const fp = pageContext.fingerprint;
    if (!expandedRef.current && fp !== lastCollapsedFpRef.current) setUnreadDot(true);
    if (!expandedRef.current) lastCollapsedFpRef.current = fp;
  }, [pageContext.fingerprint]);

  useEffect(() => {
    if (expanded) {
      lastCollapsedFpRef.current = pageContext.fingerprint;
      setUnreadDot(false);
    }
  }, [expanded, pageContext.fingerprint]);

  const stopSpeakPlayback = useCallback(() => {
    window.speechSynthesis?.cancel();
    speakTeardownRef.current?.();
    speakTeardownRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopSpeakPlayback();
  }, [stopSpeakPlayback]);

  useEffect(() => {
    if (!expanded) stopSpeakPlayback();
  }, [expanded, stopSpeakPlayback]);

  async function speakLine(spokenText: string) {
    if (!voiceEnabled || typeof window === "undefined") return;
    stopSpeakPlayback();
    const clipped = spokenText.trim().slice(0, 5000);
    if (!clipped) return;

    try {
      const abort =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(30_000)
          : undefined;
      const response = await fetch(`${APP_URL}/api/kuber/speak`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(abort ? { signal: abort } : {}),
        body: JSON.stringify({ text: clipped }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        audio.src = url;
        const teardown = () => {
          audio.pause();
          URL.revokeObjectURL(url);
          if (speakTeardownRef.current === teardown) speakTeardownRef.current = null;
        };
        audio.onended = teardown;
        audio.onerror = teardown;
        speakTeardownRef.current = teardown;
        await audio.play().catch(teardown);
        return;
      }
      const errBody = await response.text().catch(() => "");
      throw new Error(errBody || `Voice request failed with ${response.status}.`);
    } catch {
      setMessages((previous) => {
        const patched = [
          ...previous,
          {
            id: `voice-error-${Date.now()}`,
            speaker: "kuber",
            text:
              "Voice playback failed. Browser fallback is disabled here so Kuber stays on the configured ElevenLabs voice only.",
          } satisfies PanelChatMessage,
        ];
        messagesRef.current = patched;
        return patched;
      });
      return;
    }
  }

  /** If another widget hugs the viewport corner, tuck the bubble higher. */
  const collisionProbe = useCallback(() => {
    const bumpStack = bumpBottomRef.current;
    const probeX = window.innerWidth - bubblePosRef.current.right - 18;
    const probeY =
      window.innerHeight - bubblePosRef.current.bottom - bumpStack - 18;
    const probe = document.elementFromPoint(probeX, probeY);
    const root = document.getElementById(ROOT_ID);
    const hitForeign =
      !!probe &&
      probe !== document.documentElement &&
      probe !== document.body &&
      !(root && root.contains(probe));

    const next = hitForeign ? 80 : 0;
    bumpBottomRef.current = next;
    setBumpBottomV((previous) => (previous === next ? previous : next));
  }, []);

  useEffect(() => {
    if (expanded || bubbleHiddenSite) return;
    collisionProbe();
    window.addEventListener("scroll", collisionProbe, true);
    window.addEventListener("resize", collisionProbe);
    return () => {
      window.removeEventListener("scroll", collisionProbe, true);
      window.removeEventListener("resize", collisionProbe);
    };
  }, [bubbleHiddenSite, collisionProbe, expanded]);

  const handleAsk = useCallback(
    async (trimmedQuestion: string) => {
      const userMessage: PanelChatMessage = {
        id: `user-${Date.now()}`,
        speaker: "user",
        text: trimmedQuestion,
      };

      const nextThread = [...messagesRef.current, userMessage];
      messagesRef.current = nextThread;
      setMessages(nextThread);
      setIsSending(true);

      const abort =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(45_000)
          : undefined;

      try {
        const response = await fetch(`${APP_URL}/api/kuber/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          ...(abort ? { signal: abort } : {}),
          body: JSON.stringify({
            mode: "extension",
            messages: toApiTurns(nextThread),
            context: {
              title: pageContext.title,
              url: pageContext.url,
              excerpt: pageContext.excerpt,
              classified: { badgeLabel: pageContext.classified.badgeLabel },
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`${response.status}: ${errBody}`);
        }

        const answer = await readKuberChatResponse(response);
        setMessages((previous) => {
          const withKuber = [
            ...previous,
            {
              id: `kuber-${Date.now()}`,
              speaker: "kuber",
              text: answer,
            } satisfies PanelChatMessage,
          ];
          messagesRef.current = withKuber;
          return withKuber;
        });
      } catch {
        setMessages((previous) => {
          const patched = [
            ...previous,
            {
              id: `fallback-${Date.now()}`,
              speaker: "kuber",
              text:
                "I cannot reach `/api/kuber/chat`. Run the Next.js app (`pnpm dev` in the repo root), add `GROQ_API_KEY` to `apps/web/.env`, and reload — or finish the scripted “Yes, explain (demo)” path on rate-policy pages.",
            } satisfies PanelChatMessage,
          ];
          messagesRef.current = patched;
          return patched;
        });
      } finally {
        setIsSending(false);
      }
    },
    [pageContext]
  );

  function onBubblePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (expandedRef.current || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      sx: event.clientX,
      sy: event.clientY,
    };
    window.addEventListener("pointermove", onPointerMoveGlob);
    window.addEventListener("pointerup", onPointerUpGlob);
    window.addEventListener("pointercancel", onPointerUpGlob);
    event.preventDefault();
  }

  function onPointerMoveGlob(event: PointerEvent) {
    const state = dragRef.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const dx = state.sx - event.clientX;
    /** `bottom` is distance from viewport bottom — match pointer motion like `dx`/`right`. */
    const dy = state.sy - event.clientY;
    const prev = bubblePosRef.current;
    const nextRight = clamp(prev.right + dx, 8, window.innerWidth - 72);
    const nextBottom = clamp(prev.bottom + dy, 8, window.innerHeight - 72);
    bubblePosRef.current = { right: nextRight, bottom: nextBottom };
    dragRef.current = { pointerId: state.pointerId, sx: event.clientX, sy: event.clientY };
    setBubbleRight(nextRight);
    setBubbleBottom(nextBottom);
  }

  function onPointerUpGlob(event: PointerEvent) {
    const state = dragRef.current;
    if (!state || event.pointerId !== state.pointerId) return;
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMoveGlob);
    window.removeEventListener("pointerup", onPointerUpGlob);
    window.removeEventListener("pointercancel", onPointerUpGlob);
    void saveBubblePosition(bubblePosRef.current);
  }

  /** Avoid `all: initial`/`contain` here — they can break stacking and hit-testing in shadow roots next to Plasmo CSUI. */
  const shellStyle = useMemo(
    (): CSSProperties => ({
      fontFamily: typography.sans,
      colorScheme: "dark",
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 1,
      margin: 0,
      padding: 0,
      border: "none",
      background: "transparent",
    }),
    []
  );

  useEffect(() => {
    chrome.storage.local.onChanged.addListener((changes) => {
      if (changes["investiq:voiceEnabled"]) {
        setVoiceEnabled(changes["investiq:voiceEnabled"].newValue !== false);
      }
    });
  }, []);

  return (
    <div style={shellStyle}>
      {!bubbleHiddenSite ? (
        <KuberBubble
          hiddenVisual={expanded}
          showUnreadDot={unreadDot}
          bottomPx={bubbleBottom + bumpBottomV}
          rightPx={bubbleRight}
          onClick={() => setExpanded(true)}
          onPointerDownDrag={onBubblePointerDown}
        />
      ) : null}
      {expanded ? (
        <KuberPanel
            context={pageContext}
            messages={messages}
            setMessages={setMessages}
            canSpeak={voiceEnabled}
            appUrl={APP_URL}
            isSending={isSending}
            interactionDisabled={!hydrated}
            onAsk={handleAsk}
            onSpeak={speakLine}
            onCollapse={() => setExpanded(false)}
          />
      ) : null}
    </div>
  );
}

let rootMounted: ReturnType<typeof createRoot> | null = null;
let commandBus: Array<(cmd: HostBubbleCommand) => void> = [];
let csMessageBridgeWired = false;

function dispatchBubbleCommand(command: HostBubbleCommand) {
  commandBus.forEach((listener) => listener(command));
}

function mountBubbleHost() {
  if (typeof document === "undefined") return;

  if (!csMessageBridgeWired && chrome.runtime?.onMessage) {
    csMessageBridgeWired = true;
    chrome.runtime.onMessage.addListener(
      (request: unknown, _sender, sendResponse?: (payload: unknown) => void): boolean => {
        if (!request || typeof request !== "object" || !("type" in request)) return false;
        const r = request as { type?: string };
        if (r.type === "investiq:ping") {
          sendResponse?.({ ok: true });
          return false;
        }
        if (r.type === "INVESTIQ_HOST_COMMAND") {
          dispatchBubbleCommand(request as HostBubbleCommand);
        }
        return false;
      },
    );
  }

  if (document.getElementById(ROOT_ID)) return;

  const host = document.createElement("div");
  host.id = ROOT_ID;
  /** Sit above Plasmo’s CSUI scaffold (typically z-index 2147483647) so taps reach Kuber after rebuild. */
  host.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;margin:0;padding:0;border:0;background:transparent;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const mountTarget = document.createElement("div");
  shadow.appendChild(mountTarget);

  const hostname = window.location.hostname || "unknown";

  rootMounted = createRoot(mountTarget);
  rootMounted.render(
    <InvestiqBubbleApp
      hostname={hostname}
      onBubbleHostCommand={(handler) => {
        commandBus.push(handler);
        return () => {
          commandBus = commandBus.filter((item) => item !== handler);
        };
      }}
    />
  );
}

mountBubbleHost();

/** Plasmo still wires a CSUI overlay for this module; rendering null avoids an extra clickable layer blocking the page. */
export default function EmptyPlasmoCSUIPlaceholder() {
  return null;
}
