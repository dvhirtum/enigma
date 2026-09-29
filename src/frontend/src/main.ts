import path from 'node:path';
import { app, BrowserWindow, Menu, nativeImage } from 'electron';
import started from 'electron-squirrel-startup';
import icon from '../assets/icon.png?inline';
import { createBackend } from './backend';
import { registerIpc } from './ipc';
import { harden } from './security';

let mainWindow: BrowserWindow | null = null;
let notebookWindow: BrowserWindow | null = null;

/** Loads the renderer; `hash` picks the page it shows. */
function load(window: BrowserWindow, hash?: string): void {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(hash ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${hash}` : MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), { hash });
  }
}

function createWindow(options: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  return new BrowserWindow({
    ...options,
    icon: nativeImage.createFromDataURL(icon),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
}

const createMainWindow = () => {
  mainWindow = createWindow({ width: 1200, height: 800 });
  mainWindow.on('closed', () => {
    mainWindow = null;
    notebookWindow?.close();
  });
  load(mainWindow);
};

/** Opens the operator's notebook, or brings it to the front. */
const openNotebook = () => {
  if (notebookWindow) {
    if (notebookWindow.isMinimized()) {
      notebookWindow.restore();
    }
    notebookWindow.focus();
    return;
  }
  notebookWindow = createWindow({ width: 760, height: 900, minWidth: 560, minHeight: 480 });
  notebookWindow.on('closed', () => {
    notebookWindow = null;
  });
  load(notebookWindow, 'notebook');
};

const run = () => {
  const backend = createBackend();
  registerIpc(backend, { openNotebook });

  void app.whenReady().then(() => {
    harden(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    Menu.setApplicationMenu(null);
    createMainWindow();
  });

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('will-quit', () => backend.stop());
};

if (started || !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  run();
}
