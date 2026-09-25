import { app, session } from 'electron';

/**
 * Blocks navigation, new windows, webviews and permission requests. Call once the app is ready.
 * With `devServerUrl`, pages of the Vite dev server may still reload.
 */
export function harden(devServerUrl?: string): void {
  const devOrigin = devServerUrl && new URL(devServerUrl).origin;

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event) => {
      if (!devOrigin || new URL(event.url).origin !== devOrigin) {
        event.preventDefault();
      }
    });
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
}
