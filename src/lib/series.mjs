// Loads and validates every series file in src/data/series.
// Used by the site build and by `npm run check-data`.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'series');
const SOURCES = ['manga', 'manhwa', 'light_novel', 'webtoon', 'novel'];
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
  return { manga: 'Manga', manhwa: 'Manhwa', light_novel: 'Light novel', webtoon: 'Webtoon', novel: 'Novel' }[source];
}

export function unitLabel(source) {
  return source === 'light_novel' || source === 'novel' ? 'Volume' : 'Chapter';
}

export function entryId(entry) {
  // Long-running shows (like One Piece) keep one permanent address even as the label changes.
  if (entry.aired === 'ongoing') return 'latest';
  return entry.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validate(series, file) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(`${file}: ${msg}`); };
  need(series && typeof series === 'object', 'file is empty or not a map');
  if (errors.length) return errors;

  need(/^[a-z0-9-]+$/.test(series.slug || ''), 'slug must be lowercase letters, numbers and dashes');
  need(`${series.slug}.yaml` === file, `slug "${series.slug}" must match the file name`);
  need(series.title, 'title is required');
  need(series.aka == null || (Array.isArray(series.aka) && series.aka.every((a) => typeof a === 'string')), 'aka must be a list of names (put quotes around names that contain a colon)');
  need(SOURCES.includes(series.source), `source must be one of ${SOURCES.join(', ')}`);
  need(Array.isArray(series.entries) && series.entries.length, 'at least one entry is required');

  const ids = (series.entries || []).map((e) => (e && e.label ? entryId(e) : null)).filter(Boolean);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  need(!dupes.length, `two entries would share the page address "${dupes[0]}". Give them different labels`);

  (series.entries || []).forEach((e, i) => {
    const at = `entry ${i + 1} (${e.label || 'no label'})`;
    need(e.label, `${at}: label is required`);
    need(KINDS.includes(e.kind), `${at}: kind must be one of ${KINDS.join(', ')}`);
    need(e.aired === 'ongoing' || /^\d{4}-(winter|spring|summer|fall)$/.test(String(e.aired)), `${at}: aired must look like 2026-spring or "ongoing"`);
    need(e.status == null || ['airing', 'finished'].includes(e.status), `${at}: status must be "airing" or left out`);
    const airing = e.status === 'airing';
    if (airing) {
      need(e.start_chapter == null, `${at}: an airing entry can't have start_chapter yet. Remove "status: airing" once the finale has aired`);
    } else if (e.covers_all != null) {
      // The anime adapts the source all the way to its end: there's nothing left to start.
      need(e.covers_all === true, `${at}: covers_all must be true, or left out`);
      need(e.start_chapter == null, `${at}: an entry with covers_all can't also have start_chapter`);
      need(Number.isInteger(e.last_chapter), `${at}: covers_all needs last_chapter (the source's final chapter or volume)`);
      need(CONFIDENCE.includes(e.confidence), `${at}: confidence must be one of ${CONFIDENCE.join(', ')}`);
      need(Array.isArray(e.sources) && e.sources.length, `${at}: at least one source link is required`);
      need(e.confidence !== 'agree' || (e.sources || []).length >= 2, `${at}: "agree" needs two or more sources`);
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
    if (e.episode_map != null) errors.push(...validateEpisodeMap(e, `${file}: ${at}: episode_map`));
  });
  return errors;
}

function episodeCount(episodes) {
  const m = String(episodes || '').match(/^(\d+)\s*[–-]\s*(\d+)$/);
  return m ? { first: Number(m[1]), count: Number(m[2]) - Number(m[1]) + 1 } : null;
}

// Episode maps must follow the manga in order, or the "stopped at episode"
// answers would send people to the wrong place.
function validateEpisodeMap(e, at) {
  const errors = [];
  const map = e.episode_map;
  const rows = map && map.rows;
  if (!map || !map.source || !/^https:\/\//.test(map.source.url || '')) errors.push(`${at}: needs a source with an https link`);
  if (map && map.overall_first != null && !(Number.isInteger(map.overall_first) && map.overall_first > 1)) errors.push(`${at}: overall_first must be a whole number above 1`);
  if (!Array.isArray(rows) || !rows.length) return [...errors, `${at}: rows must be a list`];
  rows.forEach((r, i) => {
    const ok = Array.isArray(r) && r.length === 3 && r.every(Number.isInteger);
    if (!ok) return errors.push(`${at}: row ${i + 1} must look like [episode, first chapter, last chapter]`);
    const [ep, first, last] = r;
    if (ep !== i + 1) errors.push(`${at}: row ${i + 1} should be episode ${i + 1} (numbering within the season)`);
    if (first > last) errors.push(`${at}: episode ${ep} starts after it ends`);
    if (i > 0) {
      const [, pf, pl] = rows[i - 1];
      if (first < pf || last < pl) errors.push(`${at}: episode ${ep} goes back to earlier chapters. Only add maps for seasons that follow the manga in order`);
    }
  });
  const range = episodeCount(e.episodes);
  if (range && range.count !== rows.length) errors.push(`${at}: has ${rows.length} rows but the season has ${range.count} episodes`);
  const end = rows.at(-1)?.[2];
  if (Number.isInteger(e.last_chapter) && Number.isInteger(end) && Math.abs(end - e.last_chapter) > 2)
    errors.push(`${at}: the last episode ends at Ch. ${end}, far from last_chapter ${e.last_chapter}. Check both`);
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
      episode_map: e.episode_map
        ? {
            source: e.episode_map.source,
            // overall_first: the series-wide number of this season's first episode, when `episodes` counts from 1.
            first_episode: e.episode_map.overall_first ?? episodeCount(e.episodes)?.first ?? 1,
            rows: e.episode_map.rows.map(([ep, first, last]) => ({ ep, first, last })),
          }
        : null,
    })),
  }));
  cache.sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}

// ---- Answers in words ----
// covers_all: the anime adapts the source all the way to its end.
export const isComplete = (entry) => entry?.covers_all === true;
export const unitAbbr = (source) => (unitLabel(source) === 'Volume' ? 'Vol.' : 'Ch.');

// Short form for lists and badges: "Ch. 81", "Vol. 5", "Whole story", or null while airing.
export function shortAnswer(series, entry) {
  if (!entry || entry.airing) return null;
  if (isComplete(entry)) return 'Whole story';
  return `${unitAbbr(series.source)} ${entry.start_chapter}`;
}

// One plain sentence, e.g. "Start at Chapter 81 (Volume 10)." or
// "The anime covers the whole manga, through Chapter 108 (the final chapter)."
export function answerSentence(series, entry) {
  const unit = unitLabel(series.source);
  const source = sourceLabel(series.source).toLowerCase();
  if (isComplete(entry)) return `The anime covers the whole ${source}, through ${unit} ${entry.last_chapter} (the final ${unit.toLowerCase()}).`;
  return `Start at ${unit} ${entry.start_chapter}${entry.start_volume ? ` (Volume ${entry.start_volume})` : ''}.`;
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
  return `${latest ? `${latest.label}:${latest.covers_all ? 'all' : latest.start_chapter}` : '-'}|${airing}`;
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

// ---- A–Z directory ----
// Titles are filed ignoring a leading "The", "A" or "An" ("The Apothecary Diaries" goes under A).
export const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
export const letterSlug = (letter) => (letter === '#' ? '0-9' : letter.toLowerCase());

export function sortTitle(title) {
  return title.replace(/^(the|a|an)\s+/i, '').trim();
}

export function letterOf(series) {
  const first = sortTitle(series.title).normalize('NFKD').charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}

// Shows grouped by letter, each group sorted by filing title. Letters with no shows are left out.
export function showsByLetter() {
  const groups = new Map(LETTERS.map((l) => [l, []]));
  for (const s of loadAllSeries()) groups.get(letterOf(s)).push(s);
  for (const list of groups.values()) list.sort((a, b) => sortTitle(a.title).localeCompare(sortTitle(b.title)));
  return LETTERS.filter((l) => groups.get(l).length).map((letter) => ({ letter, slug: letterSlug(letter), shows: groups.get(letter) }));
}
