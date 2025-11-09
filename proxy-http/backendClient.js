// backendClient.js (CommonJS)
const net = require('node:net');

function sendToJava({ host, port, payload, timeoutMs = 8000 }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('TCP timeout'));
    }, timeoutMs);

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const idx = buffer.indexOf('\n');
      if (idx >= 0) {
        const line = buffer.slice(0, idx);
        socket.end();
        try {
          const json = JSON.parse(line || '{}');
          clearTimeout(timer);
          resolve(json);
        } catch (e) {
          clearTimeout(timer);
          reject(new Error('Respuesta no JSON del backend: ' + line));
        }
      }
    });

    socket.connect(port, host, () => {
      const msg = JSON.stringify(payload) + '\n';
      socket.write(Buffer.from(msg, 'utf8'));
    });
  });
}

module.exports = { sendToJava };
