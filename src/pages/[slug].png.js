// One share image per show, showing its latest answer.
import { loadAllSeries, latestAnswer } from '../../lib/series.mjs';
import { renderShareImage } from '../../lib/og.mjs';

export function getStaticPaths() {
  return loadAllSeries().map((series) => ({ params: { slug: series.slug }, props: { series } }));
}

export async function GET({ props }) {
  const { series } = props;
  const latest = latestAnswer(series);
  const png = await renderShareImage({ series, latest: latest || null, subtitle: latest ? `After ${latest.label}` : 'New season' });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
