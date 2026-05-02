import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

const APP_URL = process.env.PLASMO_PUBLIC_APP_URL || "http://localhost:3000";

type TabState = "ok" | "no_tab" | "restricted" | "no_injection";

export default function Popup() {
  const [tabState, setTabState] = useState<TabState>("ok");
  const [host, setHost] = useState("");
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    chrome.storage.local.get("investiq:voiceEnabled", (value) => {
      setVoice(value["investiq:voiceEnabled"] !== false);
    });
  }, []);

  const refreshTab = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setTabState("no_tab");
        return;
      }
      const url = tab.url ?? "";
      if (
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("https://chrome.google.com/webstore")
      ) {
        setTabState("restricted");
        setHost("");
        return;
      }

      let hostname = "";
      try {
        hostname = new URL(url).hostname;
      } catch {
        hostname = "";
      }
      setHost(hostname);
      chrome.tabs.sendMessage(tab.id, { type: "investiq:ping" }, () => {
        if (chrome.runtime.lastError) setTabState("no_injection");
        else setTabState("ok");
      });
    });
  }, []);

  useEffect(() => {
    refreshTab();
  }, [refreshTab]);

  const post = (action: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !host) return;
      chrome.tabs.sendMessage(tab.id, {
        type: "INVESTIQ_HOST_COMMAND",
        hostname: host,
        action,
      });
    });
    setTimeout(refreshTab, 120);
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    chrome.storage.local.set({ "investiq:voiceEnabled": next });
  };

  return (
    <div style={{ width: 320, padding: 16, boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 18 }}>InvestIQ</h1>
      <p style={{ margin: "0 0 12px", color: "#5c6b80", fontSize: 13, lineHeight: 1.4 }}>
        Kuber follows you across the web. Drag the teal bubble — it stays pinned while this tab stays open.
      </p>

      {tabState === "restricted" ? (
        <p style={{ color: "#c24141", fontSize: 13, marginBottom: 12 }}>
          InvestIQ cannot read this Chrome page or the Web Store. Open any normal article or localhost page.
        </p>
      ) : null}

      {tabState === "no_injection" ? (
        <p style={{ color: "#b45309", fontSize: 13, marginBottom: 12 }}>
          Overlay not reachable on this tab yet. Reload the page after installing/updating the extension, then try
          again.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => post("togglePanel")}
        disabled={tabState !== "ok" || !host}
        style={btn()}
      >
        Toggle Kuber panel
      </button>
      <button
        type="button"
        onClick={() => post("showBubble")}
        disabled={tabState !== "ok" || !host}
        style={{ ...btn(), opacity: tabState !== "ok" ? 0.5 : 1 }}
      >
        Show bubble on this site
      </button>
      <button
        type="button"
        onClick={() => post("hideBubble")}
        disabled={tabState !== "ok" || !host}
        style={{ ...btn(), opacity: tabState !== "ok" ? 0.5 : 1 }}
      >
        Hide bubble on this domain
      </button>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={voice} onChange={toggleVoice} />
        Speak aloud (ElevenLabs via app; browser fallback without keys)
      </label>

      <a href={`${APP_URL}/home`} target="_blank" rel="noreferrer" style={{ ...link(), display: "block", marginTop: 12 }}>
        Open full InvestIQ app →
      </a>
      <a href={`${APP_URL}/extension`} target="_blank" rel="noreferrer" style={{ ...link(), display: "block", marginTop: 6 }}>
        Extension help page →
      </a>

      <p style={{ marginTop: 14, fontSize: 11, color: "#8a96a8", lineHeight: 1.4 }}>
        Live Ask needs your deployed InvestIQ backend reachable from the extension (set <code>PLASMO_PUBLIC_APP_URL</code>)
        plus <code>GROQ_API_KEY</code> server-side — see repo README.
      </p>
      <button type="button" onClick={() => chrome.runtime.reload()} style={{ ...btn(), marginTop: 8 }}>
        Reload extension
      </button>
    </div>
  );
}

function btn(): CSSProperties {
  return {
    width: "100%",
    padding: "9px 10px",
    marginBottom: 8,
    borderRadius: 10,
    border: "1px solid #cfd7e6",
    background: "#0d111a",
    color: "#eaf1ff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  };
}

function link(): CSSProperties {
  return { color: "#2dd4bf", fontWeight: 600, textDecoration: "none", fontSize: 13 };
}
