import path from 'node:path';
import { app, BrowserWindow, Menu, nativeImage } from 'electron';
import started from 'electron-squirrel-startup';
import icon from '../assets/icon.png?inline';
import { createBackend } from './backend';
import { registerIpc } from './ipc';
import { harden } from './security';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: nativeImage.createFromDataURL(icon),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

const run = () => {
  const backend = createBackend();
  registerIpc(backend);

  void app.whenReady().then(() => {
    harden();
    Menu.setApplicationMenu(null);
    createWindow();
  });

  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('will-quit', () => backend.stop());
};

if (started || !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  run();
}
