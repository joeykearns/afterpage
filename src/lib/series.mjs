// Loads and validates every series file in src/data/series.
// Used by the site build and by `npm run check-data`.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'series');
const SOURCES = ['manga', 'manhwa', 'light_novel', 'webtoon'];
const KINDS = ['season', 'movie', 'series', 'part'];
const CONFIDENCE = ['agree', 'differ', 'single'];
const SEASON_ORDER = { winter: 1, spring: 2, summer: 3, fall: 4 };

const asText = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v));

export function airedKey(aired) {
  if (aired === 'ongoing') return 99999;
  const [year, season] = String(aired).split('-');
  return Number(year) * 10 + (SEASON_ORDER[season] || 0);
}

export function airedLabel(aired) {
  if (aired === 'ongoing') return 'Still airing';
  const [year, season] = String(aired).split('-');
  return `${season[0].toUpperCase()}${season.slice(1)} ${year}`;
}

export function sourceLabel(source) {
  return { manga: 'Manga', manhwa: 'Manhwa', light_novel: 'Light novel', webtoon: 'Webtoon' }[source];
}

export function unitLabel(source) {
  return source === 'light_novel' ? 'Volume' : 'Chapter';
}

export function entryId(entry) {
  return entry.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function validate(series, file) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(`${file}: ${msg}`); };
  need(series && typeof series === 'object', 'file is empty or not a map');
  if (errors.length) return errors;

  need(/^[a-z0-9-]+$/.test(series.slug || ''), 'slug must be lowercase letters, numbers and dashes');
  need(`${series.slug}.yaml` === file, `slug "${series.slug}" must match the file name`);
  need(series.title, 'title is required');
  need(SOURCES.includes(series.source), `source must be one of ${SOURCES.join(', ')}`);
  need(Array.isArray(series.entries) && series.entries.length, 'at least one entry is required');

  (series.entries || []).forEach((e, i) => {
    const at = `entry ${i + 1} (${e.label || 'no label'})`;
    need(e.label, `${at}: label is required`);
    need(KINDS.includes(e.kind), `${at}: kind must be one of ${KINDS.join(', ')}`);
    need(e.aired === 'ongoing' || /^\d{4}-(winter|spring|summer|fall)$/.test(String(e.aired)), `${at}: aired must look like 2026-spring or "ongoing"`);
    need(e.status == null || ['airing', 'finished'].includes(e.status), `${at}: status must be "airing" or left out`);
    const airing = e.status === 'airing';
    if (airing) {
      need(e.start_chapter == null, `${at}: an airing entry can't have start_chapter yet. Remove "status: airing" once the finale has aired`);
    } else {
      need(Number.isInteger(e.start_chapter), `${at}: start_chapter must be a whole number`);
      need(CONFIDENCE.includes(e.confidence), `${at}: confidence must be one of ${CONFIDENCE.join(', ')}`);
      need(Array.isArray(e.sources) && e.sources.length, `${at}: at least one source link is required`);
      need(e.confidence !== 'agree' || (e.sources || []).length >= 2, `${at}: "agree" needs two or more sources`);
    }
    need(e.last_chapter == null || Number.isInteger(e.last_chapter), `${at}: last_chapter must be a whole number`);
    need(e.start_volume == null || Number.isInteger(e.start_volume), `${at}: start_volume must be a whole number`);
    (e.sources || []).forEach((s) => need(/^https:\/\//.test(s.url || ''), `${at}: source "${s.name}" needs an https link`));
    need(/^\d{4}-\d{2}-\d{2}$/.test(asText(e.last_checked) || ''), `${at}: last_checked must be YYYY-MM-DD`);
  });
  return errors;
}

let cache;

export function loadAllSeries() {
  if (cache) return cache;
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.yaml')).sort();
  const errors = [];
  const all = files.map((file) => {
    const series = load(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    errors.push(...validate(series, file));
    return series;
  });
  if (errors.length) {
    throw new Error(`Data problems found:\n- ${errors.join('\n- ')}`);
  }
  cache = all.map((s) => ({
    ...s,
    aka: s.aka || [],
    read_official: s.read_official || [],
    entries: s.entries.map((e) => ({
      ...e,
      id: entryId(e),
      last_checked: asText(e.last_checked),
      skipped: e.skipped || [],
      sources: e.sources || [],
      airing: e.status === 'airing',
    })),
  }));
  cache.sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}

// Newest finished entry of a series (the one with an answer), or undefined.
export function latestAnswer(series) {
  return [...series.entries].filter((e) => !e.airing).sort((a, b) => airedKey(b.aired) - airedKey(a.aired))[0];
}

// A short fingerprint of a show's current state. When it changes, people who
// saved the show see a "New" badge.
export function answerKey(series) {
  const latest = latestAnswer(series);
  const airing = series.entries.filter((e) => e.airing).map((e) => e.label).join(',');
  return `${latest ? `${latest.label}:${latest.start_chapter}` : '-'}|${airing}`;
}

// Every entry flattened with its series, newest first.
export function allEntries() {
  return loadAllSeries()
    .flatMap((series) => series.entries.map((entry) => ({ series, entry })))
    .sort((a, b) => airedKey(b.entry.aired) - airedKey(a.entry.aired));
}

export function seasonHubs() {
  const map = new Map();
  for (const item of allEntries()) {
    if (item.entry.aired === 'ongoing') continue;
    const key = String(item.entry.aired);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()]
    .map(([slug, items]) => ({ slug, label: airedLabel(slug), items }))
    .sort((a, b) => airedKey(b.slug) - airedKey(a.slug));
}
