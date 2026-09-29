import { loadAllSeries, airedKey } from '../lib/series.mjs';

// Small index the search box downloads once. Titles and numbers only.
export function GET() {
  const index = loadAllSeries().map((s) => {
    const latest = [...s.entries].sort((a, b) => airedKey(b.aired) - airedKey(a.aired))[0];
    return {
      slug: s.slug,
      title: s.title,
      aka: s.aka,
      latest: latest.label,
      start: latest.start_chapter,
      unit: s.source === 'light_novel' ? 'Vol.' : 'Ch.',
    };
  });
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } });
}
