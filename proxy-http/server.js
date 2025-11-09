const express = require('express');
const cors = require('cors');
const path = require('node:path');
require('dotenv').config();
const { sendToJava } = require('./backendClient');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const JAVA_HOST = process.env.JAVA_HOST || '127.0.0.1';
const JAVA_PORT = Number(process.env.JAVA_PORT || 9090);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 8000);

// 1) Sirve el cliente estático (¡antes de cualquier app.get('/')!)
const publicDir = path.join(__dirname, 'web');
app.use('/', express.static(publicDir));

// 2) Healthcheck en otra ruta
app.get('/health', (_, res) => res.send('Proxy HTTP activo 🟢'));

// ---- API ----
app.post('/api/groups', async (req, res) => {
  try {
    const { name, members } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name requerido' });
    const payload = { action: 'createGroup', name, members: members || [] };
    const resp = await sendToJava({ host: JAVA_HOST, port: JAVA_PORT, payload, timeoutMs: REQUEST_TIMEOUT_MS });
    res.json(resp);
  } catch (e) { res.status(502).json({ error: 'java_unavailable', message: String(e.message || e) }); }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { toType, to, from, contentType, text, audioUrl } = req.body || {};
    if (!toType || !to || !from) return res.status(400).json({ error: 'toType, to, from requeridos' });
    if (!['text','audio'].includes(contentType)) return res.status(400).json({ error: 'contentType debe ser text|audio' });
    if (contentType === 'text' && !text) return res.status(400).json({ error: 'text requerido' });
    if (contentType === 'audio' && !audioUrl) return res.status(400).json({ error: 'audioUrl requerido' });

    const payload = {
      action: 'sendMessage', toType, to, from,
      content: { type: contentType, text: text || null, audioUrl: audioUrl || null },
      createdAt: Date.now()
    };
    const resp = await sendToJava({ host: JAVA_HOST, port: JAVA_PORT, payload, timeoutMs: REQUEST_TIMEOUT_MS });
    res.json(resp);
  } catch (e) { res.status(502).json({ error: 'java_unavailable', message: String(e.message || e) }); }
});

app.get('/api/history', async (req, res) => {
  try {
    const { scope, id } = req.query;
    if (!scope || !id) return res.status(400).json({ error: 'scope (user|group) e id requeridos' });
    const payload = { action: 'getHistory', scope, id };
    const resp = await sendToJava({ host: JAVA_HOST, port: JAVA_PORT, payload, timeoutMs: REQUEST_TIMEOUT_MS });
    res.json(resp);
  } catch (e) { res.status(502).json({ error: 'java_unavailable', message: String(e.message || e) }); }
});

app.listen(PORT, () => {
  console.log(`Proxy escuchando en http://localhost:${PORT}`);
  console.log(`Proxy → Java TCP ${JAVA_HOST}:${JAVA_PORT}`);
});
