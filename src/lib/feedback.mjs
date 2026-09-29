// Where "This is wrong", "Tell us" and "Add a show" links go.
// If FEEDBACK_FORM_URL is set in config.mjs (for example a free Tally form),
// links open that form with the show and season filled in.
// Otherwise they fall back to GitHub issue forms, which need a GitHub account.
import * as config from '../config.mjs';

// Read optional settings without a build warning when they're not set yet.
const settings = Object.fromEntries(Object.entries(config));
const FORM = String(settings.FEEDBACK_FORM_URL || '').trim();
const REPO = config.REPO;

export const usesForm = Boolean(FORM);

// type: 'correction' | 'finale' | 'new-show'
export function feedbackUrl({ type, show = '', season = '' }) {
  if (FORM) {
    const url = new URL(FORM);
    url.searchParams.set('type', type);
    if (show) url.searchParams.set('show', show);
    if (season) url.searchParams.set('season', season);
    return url.href;
  }
  const template = type === 'new-show' ? 'new-show.yml' : 'correction.yml';
  const params = new URLSearchParams({ template });
  if (type !== 'new-show' && show) {
    params.set('title', `${type === 'finale' ? 'Finale' : 'Correction'}: ${show}${season ? `, ${season}` : ''}`);
  }
  return `https://github.com/${REPO}/issues/new?${params}`;
}
