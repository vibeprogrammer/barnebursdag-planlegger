import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { prisindeksTeaserHtml } from './scripts/prisindeks.mjs';

// Dev: Vite on 5173 proxies /api to the Express server on 8080.
// Prod: Express serves the built dist/ and the same /api routes.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'prisindeks-teaser',
      transformIndexHtml(html) {
        const teaser = prisindeksTeaserHtml();
        if (!html.includes('<!-- prisindeks -->')) throw new Error('index.html is missing the <!-- prisindeks --> marker');
        return html.replace('<!-- prisindeks -->', teaser);
      }
    }
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' }
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    // CI sets BUILD_SOURCEMAP=hidden only when maps are uploaded to PostHog and then deleted.
    sourcemap: loadEnv(mode, '.', 'BUILD_').BUILD_SOURCEMAP === 'hidden' ? 'hidden' : false
  }
}));
