const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const isDev = !app.isPackaged;

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

app.whenReady().then(() => {
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
