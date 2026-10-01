import { loadAllSeries, latestAnswer, answerKey, shortAnswer } from '../lib/series.mjs';

// Small index the search box downloads once. Titles and numbers only.
export function GET() {
  const index = loadAllSeries().map((s) => {
    const latest = latestAnswer(s);
    return {
      slug: s.slug,
      title: s.title,
      aka: s.aka,
      latest: latest ? latest.label : null,
      answer: shortAnswer(s, latest),
      airing: s.entries.some((e) => e.airing),
      key: answerKey(s),
    };
  });
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } });
}
