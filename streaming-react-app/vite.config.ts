import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import {resolve} from 'path';

// const rootDir = resolve(__dirname, 'src');
// const assetsDir = resolve(rootDir, 'assets');
// const typesDir = resolve(__dirname, 'types');

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  let define = {};
  if (command === 'serve') {
    define = {
      global: {},
    };
  }
  return {
    plugins: [react()],
    define: define,
    server: {
      proxy: {
        '/ws': {
          target: 'ws://localhost:7860',
          ws: true
        }
      },
    },
  }
});
