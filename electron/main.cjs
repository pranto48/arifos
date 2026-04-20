const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const isDev = !app.isPackaged;
const DEFAULT_SERVER_URL = 'https://my.arifmahmud.com';

const CONFIG_FILE = 'desktop-config.json';

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function readConfig() {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Failed to read desktop config:', error);
    return {};
  }
}

function writeConfig(data) {
  try {
    const configPath = getConfigPath();
    const current = readConfig();
    const merged = { ...current, ...data };
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (error) {
    console.error('Failed to write desktop config:', error);
    throw error;
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1100,
    minHeight: 680,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function openServerSetupWindow(defaultValue) {
  return new Promise((resolve) => {
    const setupWindow = new BrowserWindow({
      width: 520,
      height: 320,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: 'LifeOS Server Setup',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>LifeOS Server Setup</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; background: #f9fafb; }
            h2 { margin: 0 0 8px; }
            p { margin: 0 0 12px; color: #4b5563; font-size: 14px; }
            input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
            .row { display: flex; gap: 8px; margin-top: 14px; }
            button { border: none; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-size: 14px; }
            .primary { background: #111827; color: #fff; }
            .secondary { background: #e5e7eb; color: #111827; }
            .error { color: #b91c1c; margin-top: 10px; min-height: 16px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h2>LifeOS Desktop Setup</h2>
          <p>Enter your LifeOS server URL for sync (example: ${DEFAULT_SERVER_URL}).</p>
          <input id="serverUrl" type="text" value="${defaultValue}" />
          <div class="row">
            <button class="secondary" id="useDefault">Use Default</button>
            <button class="primary" id="saveBtn">Save & Continue</button>
          </div>
          <div class="error" id="error"></div>
          <script>
            const input = document.getElementById('serverUrl');
            const error = document.getElementById('error');
            document.getElementById('useDefault').addEventListener('click', () => {
              input.value = '${DEFAULT_SERVER_URL}';
            });
            document.getElementById('saveBtn').addEventListener('click', async () => {
              try {
                error.textContent = '';
                await window.lifeosDesktop.setServerUrl(input.value);
                window.lifeosDesktop.completeSetup();
              } catch (err) {
                error.textContent = err && err.message ? err.message : 'Invalid server URL';
              }
            });
          </script>
        </body>
      </html>`;

    setupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    let resolved = false;
    const cleanup = () => {
      ipcMain.removeListener('desktop:completeSetup', completeHandler);
    };

    const completeHandler = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      if (!setupWindow.isDestroyed()) {
        setupWindow.close();
      }
      resolve(true);
    };

    ipcMain.on('desktop:completeSetup', completeHandler);

    setupWindow.on('closed', () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(false);
    });
  });
}

async function ensureServerConfiguration() {
  const existing = readConfig().serverUrl;
  if (existing) return existing;

  writeConfig({ serverUrl: DEFAULT_SERVER_URL });
  const completed = await openServerSetupWindow(DEFAULT_SERVER_URL);
  if (!completed) {
    return DEFAULT_SERVER_URL;
  }
  return readConfig().serverUrl || DEFAULT_SERVER_URL;
}

ipcMain.handle('desktop:getServerUrl', () => {
  const config = readConfig();
  return config.serverUrl || '';
});

ipcMain.handle('desktop:setServerUrl', (_event, serverUrl) => {
  if (typeof serverUrl !== 'string') {
    throw new Error('Server URL must be a string');
  }

  const normalized = serverUrl.trim().replace(/\/+$/, '');
  if (!normalized) {
    throw new Error('Server URL is required');
  }

  writeConfig({ serverUrl: normalized });
  return normalized;
});

ipcMain.handle('desktop:getConfig', () => {
  return readConfig();
});

app.whenReady().then(async () => {
  await ensureServerConfiguration();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
