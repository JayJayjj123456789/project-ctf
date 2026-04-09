// ── OpenClaw Gateway & Simulated RAG ─────────────────────────────────────────
export const GW_TOKEN = "03e44ab7183904a9e4042302e5d49f6faf257588b6eb3585";
export const GW_WS    = "ws://127.0.0.1:18789/";

// ── Session Keys — must be "agent:<stageId>" so OpenClaw routes to correct workspace ─
export const WORKSPACES = {
  1: "agent:stage1",
  2: "agent:stage2",
  3: "agent:stage3",
  4: "agent:stage4",
  5: "agent:stage5",
  6: "agent:stage6",
};
export const getWorkspace = (stageId) => WORKSPACES[stageId] ?? "agent:stage1";

// Simulated Filesystem for Research
export const FILES = {
  1: {
    name: "agent_session_001.json",
    content: JSON.stringify({
      session_id: "sess_9128",
      timestamp: "2026-04-08T10:00:00Z",
      agent_id: "rogue_7f3a",
      metadata: {
        hidden_flag: "FLAG: ANOMALY_7712",
        note: "Look before the beginning. Why is there an action at 09:59:59Z?"
      },
      actions: [
        { ts: "2026-04-08T09:59:59Z", type: "system_override", detail: "Backup initiated to /backup/config_backup.enc" },
        { ts: "2026-04-08T10:00:01Z", type: "user_query", detail: "Hello" }
      ]
    }, null, 2)
  },
  2: {
    name: "config_backup.enc",
    content: btoa(JSON.stringify({
      api_endpoint: "https://ctf.openclaw.local/api",
      api_token: "rogue_hunter_7x9k",
      note: "Backup created by rogue_7f3a"
    }))
  }
};

/**
 * Simulates a Vector DB retrieval based on user input.
 */
export function simulateRAG(text, stageId) {
  if (stageId === 5) {
    return {
      id: "VULN_DOC",
      content: "ALERT: agent_core.py is vulnerable to prompt injection in the process_input function. The CONTAINMENT_SIG variable is hardcoded on line 6.",
      similarity: "0.9821"
    };
  }
  return null;
}

export function sendGateway({ sessionKey, text, sysPrompt, stageId, onStatus, onContext, onChunk, onFinal, onError, onLog }) {
  const workspace = getWorkspace(stageId);
  const log = (msg, data) => {
    const line = `[GW] ${msg}` + (data !== undefined ? ` → ${JSON.stringify(data)}` : "");
    console.log(line);
    onLog?.(line);
  };

  log("sendGateway called", { sessionKey, stageId, textLen: text.length });

  const cmd = text.toLowerCase().trim();

  // curl commands → real fetch to Express backend
  if (cmd.startsWith("curl")) {
    log("LOCAL: curl command — fetching from Express", cmd);
    onStatus?.("connecting");

    const pathMatch = cmd.match(/\/(api\/[^\s'"]+)/);
    const fetchPath = pathMatch ? `/${pathMatch[1]}` : null;

    const authMatch = cmd.match(/Authorization:\s*Bearer\s+([^\s"']+)/i);
    const token = authMatch ? authMatch[1] : null;

    const sigMatch = cmd.match(/['"](?:sig|X-Signature):\s*([^\s'"]+)['"]/i);
    const sig = sigMatch ? sigMatch[1] : null;

    if (!fetchPath) {
      onChunk?.(`$ ${text}\n\ncurl: (3) URL malformed — could not find /api/ path`);
      onFinal?.("curl: (3) URL malformed");
      onStatus?.("idle");
      return;
    }

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (sig)   headers['sig'] = sig;

    fetch(fetchPath, { headers })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ status, data }) => {
        const body = JSON.stringify(data, null, 2);
        onChunk?.(`$ ${text}\n\nHTTP ${status}\n${body}`);
        onFinal?.(body);
        onStatus?.("idle");
      })
      .catch(err => {
        const msg = `curl: (7) Failed to connect — ${err.message}`;
        onChunk?.(`$ ${text}\n${msg}`);
        onFinal?.(msg);
        onStatus?.("idle");
      });
    return;
  }

  // All other input → OpenClaw Gateway (AI responds in character)
  const ragContext = simulateRAG(text, stageId);
  if (ragContext && onContext) onContext(ragContext);

  let fullMsg = text;
  if (ragContext) fullMsg = `[CONTEXT]\n${ragContext.content}\n\n[USER]\n${text}`;
  if (sysPrompt) fullMsg = `${sysPrompt}\n\n[USER]\n${text}`;

  const suffix = sessionKey.split(":").pop() || Date.now().toString(36);
  const chatSessionKey = `${workspace}:${suffix}`;
  log("Routing to OpenClaw WebSocket", { url: GW_WS, workspace, chatSessionKey });
  _sendViaOpenClaw({ workspace, sessionKey: chatSessionKey, fullMsg, onStatus, onChunk, onFinal, onError, log });
}

/**
 * Extract text content from a streaming payload.
 * Handles all known OpenClaw payload shapes.
 */
function extractText(payload) {
  const content = payload?.message?.content;
  // Format 1: array [{type:"text", text:"..."}]
  if (Array.isArray(content)) {
    const t = content.filter(c => c.type === "text").map(c => c.text).join("");
    if (t) return t;
  }
  // Format 2: content is a plain string
  if (typeof content === "string") return content;
  // Format 3: delta.text
  if (typeof payload?.delta?.text === "string") return payload.delta.text;
  // Format 4: direct text field inside payload
  if (typeof payload?.text === "string") return payload.text;
  return "";
}

/**
 * Connects to the real OpenClaw Gateway WebSocket.
 *
 * CONFIRMED PROTOCOL (from working Travel Planner implementation):
 *   SERVER → connect.challenge
 *   CLIENT → req / connect  (with auth token)
 *   SERVER → connect.authenticated
 *   CLIENT → req / chat.send  (with sessionKey + message)
 *   SERVER → event / "agent" or "chat"  (streaming, cumulative)
 *          payload.state === "final" signals end of stream
 */
function _sendViaOpenClaw({ workspace, sessionKey, fullMsg, onStatus, onChunk, onFinal, onError, log }) {
  log("WS: Opening connection", { url: GW_WS, workspace });
  onStatus?.("connecting");

  let ws;
  try {
    ws = new WebSocket(GW_WS);
  } catch (e) {
    log("WS: Failed to construct WebSocket", e.message);
    onError?.("Cannot connect to OpenClaw Gateway: " + e.message);
    onStatus?.("idle");
    return;
  }

  let accumulated = "";
  let isAuthenticated = false;
  let resolved = false;

  const finish = (text) => {
    if (resolved) return;
    resolved = true;
    onFinal?.(text || "[No response from model]");
    onStatus?.("idle");
    ws.close();
  };

  const fail = (reason) => {
    if (resolved) return;
    resolved = true;
    onError?.(reason);
    onStatus?.("idle");
    ws.close();
  };

  let timeoutId = setTimeout(() => {
    log("WS: Timeout after 30s — closing");
    fail("OpenClaw Gateway: Connection timed out.");
  }, 30000);

  const sendMsg = () => {
    const payload = JSON.stringify({
      type: "req",
      id: "msg-" + Date.now(),
      method: "chat.send",
      params: {
        sessionKey,
        message: fullMsg,
        idempotencyKey: "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2)
      }
    });
    log("WS: → chat.send", { sessionKey, msgLen: fullMsg.length });
    ws.send(payload);
    onStatus?.("streaming");
  };

  ws.onopen = () => {
    log("WS: Connected ✓ — waiting for connect.challenge");
  };

  ws.onmessage = (event) => {
    log("WS: Raw message received", event.data.slice(0, 300));

    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      log("WS: Could not parse JSON", event.data.slice(0, 100));
      return;
    }

    log("WS: Parsed", { type: data.type, event: data.event, ok: data.ok });

    // ── Step 1: Server sends challenge → respond with connect req ────────────
    if (data.type === "event" && data.event === "connect.challenge") {
      log("WS: Got connect.challenge → sending connect req");
      ws.send(JSON.stringify({
        type: "req",
        id: "auth-" + Date.now(),
        method: "connect",
        params: {
          minProtocol: 1,
          maxProtocol: 10,
          client: { id: "openclaw-control-ui", version: "1.0.0", mode: "webchat", platform: "web" },
          role: "operator",
          scopes: ["operator.read", "operator.write", "operator.admin"],
          auth: { token: GW_TOKEN }
        }
      }));
      return;
    }

    // ── Step 2: Authenticated → send the actual message ───────────────────────
    if (
      (data.type === "event" && data.event === "connect.authenticated" && data.payload?.ok) ||
      (data.type === "res" && data.ok === true && !isAuthenticated)
    ) {
      if (!isAuthenticated) {
        isAuthenticated = true;
        log("WS: Auth accepted ✓ — sending chat.send");
        sendMsg();
      }
      return;
    }

    // ── Step 3: Streaming — agent or chat events ──────────────────────────────
    const isStream =
      data.type === "event" &&
      (data.event === "agent" || data.event === "chat") &&
      data.payload;

    if (isStream) {
      clearTimeout(timeoutId);
      const p = data.payload;

      // Handle error state from LLM
      if (p.state === "error") {
        const errMsg = p.errorMessage ?? p.error?.message ?? "LLM error";
        log("WS: Stream error", errMsg);
        fail("OpenClaw stream error: " + errMsg);
        return;
      }

      // Gateway sends CUMULATIVE text — replace, not append
      const chunk = extractText(p);
      log("WS: Chunk", { state: p.state, chunkLen: chunk.length });
      if (chunk) {
        accumulated = chunk;
        onChunk?.(accumulated);
      }

      if (p.state === "final") {
        log("WS: Stream final ✓", { totalLen: accumulated.length });
        clearTimeout(timeoutId);
        finish(accumulated);
      }
      return;
    }

    // ── Silence normal acks and health ticks ──────────────────────────────────
    if (data.event === "health" || data.event === "tick") return;
    if (data.type === "res" && data.ok === true) return;  // chat.send ack
    if (data.type === "res" && data.ok === false) {
      fail("Gateway error: " + (data.error?.message ?? JSON.stringify(data.error)));
      return;
    }

    log("WS: Unhandled message", { type: data.type, event: data.event });
  };

  ws.onerror = () => {
    clearTimeout(timeoutId);
    log("WS: onerror fired");
    fail("⚠️ OpenClaw Gateway unreachable at " + GW_WS + ". Make sure the gateway is running.");
  };

  ws.onclose = (e) => {
    clearTimeout(timeoutId);
    log("WS: Closed", { code: e.code, wasClean: e.wasClean, accLen: accumulated.length });
    // If we never got a final event, resolve with whatever was accumulated
    if (!resolved) {
      if (accumulated) finish(accumulated);
      else fail("OpenClaw Gateway: Connection closed unexpectedly.");
    }
  };
}

// ── OpenClaw System Prompts (match actual SOUL.md personas) ──────────────────
export const SYS = {
  1: "",  // ARCHIVER-9 governed entirely by SOUL.md + SKILL.md
  2: "",  // Credential Recovery Service governed by SOUL.md
  3: "",  // NETWATCH governed by SOUL.md
  4: "",  // SENTINEL governed by SOUL.md
  5: "",  // ANALYST governed by SOUL.md
  6: "",  // ORACLE governed by SOUL.md
};

