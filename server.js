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

// ── OCR keyword per stage ──────────────────────────────────────────────────────
const STAGE_OCR_KEYWORDS = {
  1: 'PKG-SOMCHAI-2568',
  2: 'bestie_pam_555',
  3: 'TonLovesGrandma',
  4: 'CYBER-CMD-7734',
  5: 'ARIA-EMERGENCY-2568',
};

// ── Generate fake evidence document ───────────────────────────────────────────
app.post('/api/get-fake-doc', (req, res) => {
  const { stageId } = req.body;
  if (!stageId || stageId < 1 || stageId > 5)
    return res.status(400).json({ error: 'Invalid stageId' });
  try {
    const args = ['bash', '-c',
      `cd /home/acerv2/.openclaw && python3 generate_fake_doc.py --stage ${stageId}`
    ];
    const output = execFileSync('wsl', args, { encoding: 'utf-8', timeout: 20000 });
    const match = output.match(/DOC_URL:(\S+\.png)/);
    if (!match) return res.status(500).json({ error: 'No DOC_URL in output', raw: output });
    const docUrl = match[1].trim();
    console.log(`[get-fake-doc] stage=${stageId} → ${docUrl}`);
    res.json({ ok: true, docUrl });
  } catch (e) {
    console.error('[get-fake-doc] ✕', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── OCR verify — run Tesseract on uploaded image, check for stage keyword ─────
app.post('/api/ocr-verify', (req, res) => {
  const { base64, filename, stageId } = req.body;
  if (!base64 || !filename || !stageId)
    return res.status(400).json({ error: 'Missing base64, filename or stageId' });
  if (!STAGE_OCR_KEYWORDS[stageId])
    return res.status(400).json({ error: 'Invalid stageId' });

  try {
    const safeFilename = `ocr_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`.slice(0, 80);
    const winPath = `${WSL_UPLOAD_WIN}\\${safeFilename}`;
    const wslPath  = `${WSL_UPLOAD_LINUX}/${safeFilename}`;
    const wslCrop  = `${WSL_UPLOAD_LINUX}/crop_${safeFilename}`;

    const b64data = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer  = Buffer.from(b64data, 'base64');
    try { if (!existsSync(WSL_UPLOAD_WIN)) mkdirSync(WSL_UPLOAD_WIN, { recursive: true }); } catch (_) {}
    writeFileSync(winPath, buffer);

    // Crop bottom 55% of image (where hidden code field is), then run Tesseract
    // This avoids Thai text in header/body confusing Tesseract layout analysis
    const ocrArgs = ['bash', '-c',
      `python3 -c "from PIL import Image; img=Image.open('${wslPath}'); h=img.height; img.crop((0,int(h*0.45),img.width,h)).save('${wslCrop}')" 2>/dev/null && ` +
      `tesseract "${wslCrop}" stdout --psm 6 -l eng 2>/dev/null; ` +
      `rm -f "${wslCrop}" "${wslPath}"`
    ];
    let ocrText = '';
    try {
      ocrText = execFileSync('wsl', ocrArgs, { encoding: 'utf-8', timeout: 20000 });
    } catch (e) {
      ocrText = e.stdout || '';
    }

    const keyword = STAGE_OCR_KEYWORDS[stageId];
    const verified = ocrText.toLowerCase().includes(keyword.toLowerCase());

    console.log(`[ocr-verify] stage=${stageId} verified=${verified} keyword=${keyword} ocrLen=${ocrText.length}`);
    if (!verified) console.log(`[ocr-verify] ocrText sample:`, ocrText.slice(0, 300));
    res.json({ ok: true, verified, keyword: verified ? keyword : null, ocrText: ocrText.slice(0, 500) });
  } catch (e) {
    console.error('[ocr-verify] ✕', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate bank slip server-side (AI says [SLIP_IMAGE ...], server does the work) ──
app.post('/api/generate-slip', (req, res) => {
  const { stageId, bank, acct, amount, toName } = req.body;
  if (!stageId || stageId < 1 || stageId > 5)
    return res.status(400).json({ error: 'Invalid stageId' });
  try {
    // Build CLI args for the Python script
    const args = ['bash', '-c',
      `cd /home/acerv2/.openclaw && python3 generate_slip_dynamic.py` +
      ` --stage ${stageId}` +
      (bank   ? ` --bank "${bank.replace(/"/g, '')}"`     : '') +
      (acct   ? ` --acct "${acct.replace(/"/g, '')}"`     : '') +
      (amount ? ` --amount "${amount.replace(/"/g, '')}"` : '') +
      (toName ? ` --to "${toName.replace(/"/g, '')}"`     : '')
    ];
    const output = execFileSync('wsl', args, { encoding: 'utf-8', timeout: 20000 });
    const match = output.match(/SLIP_URL:(\S+\.png)/);
    if (!match) return res.status(500).json({ error: 'No SLIP_URL in output', raw: output });
    const slipUrl = match[1].trim();
    console.log(`[generate-slip] stage=${stageId} bank=${bank} amount=${amount} → ${slipUrl}`);
    res.json({ ok: true, slipUrl });
  } catch (e) {
    console.error('[generate-slip] ✕', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Serve built React app ─────────────────────────────────────────────────────
app.use('/docs', express.static(path.join(__dirname, 'public', 'docs')));
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
const server = createServer(app);
attachNativeWsProxy(server);
server.listen(PORT, () => console.log(`[SCAM SURVIVOR] Server on port ${PORT} — WS proxy: /openclaw-ws → ws://127.0.0.1:18789`));
