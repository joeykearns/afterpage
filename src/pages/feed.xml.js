// RSS feed of answers, newest first, so Discord servers, readers and
// aggregators can pick up new chapters automatically.
import { loadAllSeries, airedKey, unitLabel, sourceLabel, isComplete, answerSentence } from '../lib/series.mjs';
import { SITE_NAME, SITE_URL } from '../config.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
  const items = loadAllSeries()
    .flatMap((series) => series.entries.filter((e) => !e.airing).map((entry) => ({ series, entry })))
    // Most recently checked first; among equal dates, the most recent season first.
    .sort((a, b) => b.entry.last_checked.localeCompare(a.entry.last_checked) || airedKey(b.entry.aired) - airedKey(a.entry.aired))
    .slice(0, 50);

  const body = items.map(({ series, entry }) => {
    const unit = unitLabel(series.source);
    const link = new URL(`/anime/${series.slug}/${entry.id}/`, SITE_URL).href;
    const complete = isComplete(entry);
    const title = complete
      ? `${series.title}, ${entry.label}: the anime covers the whole ${sourceLabel(series.source).toLowerCase()}`
      : `${series.title}, after ${entry.label}: start at ${unit} ${entry.start_chapter}`;
    const text = `${answerSentence(series, entry)} No spoilers; sources on the page.`;
    return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(`${series.slug}/${entry.id}/${complete ? 'all' : entry.start_chapter}`)}</guid>
      <pubDate>${new Date(`${entry.last_checked}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(text)}</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)}: new chapter answers</title>
    <link>${esc(new URL('/', SITE_URL).href)}</link>
    <atom:link href="${esc(new URL('/feed.xml', SITE_URL).href)}" rel="self" type="application/rss+xml" />
    <description>Where the anime leaves off in the manga. Numbers only, no spoilers.</description>
    <language>en</language>
${body}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
