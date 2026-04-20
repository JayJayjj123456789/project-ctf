import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ── WebSocket Proxy — browser → this server → OpenClaw Gateway ───────────────
// Required when served via Cloudflare Tunnel (can't expose OpenClaw WS directly)
const wss = new WebSocketServer({ noServer: true });

function attachNativeWsProxy(server) {
  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/openclaw-ws')) {
      socket.destroy();
      return;
    }
    console.log('[ws-proxy] Upgrade → creating pipe to OpenClaw');
    wss.handleUpgrade(req, socket, head, (clientWs) => {
      const gatewayWs = new WebSocket('ws://127.0.0.1:18789/', {
        headers: {
          ...Object.fromEntries(
            Object.entries(req.headers).filter(([k]) => !['host','origin'].includes(k))
          ),
          origin: 'http://localhost:4000',
        }
      });

      gatewayWs.on('open',  ()  => console.log('[ws-proxy] ✓ Connected to OpenClaw'));
      gatewayWs.on('error', (e) => { console.error('[ws-proxy] ✗ OpenClaw error:', e.message); clientWs.close(); });
      gatewayWs.on('close', (c) => { console.log('[ws-proxy] OpenClaw closed', c); if (clientWs.readyState === WebSocket.OPEN) clientWs.close(); });

      clientWs.on('error', (e) => { console.error('[ws-proxy] Client error:', e.message); gatewayWs.close(); });
      clientWs.on('close', (c) => { console.log('[ws-proxy] Client closed', c); if (gatewayWs.readyState === WebSocket.OPEN) gatewayWs.close(); });

      clientWs.on('message',  (d, b) => { if (gatewayWs.readyState === WebSocket.OPEN)  gatewayWs.send(d, { binary: b }); });
      gatewayWs.on('message', (d, b) => { if (clientWs.readyState  === WebSocket.OPEN)  clientWs.send(d,  { binary: b }); });
    });
  });
}

// ── Image Upload — save base64 image to OpenClaw workspace so AI can Read it ──
const WSL_WORKSPACE_BASE = '\\\\wsl.localhost\\Ubuntu\\home\\acerv2\\.openclaw';

app.post('/api/upload-image', (req, res) => {
  const { base64, filename, stageId } = req.body;
  if (!base64 || !stageId) return res.status(400).json({ error: 'Missing base64 or stageId' });

  // Strip data URI prefix  e.g. "data:image/png;base64,"
  const data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const buf  = Buffer.from(data, 'base64');

  const workspaceDir = path.join(WSL_WORKSPACE_BASE, `workspace-stage${stageId}`);
  const safeFilename = `img_${Date.now()}_${(filename || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fullPath = path.join(workspaceDir, safeFilename);
  // Linux path the AI agent will use
  const agentPath = `/home/acerv2/.openclaw/workspace-stage${stageId}/${safeFilename}`;

  try {
    if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(fullPath, buf);
    console.log(`[upload] saved → ${fullPath}`);
    res.json({ ok: true, path: agentPath });
  } catch (e) {
    console.error('[upload] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Serve built React app ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
const server = createServer(app);
attachNativeWsProxy(server);
server.listen(PORT, () => console.log(`[SCAM SURVIVOR] Server on port ${PORT} — WS proxy: /openclaw-ws → ws://127.0.0.1:18789`));
