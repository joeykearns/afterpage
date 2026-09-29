// One share image per season, showing that season's answer.
import { loadAllSeries } from '../../lib/series.mjs';
import { renderShareImage } from '../../lib/og.mjs';

export function getStaticPaths() {
  return loadAllSeries().flatMap((series) =>
    series.entries.map((entry) => ({ params: { season: `${series.slug}/${entry.id}` }, props: { series, entry } })),
  );
}

export async function GET({ props }) {
  const { series, entry } = props;
  const png = await renderShareImage({
    series,
    latest: entry.airing ? null : entry,
    subtitle: entry.airing ? `${entry.label}, airing now` : `After ${entry.label}`,
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
