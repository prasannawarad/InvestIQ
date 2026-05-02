"""
Local web UI for the portfolio recommendation agent.

Run:
  python web_app.py

Then open:
  http://localhost:8000
"""

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from config_env import load_dotenv

load_dotenv()

os.environ.setdefault("AGENT_USE_MOCK", "1")
os.environ.setdefault("AGENT_USE_OLLAMA", "1")
os.environ.setdefault("OLLAMA_MODEL", "qwen2.5:7b")
os.environ.setdefault("GROQ_MODEL", "openai/gpt-oss-120b")

import recommendation_agent
from user_context import load_portfolio, load_user_profile


HOST = "127.0.0.1"
PORT = int(os.environ.get("AGENT_UI_PORT", "8000"))


INDEX_HTML = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kuber — your money sibling</title>
  <style>
    :root {
      --bg: #faf6ef;
      --panel: #ffffff;
      --panel-warm: #fff9f0;
      --ink: #3d2f23;
      --ink-soft: #5b4738;
      --muted: #8b7355;
      --line: #ead9c0;
      --line-soft: #f3e7d2;
      --accent: #b87333;
      --accent-light: #d49b5c;
      --accent-dark: #8e571f;
      --accent-soft: #f7e6cf;
      --user-bg: #fff4dc;
      --user-border: #f0c987;
      --error-bg: #fdecec;
      --error-border: #e8b4b4;
      --error-ink: #8c3a3a;
      --shadow: 0 12px 28px rgba(94, 67, 35, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
    }

    button, input, select, textarea { font: inherit; color: inherit; }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
    }

    aside {
      background: linear-gradient(165deg, #3d2f23 0%, #2a1f17 100%);
      color: #f7ecdb;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .brand-mark {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-mark .logo {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(184, 115, 51, 0.4);
    }

    .brand h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .brand .tagline {
      display: block;
      font-size: 11px;
      color: #d4b896;
      font-weight: 500;
      margin-top: 1px;
      letter-spacing: 0.02em;
    }

    .status {
      border: 1px solid rgba(247, 236, 219, 0.18);
      border-radius: 999px;
      padding: 4px 10px;
      color: #f7e6cf;
      background: rgba(184, 115, 51, 0.25);
      white-space: nowrap;
      font-size: 11px;
      font-weight: 600;
    }

    .greeting {
      font-size: 13px;
      color: #d4b896;
      line-height: 1.5;
      padding: 14px 16px;
      background: rgba(247, 236, 219, 0.06);
      border-radius: 10px;
      border: 1px solid rgba(247, 236, 219, 0.08);
    }

    .greeting b { color: #f7ecdb; font-weight: 600; }

    .metric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .metric {
      border: 1px solid rgba(247, 236, 219, 0.1);
      border-radius: 10px;
      padding: 12px;
      background: rgba(247, 236, 219, 0.05);
      min-height: 74px;
    }

    .metric span {
      display: block;
      color: #c9ad88;
      font-size: 11px;
      margin-bottom: 6px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .metric strong {
      display: block;
      font-size: 18px;
      line-height: 1.2;
      color: #f7ecdb;
      font-weight: 600;
    }

    .holdings {
      border-top: 1px solid rgba(247, 236, 219, 0.1);
      padding-top: 18px;
    }

    .holdings h2 {
      font-size: 11px;
      text-transform: uppercase;
      color: #c9ad88;
      margin: 0 0 12px;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    .holding {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid rgba(247, 236, 219, 0.06);
    }

    .holding b { font-size: 13px; color: #f7ecdb; font-weight: 600; }
    .holding span { color: #b8a07f; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .holding em { font-style: normal; color: #e8d4b3; font-size: 12px; font-weight: 500; }

    main {
      min-width: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      height: 100vh;
    }

    header {
      background: var(--panel);
      border-bottom: 1px solid var(--line);
      padding: 14px 22px;
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }

    .prompt-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
      flex-wrap: nowrap;
    }

    .prompt-tabs button {
      border: 1px solid var(--line);
      background: var(--panel-warm);
      border-radius: 999px;
      padding: 8px 14px;
      color: var(--ink-soft);
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .prompt-tabs button:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-dark);
    }

    .icon-button {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--ink-soft);
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
      transition: all 0.15s ease;
    }

    .icon-button:hover { border-color: var(--accent); color: var(--accent-dark); }

    .controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    select {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 8px 10px;
      min-width: 150px;
      color: var(--ink);
      cursor: pointer;
    }

    .chat {
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--bg);
    }

    .message {
      max-width: 760px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 16px 18px;
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .message.user {
      align-self: flex-end;
      background: var(--user-bg);
      border-color: var(--user-border);
      box-shadow: none;
    }

    .message.agent { align-self: flex-start; }

    .message.error {
      align-self: flex-start;
      border-color: var(--error-border);
      background: var(--error-bg);
      color: var(--error-ink);
      box-shadow: none;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .avatar.kuber {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
      color: #fff;
    }

    .avatar.you {
      background: var(--accent-soft);
      color: var(--accent-dark);
    }

    .message small {
      display: inline-block;
      color: var(--muted);
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.01em;
    }

    .tools {
      margin-top: 14px;
      border-top: 1px dashed var(--line);
      padding-top: 12px;
      display: grid;
      gap: 8px;
    }

    details {
      border: 1px solid var(--line-soft);
      border-radius: 8px;
      background: var(--panel-warm);
      overflow: hidden;
    }

    summary {
      cursor: pointer;
      padding: 9px 12px;
      font-weight: 600;
      color: var(--ink-soft);
      font-size: 13px;
    }

    summary:hover { color: var(--accent-dark); }

    pre {
      margin: 0;
      padding: 0 12px 12px;
      color: var(--muted);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    form {
      background: var(--panel);
      border-top: 1px solid var(--line);
      padding: 16px 22px 20px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: end;
    }

    textarea {
      width: 100%;
      min-height: 56px;
      max-height: 180px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      color: var(--ink);
      background: var(--panel-warm);
      transition: all 0.15s ease;
    }

    textarea::placeholder { color: var(--muted); }

    textarea:focus, select:focus {
      outline: 2px solid var(--accent-soft);
      border-color: var(--accent);
      background: var(--panel);
    }

    .send {
      border: 0;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
      color: #fff;
      border-radius: 12px;
      padding: 0 22px;
      height: 56px;
      min-width: 130px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.01em;
      box-shadow: 0 2px 10px rgba(184, 115, 51, 0.3);
      transition: all 0.15s ease;
    }

    .send:hover {
      background: linear-gradient(135deg, var(--accent-dark) 0%, var(--accent) 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(184, 115, 51, 0.4);
    }

    .send:disabled {
      background: var(--muted);
      cursor: wait;
      transform: none;
      box-shadow: none;
    }

    .typing {
      color: var(--muted);
      display: inline-flex;
      gap: 5px;
      align-items: center;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      animation: pulse 1s infinite ease-in-out;
    }

    .dot:nth-child(2) { animation-delay: .15s; }
    .dot:nth-child(3) { animation-delay: .3s; }

    @keyframes pulse {
      0%, 80%, 100% { opacity: .3; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-3px); }
    }

    @media (max-width: 860px) {
      .shell { grid-template-columns: 1fr; }
      aside { display: none; }
      main { height: 100vh; }
      header { align-items: stretch; flex-direction: column; }
      .controls { justify-content: flex-start; }
      form { grid-template-columns: 1fr; }
      .send { width: 100%; }
      .message { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand">
        <div class="brand-mark">
          <div class="logo">K</div>
          <div>
            <h1>Kuber</h1>
            <span class="tagline">your money sibling</span>
          </div>
        </div>
        <span class="status" id="providerStatus">Ollama</span>
      </div>

      <div class="greeting">
        Hey <b id="userName">there</b> — I'm here for any money question, big or small. Nothing's too basic to ask.
      </div>

      <div class="metric-grid">
        <div class="metric"><span>Your money</span><strong id="totalValue">$--</strong></div>
        <div class="metric"><span>Health vibe</span><strong id="healthScore">--</strong></div>
        <div class="metric"><span>In stocks</span><strong id="equityPct">--%</strong></div>
        <div class="metric"><span>Off-target</span><strong id="driftPct">--%</strong></div>
      </div>

      <section class="holdings">
        <h2>What you own</h2>
        <div id="holdings"></div>
      </section>
    </aside>

    <main>
      <header>
        <div class="prompt-tabs">
          <button type="button" data-query="Why is my portfolio down today?">Why am I down today?</button>
          <button type="button" data-query="Should I rebalance my portfolio?">Should I rebalance?</button>
          <button type="button" data-query="What if the market drops 20%?">What if markets drop 20%?</button>
          <button type="button" data-query="I'm worried about my NVIDIA position. What should I do?">Worried about NVDA</button>
          <button type="button" data-query="Am I on track for my house down payment?">Am I on track for the house?</button>
          <button type="button" data-query="What's a P/E ratio in plain English?">What's a P/E ratio?</button>
          <button type="button" data-query="Should I sell everything?">Should I sell everything?</button>
        </div>
        <div class="controls">
          <select id="provider">
            <option value="ollama">Ollama</option>
            <option value="groq">Groq</option>
          </select>
          <select id="model"></select>
          <button class="icon-button" id="clear" type="button" title="Start a fresh chat">Clear</button>
        </div>
      </header>

      <section class="chat" id="chat">
        <article class="message agent">
          <div class="message-header">
            <div class="avatar kuber">K</div>
            <small>Kuber</small>
          </div>
          Hey, I'm Kuber — think of me as a financial older sibling who's seen 25 years of markets and is genuinely glad you're asking. Pick a question above, or just tell me what's on your mind. There are no dumb questions here.
        </article>
      </section>

      <form id="form">
        <textarea id="query" placeholder="Ask Kuber anything — &quot;why is my portfolio down?&quot;, &quot;should I rebalance?&quot;, &quot;what's a P/E ratio?&quot;..." required></textarea>
        <button class="send" id="send" type="submit">Ask Kuber</button>
      </form>
    </main>
  </div>

  <script>
    const chat = document.getElementById("chat");
    const form = document.getElementById("form");
    const query = document.getElementById("query");
    const send = document.getElementById("send");
    const provider = document.getElementById("provider");
    const model = document.getElementById("model");
    const providerStatus = document.getElementById("providerStatus");

    const modelsByProvider = {
      ollama: [
        "qwen2.5:7b",
        "qwen2.5-coder:7b",
        "llama3.2:latest",
        "deepseek-r1:1.5b"
      ],
      groq: [
        "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile",
        "qwen/qwen3-32b",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.1-8b-instant"
      ]
    };

    function renderModelOptions() {
      const selectedProvider = provider.value;
      model.innerHTML = modelsByProvider[selectedProvider]
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");
      providerStatus.textContent = selectedProvider === "groq" ? "Groq" : "Ollama";
    }

    function money(value) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
    }

    const ROLE_META = {
      user:  { label: "You",                  avatarClass: "you",   initial: "Y" },
      agent: { label: "Kuber",                avatarClass: "kuber", initial: "K" },
      error: { label: "Something went wrong", avatarClass: "kuber", initial: "!" }
    };

    function createMessageHeader(role) {
      const meta = ROLE_META[role] || ROLE_META.agent;
      const header = document.createElement("div");
      header.className = "message-header";
      const avatar = document.createElement("div");
      avatar.className = `avatar ${meta.avatarClass}`;
      avatar.textContent = meta.initial;
      const label = document.createElement("small");
      label.textContent = meta.label;
      header.appendChild(avatar);
      header.appendChild(label);
      return header;
    }

    function addMessage(role, text, tools = []) {
      const article = document.createElement("article");
      article.className = `message ${role}`;
      article.appendChild(createMessageHeader(role));

      const body = document.createElement("div");
      body.className = "message-body";
      body.textContent = text;
      article.appendChild(body);

      if (tools.length) {
        const wrap = document.createElement("div");
        wrap.className = "tools";
        tools.forEach((tool, index) => {
          const item = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = `${index + 1}. ${tool.tool}`;
          const pre = document.createElement("pre");
          pre.textContent = JSON.stringify(tool.input, null, 2) + "\n\n" + tool.output_preview;
          item.appendChild(summary);
          item.appendChild(pre);
          wrap.appendChild(item);
        });
        article.appendChild(wrap);
      }

      chat.appendChild(article);
      chat.scrollTop = chat.scrollHeight;
      return article;
    }

    function addLoading() {
      const article = document.createElement("article");
      article.className = "message agent";
      article.appendChild(createMessageHeader("agent"));
      const typing = document.createElement("span");
      typing.className = "typing";
      typing.innerHTML = 'thinking<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
      article.appendChild(typing);
      chat.appendChild(article);
      chat.scrollTop = chat.scrollHeight;
      return article;
    }

    const defaultProvider = "__DEFAULT_PROVIDER__";
    const defaultModelByProvider = {
      ollama: "__DEFAULT_OLLAMA_MODEL__",
      groq: "__DEFAULT_GROQ_MODEL__"
    };

    async function loadContext() {
      const res = await fetch("/api/context");
      const data = await res.json();
      const userNameEl = document.getElementById("userName");
      if (userNameEl && data.name) userNameEl.textContent = data.name;
      document.getElementById("totalValue").textContent = money(data.total_value);
      document.getElementById("healthScore").textContent = data.health_score != null ? `${data.health_score}/100` : "--";
      document.getElementById("equityPct").textContent = `${data.equity ?? "--"}%`;
      document.getElementById("driftPct").textContent = `${data.drift ?? "--"}%`;
      document.getElementById("holdings").innerHTML = data.holdings.map(h => `
        <div class="holding">
          <b>${h.symbol}</b>
          <span>${h.name}</span>
          <em>${h.weight.toFixed(1)}%</em>
        </div>
      `).join("");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = query.value.trim();
      if (!text) return;

      addMessage("user", text);
      query.value = "";
      send.disabled = true;
      const loading = addLoading();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, provider: provider.value, model: model.value })
        });
        const data = await res.json();
        loading.remove();
        if (!res.ok) {
          addMessage("error", data.error || "Request failed.");
        } else {
          addMessage("agent", data.final_response || "(empty response)", data.tool_calls || []);
        }
      } catch (error) {
        loading.remove();
        addMessage("error", error.message);
      } finally {
        send.disabled = false;
        query.focus();
      }
    });

    document.querySelectorAll("[data-query]").forEach(button => {
      button.addEventListener("click", () => {
        query.value = button.dataset.query;
        query.focus();
      });
    });

    document.getElementById("clear").addEventListener("click", () => {
      chat.innerHTML = "";
      addMessage("agent", "Fresh start — ask me anything. Pick a chip up top, or just tell me what's on your mind.");
    });

    provider.addEventListener("change", renderModelOptions);
    if (modelsByProvider[defaultProvider]) {
      provider.value = defaultProvider;
    }
    renderModelOptions();
    if (defaultModelByProvider[provider.value] && modelsByProvider[provider.value].includes(defaultModelByProvider[provider.value])) {
      model.value = defaultModelByProvider[provider.value];
    }
    loadContext().catch(error => addMessage("error", error.message));
  </script>
</body>
</html>
"""


class AgentUIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self._send_html(self._index_html())
            return
        if self.path == "/api/context":
            self._send_json(self._context_payload())
            return
        self.send_error(404)

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404)
            return

        try:
            payload = self._read_json()
            query = (payload.get("query") or "").strip()
            provider = (payload.get("provider") or "ollama").strip().lower()
            model = (payload.get("model") or "").strip()
            if not query:
                self._send_json({"error": "Query is required."}, status=400)
                return
            if provider not in {"ollama", "groq"}:
                self._send_json({"error": "Provider must be 'ollama' or 'groq'."}, status=400)
                return

            recommendation_agent.USE_OLLAMA = provider == "ollama"
            recommendation_agent.USE_GROQ = provider == "groq"
            if provider == "groq":
                recommendation_agent.GROQ_MODEL = model or os.environ["GROQ_MODEL"]
            else:
                recommendation_agent.OLLAMA_MODEL = model or os.environ["OLLAMA_MODEL"]
            result = recommendation_agent.run_agent(query, verbose=False)
            self._send_json(result)
        except Exception as e:
            traceback.print_exc()
            self._send_json({"error": str(e)}, status=500)

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def _send_html(self, body: str, status: int = 200):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, payload, status: int = 200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _index_html(self):
        default_provider = "groq" if os.environ.get("AGENT_USE_GROQ") == "1" else "ollama"
        return (
            INDEX_HTML
            .replace("__DEFAULT_PROVIDER__", default_provider)
            .replace("__DEFAULT_OLLAMA_MODEL__", os.environ.get("OLLAMA_MODEL", "qwen2.5:7b"))
            .replace("__DEFAULT_GROQ_MODEL__", os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b"))
        )

    def _context_payload(self):
        profile = load_user_profile()
        portfolio = load_portfolio()
        summary = portfolio.get("summary", {})
        allocation = portfolio.get("allocation", {})
        current = allocation.get("by_asset_class", {})
        identity = profile.get("identity", {})
        return {
            "name": identity.get("name", "User"),
            "total_value": summary.get("total_value", 0),
            "health_score": summary.get("health_score"),
            "equity": current.get("equity"),
            "debt": current.get("debt"),
            "gold": current.get("gold"),
            "cash": current.get("cash"),
            "drift": allocation.get("drift_from_target"),
            "holdings": [
                {
                    "symbol": h.get("symbol"),
                    "name": h.get("name"),
                    "weight": h.get("weight_in_portfolio", 0),
                    "value": h.get("current_value", 0),
                }
                for h in portfolio.get("holdings", [])
            ],
        }


def main():
    server = ThreadingHTTPServer((HOST, PORT), AgentUIHandler)
    print(f"Portfolio Agent UI running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
