// Validates every file in src/data/series. Run: npm run check-data
import { loadAllSeries, allEntries } from '../src/lib/series.mjs';

try {
  const series = loadAllSeries();
  const entries = allEntries();
  const single = entries.filter((e) => e.entry.confidence === 'single').length;
  console.log(`Data OK: ${series.length} series, ${entries.length} entries (${single} still need a second source).`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
