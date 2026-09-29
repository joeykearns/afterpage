import { SITE_URL } from '../config.mjs';

export function GET() {
  const sitemap = new URL('/sitemap-index.xml', SITE_URL).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, { headers: { 'Content-Type': 'text/plain' } });
}
