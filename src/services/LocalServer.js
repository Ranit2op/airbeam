import { Platform } from 'react-native';

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
    this.onProgress = null;
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
  <title>RanDrop - Fast & Lossless Sharing</title>
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
    <h1>RanDrop</h1>
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

    // Desktop (Node.js / Electron)
    if (typeof window !== 'undefined' && window.require) {
      try {
        const http = window.require('http');
        const fs = window.require('fs');

        this.server = http.createServer((req, res) => {
          if (!this.file) {
            res.writeHead(404);
            res.end('No file selected');
            return;
          }

          if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this.generateHtmlPage(this.file));
            return;
          }

          if (req.url === '/info') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({
              name: this.file.name,
              size: this.file.size,
              type: this.file.type,
            }));
            return;
          }

          if (req.url === '/download' || req.url === '/file') {
            this.connectedClients++;
            if (this.onClientConnected) this.onClientConnected(this.connectedClients);

            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(this.file.name)}"`,
              'Content-Length': this.file.size,
              'Access-Control-Allow-Origin': '*',
            });

            if (this.file.path && fs.existsSync(this.file.path)) {
              const stream = fs.createReadStream(this.file.path);
              stream.pipe(res);
            } else if (this.file.data) {
              res.end(this.file.data);
            } else {
              res.end('File buffer not found');
            }
          }
        });

        return new Promise((resolve) => {
          this.server.listen(port, '0.0.0.0', () => {
            resolve(port);
          });
        });
      } catch (err) {
        console.error('Failed to start Node http server:', err);
      }
    }

    // Mobile (React Native with react-native-tcp-socket)
    if (TcpSocket) {
      return new Promise((resolve, reject) => {
        try {
          this.server = TcpSocket.createServer(socket => {
            socket.on('data', data => {
              const reqStr = data.toString('utf8');
              const firstLine = reqStr.split('\r\n')[0] || '';
              const [method, url] = firstLine.split(' ');

              if (!this.file) {
                socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
                socket.end();
                return;
              }

              if (url === '/' || url === '/index.html') {
                const html = this.generateHtmlPage(this.file);
                const header = `HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(html)}\r\nConnection: close\r\n\r\n`;
                socket.write(header + html);
                socket.end();
                return;
              }

              if (url === '/info') {
                const info = JSON.stringify({
                  name: this.file.name,
                  size: this.file.size,
                  type: this.file.type,
                });
                const header = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: ${Buffer.byteLength(info)}\r\nConnection: close\r\n\r\n`;
                socket.write(header + info);
                socket.end();
                return;
              }

              if (url === '/download' || url === '/file') {
                this.connectedClients++;
                if (this.onClientConnected) this.onClientConnected(this.connectedClients);

                const header = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="${encodeURIComponent(this.file.name)}"\r\nContent-Length: ${this.file.size}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n`;
                socket.write(header);

                // Send file content (if buffer available)
                if (this.file.data) {
                  socket.write(this.file.data);
                  socket.end();
                } else {
                  socket.end();
                }
              }
            });
          });

          this.server.listen({ port, host: '0.0.0.0' }, () => {
            resolve(port);
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    return port;
  }

  stop() {
    if (this.server) {
      if (typeof this.server.close === 'function') {
        this.server.close();
      }
      this.server = null;
    }
    this.connectedClients = 0;
  }
}
