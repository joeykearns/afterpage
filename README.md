# Afterpage

Finished an anime season? Afterpage tells you the exact manga chapter to start next, with no spoilers and a source link on every answer.

It's a static site: no server, no database, no accounts. Every answer lives in a small YAML file in `src/data/series/`, so every change is reviewable in Git.

## Launch it for free (about 15 minutes)

You need a free [GitHub](https://github.com) account and a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.

1. **Put the code on GitHub.** Create a new public repository named `afterpage`, then upload this folder's contents (drag and drop works on github.com).
2. **Edit `src/config.mjs` on GitHub.** Set `REPO` to `your-username/afterpage` (this powers the "This is wrong" and "Add a show" buttons).
3. **Deploy on Cloudflare.** In the dashboard go to Compute → Workers & Pages → Create application → Import a repository, connect GitHub, and pick the repo. Use:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (reads `wrangler.jsonc`)
   - Environment variable: `NODE_VERSION` = `22`
4. **Set your address.** Copy the `*.workers.dev` address Cloudflare shows, paste it into `SITE_URL` in `src/config.mjs`, and commit. Every commit redeploys automatically.
5. **Optional:** turn on Cloudflare Web Analytics (free), and add a custom domain later (about $10–15 a year).

GitHub Pages also works: build locally with `npm run build` and publish the `dist` folder.

## Run it on your computer

Requires Node.js 22 or newer.

```
npm install
npm run dev          # http://localhost:4321
npm run check-data   # validate every data file
npm run build        # production build into dist/
```

## Add or update a show

Create `src/data/series/<slug>.yaml`. The file name must match `slug`.

```yaml
slug: witch-hat-atelier
title: Witch Hat Atelier
aka: [Tongari Boushi no Atelier]      # other names people search for
source: manga                         # manga | manhwa | light_novel | webtoon
read_official:                        # official releases only, never scan sites
  - name: Kodansha (English print & digital)
    url: https://kodansha.us/?s=witch+hat+atelier
entries:
  - label: Season 1                   # official season or film title
    kind: season                      # season | movie | series | part
    episodes: "1–13"
    aired: 2026-spring                # YYYY-winter|spring|summer|fall, or "ongoing"
    last_chapter: 23                  # last chapter the anime adapts
    start_chapter: 24                 # where to start reading
    start_volume: 5                   # optional
    overlap: "…"                      # optional: when an episode stops mid-chapter
    skipped: ["Ch. 12–13"]            # optional: chapter ranges only, no descriptions
    note: "…"                         # optional, spoiler-free
    sources:
      - name: Anime Filler Guide
        url: https://…
      - name: Wikipedia
        url: https://…
    confidence: agree                 # agree (2+ sources match) | differ | single
    last_checked: 2026-09-29
```

`npm run check-data` (also run on every build) refuses files with missing fields, bad dates, or `agree` with fewer than two sources.

### Spoiler rules for every entry

- Numbers only on answer cards. No plot, character names, or arc names beyond a season's official title.
- `skipped` lists chapter ranges, never what happens in them.
- No cover images.
- Link publishers and official apps only.

### Seed data status

13 shows, 20 answers, all checked on 2026-09-29. Seven answers have only one source (`confidence: single`) and are marked that way on the site. Confirming those against the actual chapters is the best first job:

- Frieren Season 1, Jujutsu Kaisen Season 2, Solo Leveling Season 1, Tamon's B-Side, Hunter x Hunter, NANA, One Piece (One Piece also changes weekly while it airs)

## How it's built

| Part | Where |
| --- | --- |
| Data loading and validation | `src/lib/series.mjs` |
| Answer card | `src/components/AnswerCard.astro` |
| Pages | `src/pages/` (home, `anime/[slug]`, `season/[slug]`, about, submit) |
| Search index | `src/pages/search.json.js` (titles and numbers only) |
| Report and suggest forms | `.github/ISSUE_TEMPLATE/` |
| Site name, address, repo | `src/config.mjs` |

Series pages include FAQ structured data so search engines can show the chapter number directly in results.
