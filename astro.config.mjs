import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/config.mjs';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
});
