// Validates every file in src/data/series. Run: npm run check-data
import { loadAllSeries, allEntries } from '../src/lib/series.mjs';

try {
  const series = loadAllSeries();
  const entries = allEntries();
  const single = entries.filter((e) => !e.entry.airing && e.entry.confidence === 'single').length;
  const airing = entries.filter((e) => e.entry.airing).length;
  console.log(`Data OK: ${series.length} series, ${entries.length} entries, ${airing} still airing (${single} answers still need a second source).`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
