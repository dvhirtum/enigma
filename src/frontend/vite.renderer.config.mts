import react from '@vitejs/plugin-react';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';

const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

// Added to production builds only: the dev server injects inline scripts.
const csp: Plugin = {
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy }, injectTo: 'head-prepend' }],
};

export default defineConfig({
  plugins: [react(), csp],
  // The Instructions view reads the user guide from docs/user.
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../../docs/user'] } },
});
