import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config.mjs';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  // Put page CSS inside each page so text shows without waiting for a separate file.
  // concurrency: build several pages at once, so share images are drawn in parallel.
  build: { inlineStylesheets: 'always', concurrency: 4 },
  // The offline page is only for the app, so it stays out of the sitemap.
  integrations: [sitemap({ filter: (page) => !page.includes('/offline') })],
});
