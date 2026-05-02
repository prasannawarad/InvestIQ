/** chrome.storage.local keys */

export type BubblePosition = { right: number; bottom: number };

const HIDDEN_HOSTS_KEY = "investiq:hiddenBubbleHosts";

export async function isBubbleHiddenForHost(hostname: string): Promise<boolean> {
  const { [HIDDEN_HOSTS_KEY]: map } = await chrome.storage.local.get(HIDDEN_HOSTS_KEY);
  const rec = (map ?? {}) as Record<string, boolean>;
  return !!rec[hostname];
}

export async function setBubbleHiddenForHost(hostname: string, hidden: boolean): Promise<void> {
  const raw = await chrome.storage.local.get(HIDDEN_HOSTS_KEY);
  const rec = { ...((raw[HIDDEN_HOSTS_KEY] ?? {}) as Record<string, boolean>) };
  if (hidden) rec[hostname] = true;
  else delete rec[hostname];
  await chrome.storage.local.set({ [HIDDEN_HOSTS_KEY]: rec });
}

export async function getVoiceEnabled(): Promise<boolean> {
  const { "investiq:voiceEnabled": v } = await chrome.storage.local.get("investiq:voiceEnabled");
  return v !== false;
}

export async function setVoiceEnabled(on: boolean): Promise<void> {
  await chrome.storage.local.set({ "investiq:voiceEnabled": on });
}

export async function getBubblePosition(): Promise<BubblePosition | null> {
  const { "investiq:bubblePos": pos } = await chrome.storage.local.get("investiq:bubblePos");
  if (!pos || typeof pos.right !== "number" || typeof pos.bottom !== "number") return null;
  return pos;
}

export async function saveBubblePosition(pos: BubblePosition): Promise<void> {
  await chrome.storage.local.set({ "investiq:bubblePos": pos });
}

/** Serialized chat rows for hydration */
export async function saveChatSnapshot(hostname: string, payload: unknown): Promise<void> {
  const raw = await chrome.storage.local.get("investiq:bubbleMessages");
  const bucket = { ...((raw["investiq:bubbleMessages"] ?? {}) as Record<string, unknown>) };
  bucket[hostname] = payload;
  await chrome.storage.local.set({ "investiq:bubbleMessages": bucket });
}

export async function loadChatSnapshot(hostname: string): Promise<unknown | null> {
  const raw = await chrome.storage.local.get("investiq:bubbleMessages");
  const bucket = (raw["investiq:bubbleMessages"] ?? {}) as Record<string, unknown>;
  const v = bucket[hostname];
  return v ?? null;
}
