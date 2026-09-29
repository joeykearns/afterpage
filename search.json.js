import { loadAllSeries, latestAnswer } from '../lib/series.mjs';

// Small index the search box downloads once. Titles and numbers only.
export function GET() {
  const index = loadAllSeries().map((s) => {
    const latest = latestAnswer(s);
    return {
      slug: s.slug,
      title: s.title,
      aka: s.aka,
      latest: latest ? latest.label : null,
      start: latest ? latest.start_chapter : null,
      airing: s.entries.some((e) => e.airing),
      unit: s.source === 'light_novel' ? 'Vol.' : 'Ch.',
    };
  });
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } });
}
