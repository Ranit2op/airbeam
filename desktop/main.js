const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

let mainWindow;
let uiServerPort = 0;
let shareServer = null;
let currentSharedFile = null;
let connectedClientsCount = 0;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function generateWebDownloadPage(file) {
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
  <script>
    setTimeout(function() {
      try {
        var a = document.createElement('a');
        a.href = '/download';
        a.download = "${file.name}";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {}
    }, 600);
  </script>
</body>
</html>`;
}

// 1. UI server for rendering React Native Web dist
function startUiServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let safePath = path.normalize(decodeURIComponent(req.url)).replace(/^(\.\.[\/\\])+/, '');
      safePath = safePath.split('?')[0];

      if (safePath === '/' || safePath === '') safePath = '/index.html';

      let filePath = path.join(__dirname, '../dist', safePath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, '../dist/index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve(port);
    });

    server.on('error', reject);
  });
}

// IPC Handlers for File Sharing and Dialogs
ipcMain.handle('get-local-ip', () => {
  return getLocalIpAddress();
});

ipcMain.handle('select-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select File to Send (AirBeam)',
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    return {
      canceled: false,
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
    };
  } catch (err) {
    console.error('Error selecting file:', err);
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('start-share-server', async (event, file) => {
  if (shareServer) {
    try { shareServer.close(); } catch (e) {}
    shareServer = null;
  }

  currentSharedFile = file;
  connectedClientsCount = 0;

  return new Promise((resolve, reject) => {
    shareServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const urlPath = req.url.split('?')[0];

      if (urlPath === '/' || urlPath === '/index.html') {
        const html = generateWebDownloadPage(currentSharedFile);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (urlPath === '/info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          name: currentSharedFile.name,
          size: currentSharedFile.size,
        }));
        return;
      }

      if (urlPath === '/download' || urlPath === '/file') {
        connectedClientsCount++;
        if (mainWindow) {
          mainWindow.webContents.send('client-connected', connectedClientsCount);
        }

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(currentSharedFile.name)}"`,
          'Content-Length': currentSharedFile.size,
        });

        const stream = fs.createReadStream(currentSharedFile.path);
        stream.pipe(res);
        stream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    shareServer.listen(8090, '0.0.0.0', () => {
      resolve({ port: 8090, ip: getLocalIpAddress() });
    });

    shareServer.on('error', (err) => {
      console.warn('Port 8090 error, trying alternative:', err.message);
      if (err.code === 'EADDRINUSE') {
        shareServer.listen(0, '0.0.0.0', () => {
          const p = shareServer.address().port;
          resolve({ port: p, ip: getLocalIpAddress() });
        });
      } else {
        reject(err);
      }
    });
  });
});

ipcMain.handle('stop-share-server', () => {
  if (shareServer) {
    try { shareServer.close(); } catch (e) {}
    shareServer = null;
  }
  currentSharedFile = null;
  connectedClientsCount = 0;
  return true;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 780,
    title: 'AirBeam - Lossless Local Wi-Fi File Sharing',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0B0F19',
  });

  const isDev = process.env.NODE_ENV === 'development';
  const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:8083';

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${uiServerPort}`);
  }
}

app.whenReady().then(async () => {
  if (process.env.NODE_ENV !== 'development') {
    uiServerPort = await startUiServer();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
