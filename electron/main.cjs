const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const SERVER_ENTRY = path.join(SERVER_DIR, 'index.js');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const PORT = process.env.PORT || 4000;
const APP_URL = `http://localhost:${PORT}`;

let serverProcess = null;
let mainWindow = null;
let quitting = false;
let restarting = false;

function startServer() {
  if (serverProcess) return;
  // Spawns Electron's own bundled binary as a plain Node process (via
  // ELECTRON_RUN_AS_NODE) instead of relying on a system Node install - the
  // server's native module (better-sqlite3) is rebuilt against Electron's
  // Node ABI to match, so this works on a machine with no Node.js at all.
  serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  serverProcess.on('exit', (code) => {
    serverProcess = null;
    if (!quitting && !restarting) {
      console.error(`HighVolt server exited unexpectedly (code ${code})`);
    }
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) return resolve();
    serverProcess.once('exit', () => resolve());
    serverProcess.kill();
  });
}

async function restartServer() {
  restarting = true;
  await stopServer();
  restarting = false;
  startServer();
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function attempt() {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'));
        setTimeout(attempt, 250);
      });
    })();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'HighVolt AI',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Watches for updates pushed from the terminal: rebuilding the client
// (client/dist) reloads the window, editing server source restarts the
// server process, both without needing to relaunch the app.
function watchForUpdates() {
  let clientTimer;
  if (fs.existsSync(CLIENT_DIST)) {
    fs.watch(CLIENT_DIST, { recursive: true }, () => {
      clearTimeout(clientTimer);
      clientTimer = setTimeout(() => {
        if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
      }, 300);
    });
  }

  let serverTimer;
  ['index.js', 'routes', 'middleware', 'lib'].forEach((rel) => {
    const target = path.join(SERVER_DIR, rel);
    if (!fs.existsSync(target)) return;
    fs.watch(target, { recursive: true }, () => {
      clearTimeout(serverTimer);
      serverTimer = setTimeout(async () => {
        try {
          await restartServer();
          await waitForServer(APP_URL);
          if (mainWindow) mainWindow.loadURL(APP_URL);
        } catch (err) {
          console.error('Failed to restart server after update:', err.message);
        }
      }, 300);
    });
  });
}

app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer(APP_URL);
  } catch (err) {
    dialog.showErrorBox('HighVolt AI', `Server failed to start: ${err.message}`);
  }
  createWindow();
  watchForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', async () => {
  await stopServer();
  if (process.platform !== 'darwin') app.quit();
});
