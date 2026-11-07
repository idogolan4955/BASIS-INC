import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: false },
  build: {
    sourcemap: true,
    // The shared package and the screens import each other across chunks,
    // which makes the chunk graph circular. Without strict order a chunk
    // can run before the one it needs and the live build loads blank.
    rolldownOptions: { output: { strictExecutionOrder: true } },
  },
});
