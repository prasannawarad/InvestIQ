import { classifyPage, type PageClassification } from "./classify";

export type PageContext = {
  title: string;
  url: string;
  excerpt: string;
  fingerprint: string;
  classified: PageClassification;
};

const CONTEXT_DEBOUNCE_MS = 750;
const HISTORY_MAX = 3;

/** Last few contexts while browsing (SPA). Oldest-first trim. */
let recentContexts: Omit<PageContext, "classified">[] = [];

function excerptFromDom(): string {
  const articleText =
    document.querySelector("article")?.textContent ||
    document.querySelector("main")?.textContent ||
    document.body?.innerText ||
    "";
  return articleText.replace(/\s+/g, " ").trim().slice(0, 360);
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function fingerprintContext(title: string, url: string, excerpt: string): string {
  return djb2(`${url}|${title}|${excerpt}`);
}

/** One-shot scrape (SPA-safe when called from watcher). */
export function collectPageContext(): PageContext {
  const title = document.title || "this page";
  const url = window.location.href;
  const excerpt = excerptFromDom();
  const fingerprint = fingerprintContext(title, url, excerpt);
  const classified = classifyPage(title, url, excerpt);
  const base = { title, url, excerpt, fingerprint };
  const exists = recentContexts.some((x) => x.fingerprint === fingerprint);
  if (!exists) {
    recentContexts.push(base);
    if (recentContexts.length > HISTORY_MAX) recentContexts.shift();
  }
  return { ...base, classified };
}

export function getRecentContextTrail(): Omit<PageContext, "classified">[] {
  return [...recentContexts];
}

type Unsubscribe = () => void;

/**
 * Watch URL/content changes typical of SPAs: popstate, history patch, debounced MutationObserver.
 */
export function subscribePageContext(onRefresh: (ctx: PageContext) => void): Unsubscribe {
  let lastPrinted = "";

  let t: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    if (t) clearTimeout(t);
    t = setTimeout(tick, CONTEXT_DEBOUNCE_MS);
  }

  function tick() {
    const ctx = collectPageContext();
    if (ctx.fingerprint !== lastPrinted) {
      lastPrinted = ctx.fingerprint;
      onRefresh(ctx);
    }
  }

  const savedPush = history.pushState.bind(history);
  const savedReplace = history.replaceState.bind(history);

  history.pushState = (...args: Parameters<History["pushState"]>) => {
    savedPush(...args);
    schedule();
  };

  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    savedReplace(...args);
    schedule();
  };

  window.addEventListener("popstate", schedule);

  const rootEl =
    document.querySelector("main") || document.querySelector("article") || document.body || document.documentElement;

  const mo = new MutationObserver(() => schedule());
  mo.observe(rootEl, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: false,
  });

  tick();

  return () => {
    if (t) clearTimeout(t);
    window.removeEventListener("popstate", schedule);
    history.pushState = savedPush;
    history.replaceState = savedReplace;
    mo.disconnect();
  };
}
