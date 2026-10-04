import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps asset paths relative so the build works on any host
// (GitHub Pages sub-path, Vercel, Netlify, or opened from a local folder).
export default defineConfig({
  base: './',
  plugins: [react()],
});
