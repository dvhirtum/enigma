import { defineConfig, type Plugin } from 'vite';

// Forge sets the deprecated `inlineDynamicImports`; Rolldown takes `codeSplitting: false`.
const singleChunk: Plugin = {
  name: 'single-chunk',
  config(config) {
    const output = config.build?.rollupOptions?.output;
    if (output && !Array.isArray(output) && 'inlineDynamicImports' in output) {
      delete output.inlineDynamicImports;
      Object.assign(output, { codeSplitting: false });
    }
  },
};

// https://vitejs.dev/config
export default defineConfig({
  plugins: [singleChunk],
});
