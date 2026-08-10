import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  // Relative rather than '/fort-takehome/'. The app has no router, so relative
  // asset URLs work identically at the domain root, in a project subpath on
  // GitHub Pages, and from a file:// build — which means the deploy target
  // never has to be encoded in the source.
  base: './',
});
