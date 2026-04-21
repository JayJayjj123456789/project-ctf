import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // large enough for base64 images

// ── Generic File Upload → WSL path for OpenClaw tools ──────────────────
const WSL_UPLOAD_WIN   = '\\\\wsl.localhost\\Ubuntu\\home\\acerv2\\.openclaw\\uploads';
const WSL_UPLOAD_LINUX = '/home/acerv2/.openclaw/uploads';

function handleUpload(req, res) {
  try {
    const { base64, filename } = req.body;
    if (!base64 || !filename) return res.status(400).json({ error: 'Missing base64 or filename' });

    const safeFilename = `file_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`.slice(0, 80);
    const winPath = `${WSL_UPLOAD_WIN}\\${safeFilename}`;
    const wslPath  = `${WSL_UPLOAD_LINUX}/${safeFilename}`;

    // Strip any data URL prefix (image/*, application/pdf, text/plain, etc.)
    const b64data = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer  = Buffer.from(b64data, 'base64');

    try { if (!existsSync(WSL_UPLOAD_WIN)) mkdirSync(WSL_UPLOAD_WIN, { recursive: true }); } catch (_) {}

    writeFileSync(winPath, buffer);
    console.log(`[upload] ✓ ${safeFilename} (${buffer.length} bytes) → ${wslPath}`);
    res.json({ ok: true, wslPath, filename: safeFilename });
  } catch (e) {
    console.error('[upload] ✕', e.message);
    res.status(500).json({ error: e.message });
  }
}

app.post('/api/upload-image', handleUpload); // legacy
app.post('/api/upload-file',  handleUpload); // generic


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

// ── Generate bank slip server-side (AI says [SLIP_IMAGE], server does the work) ──
app.post('/api/generate-slip', (req, res) => {
  const { stageId } = req.body;
  if (!stageId || stageId < 1 || stageId > 5)
    return res.status(400).json({ error: 'Invalid stageId' });
  try {
    const wsDir = `/home/acerv2/.openclaw/workspace-stage${stageId}/workspace-stage${stageId}`;
    const output = execFileSync(
      'wsl',
      ['bash', '-c', `cd "${wsDir}" && python3 generate_slip.py`],
      { encoding: 'utf-8', timeout: 20000 }
    );
    const match = output.match(/SLIP_URL:(\S+\.png)/);
    if (!match) return res.status(500).json({ error: 'No SLIP_URL in output', raw: output });
    const slipUrl = match[1].trim();
    console.log(`[generate-slip] stage=${stageId} → ${slipUrl}`);
    res.json({ ok: true, slipUrl });
  } catch (e) {
    console.error('[generate-slip] ✕', e.message);
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
