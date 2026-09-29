// Sends visitors on old or alternate addresses (the workers.dev address, www.)
// to the main address in SITE_URL, keeping the same page. Everything else is
// served straight from the built site.
import { SITE_URL } from './src/config.mjs';

const main = new URL(SITE_URL);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;
    const isOldAddress = host.endsWith('.workers.dev') || host === `www.${main.hostname}`;
    // Only redirect when SITE_URL is a real custom domain, so this can never loop.
    if (isOldAddress && host !== main.hostname && !main.hostname.endsWith('.workers.dev')) {
      url.protocol = 'https:';
      url.hostname = main.hostname;
      url.port = '';
      return Response.redirect(url.href, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
