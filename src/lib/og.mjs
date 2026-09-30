// Draws the 1200x630 share images (link previews on Reddit, Discord, X...).
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { unitLabel } from './series.mjs';
import { SITE_NAME } from '../config.mjs';

const font = (pkg, file) => fs.readFileSync(path.join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file));
let fonts;
function getFonts() {
  fonts ??= [
    { name: 'Display', data: font('rubik', 'rubik-latin-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'Display', data: font('rubik', 'rubik-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Body', data: font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Body', data: font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-700-normal.woff'), weight: 700, style: 'normal' },
  ];
  return fonts;
}

const RED = '#D9473F';
const INK = '#20283D';
const SOFT = '#505A73';
// The logo mark (public/logo-mark.png).
const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'logo-mark.png')).toString('base64')}`;
const ribbon = (w, h) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 10 14"><path d="M0 0h10v14l-5-3.1L0 14z" fill="${RED}"/></svg>`)}`;

// Tiny helper so the layout reads like HTML.
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c !== null && c !== false) } });
const img = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style } });

// The soft color glow behind every image. Drawn once per build, then reused (gradients are slow to draw).
let background;
async function getBackground() {
  if (!background) {
    const tree = h('div', { width: 1200, height: 630, background: '#EEF1F8', borderTop: `12px solid ${RED}`,
      backgroundImage: 'radial-gradient(circle at 92% 0%, rgba(217,71,63,0.26), rgba(217,71,63,0) 45%), radial-gradient(circle at 0% 60%, rgba(84,110,240,0.22), rgba(84,110,240,0) 50%)' });
    const svg = await satori(tree, { width: 1200, height: 630, fonts: getFonts() });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    background = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
  }
  return background;
}


// latest: the entry whose answer to show, or null for an "Airing now" card.
// subtitle: the line under the title, e.g. "After Season 2".
export async function renderShareImage({ series, latest, subtitle }) {
  const unit = unitLabel(series.source);
  const titleSize = series.title.length > 30 ? 60 : series.title.length > 18 ? 72 : 88;

  const answer = latest
    ? h('div', { display: 'flex', flexDirection: 'column', position: 'relative', background: 'rgba(255,255,255,0.78)', border: '2px solid rgba(255,255,255,0.95)', borderRadius: 28, padding: '30px 40px 30px 96px', boxShadow: '0 16px 32px -16px rgba(32,40,61,0.38)' },
        img(ribbon(34, 80), 34, 80, { position: 'absolute', left: 36, top: -2 }),
        h('div', { fontFamily: 'Body', fontWeight: 700, fontSize: 26, color: INK }, 'Start reading at'),
        h('div', { alignItems: 'flex-start', marginTop: 8 },
          h('div', { fontFamily: 'Display', fontWeight: 500, fontSize: 34, color: INK, marginRight: 12, marginTop: 10 }, unit),
          h('div', { fontFamily: 'Display', fontWeight: 600, fontSize: 104, lineHeight: 1, letterSpacing: -2, color: INK }, String(latest.start_chapter)),
        ),
        latest.start_volume ? h('div', { fontFamily: 'Display', fontWeight: 500, fontSize: 28, color: INK, marginTop: 6 }, `Volume ${latest.start_volume}`) : null,
      )
    : h('div', { display: 'flex', flexDirection: 'column', border: '3px dashed rgba(32,40,61,0.3)', background: 'rgba(255,255,255,0.55)', borderRadius: 28, padding: '30px 40px' },
        h('div', { fontFamily: 'Display', fontWeight: 600, fontSize: 52, color: INK }, 'Airing now'),
        h('div', { fontFamily: 'Body', fontSize: 26, color: SOFT, marginTop: 8, maxWidth: 380 }, 'The chapter goes up within two days of the finale.'),
      );

  const tree = h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', background: '#EEF1F8', position: 'relative', fontFamily: 'Body' },
    img(await getBackground(), 1200, 630, { position: 'absolute', left: 0, top: 0 }),
    h('div', { display: 'flex', alignItems: 'center', position: 'absolute', left: 72, top: 72 },
      img(LOGO, 74, 46, { marginRight: 16 }),
      h('div', { fontFamily: 'Display', fontWeight: 600, fontSize: 38, color: INK, letterSpacing: -0.5 }, SITE_NAME),
    ),
    h('div', { display: 'flex', flexDirection: 'column', position: 'absolute', left: 72, top: 182, width: 560 },
      h('div', { fontFamily: 'Display', fontWeight: 600, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1.5, color: INK }, series.title),
      h('div', { fontFamily: 'Body', fontSize: 32, color: SOFT, marginTop: 24 }, subtitle),
      h('div', { fontFamily: 'Body', fontSize: 24, color: SOFT, marginTop: 36 }, 'No spoilers. Sources linked.'),
    ),
    h('div', { display: 'flex', position: 'absolute', right: 72, bottom: 72 }, answer),
  );

  const svg = await satori(tree, { width: 1200, height: 630, fonts: getFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return png;
}
