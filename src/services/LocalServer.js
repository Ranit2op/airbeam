import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

let TcpSocket = null;
if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    TcpSocket = require('react-native-tcp-socket').default || require('react-native-tcp-socket');
  } catch (e) {
    console.warn('TcpSocket not loaded natively:', e);
  }
}

export class LocalServer {
  constructor() {
    this.server = null;
    this.port = 8090;
    this.file = null;
    this.connectedClients = 0;
    this.onClientConnected = null;
    this.isElectron = typeof window !== 'undefined' && (window.require || (window.process && window.process.type));
  }

  setFile(file) {
    this.file = file;
  }

  generateHtmlPage(file) {
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AirBeam - Fast & Lossless Sharing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background: radial-gradient(circle at top, #162238 0%, #0B0F19 100%);
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(22, 34, 56, 0.85);
      border: 1px solid rgba(0, 210, 255, 0.3);
      backdrop-filter: blur(16px);
      border-radius: 28px;
      padding: 36px 28px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 210, 255, 0.15);
    }
    .badge-icon {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #00D2FF 0%, #0066FF 100%);
      border-radius: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px rgba(0, 210, 255, 0.4);
      font-size: 32px;
    }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
    .subtitle { color: #8E9BAE; font-size: 14px; margin-bottom: 24px; }
    .file-box {
      background: rgba(11, 15, 25, 0.7);
      border: 1px solid #1F2E49;
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 24px;
      text-align: left;
    }
    .file-name { font-weight: 700; font-size: 16px; word-break: break-all; margin-bottom: 6px; }
    .file-meta { display: flex; justify-content: space-between; color: #8E9BAE; font-size: 13px; font-weight: 500; }
    .tag {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      padding: 3px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .btn {
      display: block;
      width: 100%;
      background: linear-gradient(90deg, #00D2FF 0%, #0066FF 100%);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 16px;
      padding: 16px;
      border-radius: 18px;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 210, 255, 0.35);
      transition: all 0.2s ease;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(0, 210, 255, 0.5); }
    .footer { margin-top: 24px; font-size: 12px; color: #58657B; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-icon">💧</div>
    <h1>AirBeam</h1>
    <p class="subtitle">Lossless Local Wi-Fi Transfer</p>
    
    <div class="file-box">
      <div class="file-name">${file.name}</div>
      <div class="file-meta">
        <span>${sizeFormatted}</span>
        <span class="tag">Original Quality</span>
      </div>
    </div>

    <a href="/download" class="btn" download="${file.name}">Download File ⚡</a>
    <p class="footer">Transferred directly over local network. No internet data used.</p>
  </div>
</body>
</html>`;
  }

  async start(port = 8090) {
    this.port = port;

    // 1. Electron Desktop
    if (this.isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        const res = await ipcRenderer.invoke('start-share-server', {
          name: this.file.name,
          size: this.file.size,
          path: this.file.path,
        });

        ipcRenderer.on('client-connected', (event, count) => {
          this.connectedClients = count;
          if (this.onClientConnected) this.onClientConnected(count);
        });

        return res.port || port;
      } catch (err) {
        console.error('Electron IPC start-share-server error:', err);
      }
    }

    // 2. Mobile (Android / iOS with react-native-tcp-socket)
    if (TcpSocket) {
      return new Promise((resolve, reject) => {
        try {
          this.server = TcpSocket.createServer(socket => {
            socket.on('error', err => {
              console.warn('Socket connection error caught:', err?.message || err);
            });

            socket.on('data', async data => {
              try {
                const reqStr = data ? data.toString('utf8') : '';
                const firstLine = reqStr.split('\r\n')[0] || '';
                const parts = firstLine.split(' ');
                const method = (parts[0] || 'GET').toUpperCase();
                const rawUrl = parts[1] || '/';
                const urlPath = rawUrl.split('?')[0];

                if (!this.file) {
                  socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
                  socket.end();
                  return;
                }

                if (method === 'OPTIONS') {
                  socket.write('HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nContent-Length: 0\r\n\r\n');
                  socket.end();
                  return;
                }

                if (urlPath === '/favicon.ico') {
                  socket.write('HTTP/1.1 204 No Content\r\nContent-Length: 0\r\n\r\n');
                  socket.end();
                  return;
                }

                if (urlPath === '/' || urlPath === '/index.html') {
                  const html = this.generateHtmlPage(this.file);
                  const htmlBuf = Buffer.from(html, 'utf8');
                  const header = `HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: ${htmlBuf.length}\r\nConnection: close\r\n\r\n`;
                  socket.write(header);
                  if (method !== 'HEAD') {
                    socket.write(htmlBuf);
                  }
                  socket.end();
                  return;
                }

                if (urlPath === '/info') {
                  const infoJson = JSON.stringify({
                    name: this.file.name,
                    size: this.file.size,
                    type: this.file.type,
                  });
                  const infoBuf = Buffer.from(infoJson, 'utf8');
                  const header = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: ${infoBuf.length}\r\nConnection: close\r\n\r\n`;
                  socket.write(header);
                  if (method !== 'HEAD') {
                    socket.write(infoBuf);
                  }
                  socket.end();
                  return;
                }

                if (urlPath === '/download' || urlPath === '/file') {
                  this.connectedClients++;
                  if (this.onClientConnected) this.onClientConnected(this.connectedClients);

                  const header = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="${encodeURIComponent(this.file.name)}"\r\nContent-Length: ${this.file.size}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n`;
                  socket.write(header);

                  if (method === 'HEAD') {
                    socket.end();
                    return;
                  }

                  // Stream file in 64 KB chunks to prevent any memory spikes
                  if (this.file.uri) {
                    const CHUNK_SIZE = 64 * 1024;
                    let position = 0;
                    const fileSize = this.file.size;

                    const sendNextChunk = async () => {
                      if (position >= fileSize || !this.server) {
                        socket.end();
                        return;
                      }
                      const toRead = Math.min(CHUNK_SIZE, fileSize - position);
                      try {
                        const base64Data = await FileSystem.readAsStringAsync(this.file.uri, {
                          encoding: FileSystem.EncodingType.Base64,
                          position,
                          length: toRead,
                        });
                        const chunk = Buffer.from(base64Data, 'base64');
                        position += toRead;
                        socket.write(chunk);
                        setTimeout(sendNextChunk, 1);
                      } catch (readErr) {
                        console.warn('File chunk read error:', readErr);
                        socket.end();
                      }
                    };
                    sendNextChunk();
                  } else if (this.file.data) {
                    socket.write(this.file.data);
                    socket.end();
                  } else {
                    socket.end();
                  }
                  return;
                }

                // Default 404 for unknown paths
                socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
                socket.end();
              } catch (reqErr) {
                console.warn('Request handling error:', reqErr);
                try { socket.end(); } catch (e) {}
              }
            });
          });

          this.server.on('error', err => {
            console.warn('Server error:', err);
          });

          this.server.listen({ port, host: '0.0.0.0' }, () => {
            resolve(port);
          });
        } catch (e) {
          console.error('TcpSocket createServer failed:', e);
          reject(e);
        }
      });
    }

    return port;
  }

  stop() {
    if (this.isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('stop-share-server');
      } catch (e) {}
    }

    if (this.server) {
      try {
        if (typeof this.server.close === 'function') {
          this.server.close();
        }
      } catch (e) {}
      this.server = null;
    }
    this.connectedClients = 0;
  }
}
