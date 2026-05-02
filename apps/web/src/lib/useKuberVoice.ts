"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UseKuberVoiceOptions = {
  endpoint?: string;
  maxChars?: number;
  timeoutMs?: number;
  failureDescription?: string;
};

const DEFAULT_FAILURE_DESCRIPTION =
  "Kuber voice is locked to the configured ElevenLabs voice only. Browser fallback is disabled here.";

export function useKuberVoice(options: UseKuberVoiceOptions = {}) {
  const {
    endpoint = "/api/kuber/speak",
    maxChars = 4_800,
    timeoutMs = 30_000,
    failureDescription = DEFAULT_FAILURE_DESCRIPTION,
  } = options;

  const teardownRef = useRef<(() => void) | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    teardownRef.current?.();
    teardownRef.current = null;
    setIsSpeaking(false);
  }, []);

  useEffect(() => stop, [stop]);

  const speak = useCallback(
    async (spokenText: string) => {
      if (typeof window === "undefined") return;
      stop();
      const clipped = spokenText.trim().slice(0, maxChars);
      if (!clipped) return;

      try {
        const abort =
          typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(timeoutMs)
            : undefined;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          ...(abort ? { signal: abort } : {}),
          body: JSON.stringify({ text: clipped }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(errBody || `Voice request failed with ${response.status}.`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        audio.src = url;
        const teardown = () => {
          audio.pause();
          URL.revokeObjectURL(url);
          if (teardownRef.current === teardown) teardownRef.current = null;
          setIsSpeaking(false);
        };

        audio.onended = teardown;
        audio.onerror = teardown;
        teardownRef.current = teardown;
        setIsSpeaking(true);
        await audio.play().catch((error) => {
          teardown();
          throw error;
        });
      } catch (error) {
        setIsSpeaking(false);
        const message =
          error instanceof Error && error.message.trim()
            ? error.message.trim().replace(/^["{]+|["}]+$/g, "")
            : failureDescription;
        toast.error("Voice playback failed.", {
          description: message.length > 220 ? failureDescription : message,
        });
      }
    },
    [endpoint, failureDescription, maxChars, stop, timeoutMs],
  );

  return { isSpeaking, speak, stop };
}
