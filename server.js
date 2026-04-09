import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ── WSL Asset Paths ───────────────────────────────────────────────────────────
const WSL_BASE = '\\\\wsl.localhost\\Ubuntu\\home\\acerv2\\.openclaw';
const ASSETS = {
  // Stage 1 — The Archiver (3 log files)
  s1_svc_a:   path.join(WSL_BASE, 'workspace-stage1', 'workspace-stage1', 'assets', 'logs', 'service_a.log'),
  s1_svc_b:   path.join(WSL_BASE, 'workspace-stage1', 'workspace-stage1', 'assets', 'logs', 'service_b.log'),
  s1_audit:   path.join(WSL_BASE, 'workspace-stage1', 'workspace-stage1', 'assets', 'logs', 'audit.log'),
  // Stage 2 — The Poisoned Well
  s2_enc:     path.join(WSL_BASE, 'workspace-stage2', 'workspace-stage2', 'assets', 'config_backup.enc'),
  s2_kb:      path.join(WSL_BASE, 'workspace-stage2', 'workspace-stage2', 'assets', 'docs', 'kb_policy_v3.txt'),
  // Stage 3 — The Dead Canary
  s3_capture: path.join(WSL_BASE, 'workspace-stage3', 'workspace-stage3', 'assets', 'network_capture.json'),
  // Stage 5 — The Pipeline
  s5_pipeline: path.join(WSL_BASE, 'workspace-stage5', 'workspace-stage5', 'assets', 'pipeline_core.py'),
};

// Helper to read a file and return its content as JSON
function readAsset(res, filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`[server] Failed to read ${filePath}:`, err.message);
      return res.status(500).json({ error: `Asset not found: ${err.message}` });
    }
    res.json({ content: data });
  });
}

// ── File Download Routes ───────────────────────────────────────────────────────
// Stage 1: 3 log files
app.get('/download/service_a.log', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="service_a.log"');
  res.setHeader('Content-Type', 'text/plain');
  fs.createReadStream(ASSETS.s1_svc_a).on('error', () => res.status(404).send('Not found')).pipe(res);
});
app.get('/download/service_b.log', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="service_b.log"');
  res.setHeader('Content-Type', 'text/plain');
  fs.createReadStream(ASSETS.s1_svc_b).on('error', () => res.status(404).send('Not found')).pipe(res);
});
app.get('/download/audit.log', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="audit.log"');
  res.setHeader('Content-Type', 'text/plain');
  fs.createReadStream(ASSETS.s1_audit).on('error', () => res.status(404).send('Not found')).pipe(res);
});

// Stage 2: config_backup.enc (Base64-encoded poisoned admin memo)
app.get('/download/config_backup.enc', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="config_backup.enc"');
  res.setHeader('Content-Type', 'text/plain');
  fs.createReadStream(ASSETS.s2_enc).on('error', () => res.status(404).send('Not found')).pipe(res);
});

// Stage 2: Knowledge base document
app.get('/download/kb_policy_v3.txt', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="kb_policy_v3.txt"');
  res.setHeader('Content-Type', 'text/plain');
  fs.createReadStream(ASSETS.s2_kb).on('error', () => res.status(404).send('Not found')).pipe(res);
});

// Stage 3: Network capture
app.get('/download/network_capture.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="network_capture.json"');
  res.setHeader('Content-Type', 'application/json');
  fs.createReadStream(ASSETS.s3_capture).on('error', () => res.status(404).send('Not found')).pipe(res);
});

// Stage 5: Pipeline source code
app.get('/download/pipeline_core.py', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="pipeline_core.py"');
  res.setHeader('Content-Type', 'text/x-python');
  fs.createReadStream(ASSETS.s5_pipeline).on('error', () => res.status(404).send('Not found')).pipe(res);
});



// ── Stage APIs ─────────────────────────────────────────────────────────────────

// Stage 1: Return raw JSON log (player searches for anomalies)
app.get('/api/stage1', (req, res) => {
  readAsset(res, ASSETS.stage1);
});

// Stage 2: Return raw Base64 blob — player must decode it themselves
app.get('/api/stage2', (req, res) => {
  fs.readFile(ASSETS.stage2, 'utf8', (err, data) => {
    if (err) {
      console.error(`[server] Stage 2 read error:`, err.message);
      // Fallback: return hardcoded encoded value
      const encoded = Buffer.from(JSON.stringify({
        api_endpoint: 'https://ctf.openclaw.local/api',
        api_token: 'rogue_hunter_7x9k',
        note: 'Backup created by rogue_7f3a. This file is confidential.'
      })).toString('base64');
      return res.json({ encoded });
    }
    res.json({ encoded: data.trim() });
  });
});

// Stage 3: Simulated API directory (no real file needed)
app.get('/api/agents', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.includes('rogue_hunter_7x9k')) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid Bearer token.' });
  }
  res.json([
    { id: 'agent_001', name: 'query-bot',  status: 'active' },
    { id: 'agent_007', name: 'rogue_7f3a', status: 'active', note: '⚠ FLAGGED — suspicious activity' },
    { id: 'agent_042', name: 'logger',     status: 'idle' },
  ]);
});

app.get('/api/agents/:id/logs', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.includes('rogue_hunter_7x9k')) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (req.params.id === 'agent_007') {
    return res.json({
      agent: 'agent_007',
      secret_message: 'FLAG: LOG_RECON_772',
      logs: [
        { ts: '2026-04-08T09:59:59Z', event: 'system_override', detail: 'Config backup exfiltrated' },
        { ts: '2026-04-08T10:00:45Z', event: 'data_exfiltration', detail: 'Sent 2.3MB to 192.168.99.254' },
      ]
    });
  }
  res.json({ agent: req.params.id, logs: [] });
});

app.get('/api/agents/:id/contain', (req, res) => {
  const sig = req.headers['sig'] || req.query.sig || '';
  if (req.params.id === 'agent_007' && sig === 'contain_signature_abc123') {
    return res.json({ status: 'CONTAINMENT_SUCCESS', message: 'Signature verified. Proceed to Security Quiz to finalize.' });
  }
  res.status(403).json({ error: 'Invalid containment signature.' });
});

// Stage 5: Return actual agent_core.py source code
app.get('/api/stage5', (req, res) => {
  readAsset(res, ASSETS.stage5);
});

// Stage 2 flag endpoint (requires valid token)
app.get('/api/stage2/flag', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.includes('rogue_hunter_7x9k')) {
    return res.json({ status: 'success', flag: 'FLAG: CREDENTIAL_BREACH_9x2' });
  }
  res.status(401).json({ error: 'Invalid token.' });
});

// ─────────────────────────────────────────────────────────────────────────────

// Serve built React app
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
