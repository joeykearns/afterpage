import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config.mjs';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  // Put page CSS inside each page so text shows without waiting for a separate file.
  build: { inlineStylesheets: 'always' },
  integrations: [sitemap()],
});
