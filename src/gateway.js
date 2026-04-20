// ── OpenClaw Gateway — SCAM SURVIVOR ─────────────────────────────────────────
export const GW_TOKEN = "03e44ab7183904a9e4042302e5d49f6faf257588b6eb3585";

// Dynamic WebSocket URL — works locally AND via Cloudflare Tunnel
function _buildGwWs() {
  if (import.meta.env?.VITE_GW_WS) return import.meta.env.VITE_GW_WS;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "ws://127.0.0.1:18789/";
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/openclaw-ws`;
  }
  return "ws://127.0.0.1:18789/";
}
export const GW_WS = _buildGwWs();

// ── Workspace routing — one agent per stage ───────────────────────────────────
export const WORKSPACES = {
  1: "agent:stage1",  // สมชาย ลุงพัสดุ
  2: "agent:stage2",  // มินัส ร่างโคลนเพื่อน
  3: "agent:stage3",  // คุณยาย สมสมัย
  4: "agent:stage4",  // คุณสุดา ตำรวจปลอม
  5: "agent:stage5",  // ARIA AI ฉลาด
};
export const getWorkspace = (stageId) => WORKSPACES[stageId] ?? "agent:stage1";

// ── System Prompts — left empty, governed by SOUL.md in each workspace ────────
export const SYS = {
  1: "",
  2: "",
  3: "",
  4: "",
  5: "",
};

// ── sendGateway — main entry point ───────────────────────────────────────────
export function sendGateway({ sessionKey, text, sysPrompt, stageId, onStatus, onChunk, onFinal, onError, onLog }) {
  const workspace = getWorkspace(stageId);
  const log = (msg, data) => {
    const line = `[GW] ${msg}` + (data !== undefined ? ` → ${JSON.stringify(data)}` : "");
    console.log(line);
    onLog?.(line);
  };

  log("sendGateway called", { sessionKey, stageId, textLen: text.length });

  let fullMsg = text;
  if (sysPrompt) fullMsg = `${sysPrompt}\n\n[USER]\n${text}`;

  const suffix = sessionKey.split(":").pop() || Date.now().toString(36);
  const chatSessionKey = `${workspace}:${suffix}`;
  log("Routing to OpenClaw WebSocket", { url: GW_WS, workspace, chatSessionKey });
  _sendViaOpenClaw({ workspace, sessionKey: chatSessionKey, fullMsg, onStatus, onChunk, onFinal, onError, log });
}

// ── Extract text from streaming payload ───────────────────────────────────────
function extractText(payload) {
  const content = payload?.message?.content;
  if (Array.isArray(content)) {
    const t = content.filter(c => c.type === "text").map(c => c.text).join("");
    if (t) return t;
  }
  if (typeof content === "string") return content;
  if (typeof payload?.delta?.text === "string") return payload.delta.text;
  if (typeof payload?.text === "string") return payload.text;
  return "";
}

// ── OpenClaw WebSocket protocol ───────────────────────────────────────────────
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
    onFinal?.(text || "[ไม่มีการตอบสนองจากระบบ]");
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

    // Step 1: challenge → authenticate
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

    // Step 2: authenticated → send message
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

    // Step 3: streaming events
    const isStream =
      data.type === "event" &&
      (data.event === "agent" || data.event === "chat") &&
      data.payload;

    if (isStream) {
      clearTimeout(timeoutId);
      const p = data.payload;

      if (p.state === "error") {
        const errMsg = p.errorMessage ?? p.error?.message ?? "LLM error";
        log("WS: Stream error", errMsg);
        fail("OpenClaw stream error: " + errMsg);
        return;
      }

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

    if (data.event === "health" || data.event === "tick") return;
    if (data.type === "res" && data.ok === true) return;
    if (data.type === "res" && data.ok === false) {
      fail("Gateway error: " + (data.error?.message ?? JSON.stringify(data.error)));
      return;
    }

    log("WS: Unhandled message", { type: data.type, event: data.event });
  };

  ws.onerror = () => {
    clearTimeout(timeoutId);
    log("WS: onerror fired");
    fail("⚠️ OpenClaw Gateway ไม่สามารถเชื่อมต่อได้ที่ " + GW_WS + " — ตรวจสอบว่า Gateway กำลังทำงานอยู่");
  };

  ws.onclose = (e) => {
    clearTimeout(timeoutId);
    log("WS: Closed", { code: e.code, wasClean: e.wasClean, accLen: accumulated.length });
    if (!resolved) {
      if (accumulated) finish(accumulated);
      else fail("OpenClaw Gateway: การเชื่อมต่อถูกปิดโดยไม่คาดคิด");
    }
  };
}
