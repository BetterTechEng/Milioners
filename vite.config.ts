import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Bind to 127.0.0.1: on Windows "localhost" can resolve to IPv6 only and the browser gets "connection refused".
const local = { host: '127.0.0.1', open: true };

// Relative base so the build works on GitHub Pages under /Milioners/.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { ...local, port: 5173 },
  preview: { ...local, port: 4173 },
});
