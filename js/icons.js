/* ============================================================
   LuminOS — icon set (inline SVG, zero assets)
   ============================================================ */

const P = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  note: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H16l4 4v12.5A1.5 1.5 0 0 1 18.5 21h-12A1.5 1.5 0 0 1 5 19.5z"/><path d="M16 3v5h4M8.5 12h7M8.5 16h4.5"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/>',
  game: '<rect x="2.5" y="7" width="19" height="10.5" rx="4.5"/><path d="M7.5 12.2h3M9 10.7v3M15.5 11.4h.01M17.6 13.6h.01"/>',
  sound: '<path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10.5v3"/>',
  store: '<path d="M4 8.5 5.6 4h12.8L20 8.5"/><path d="M4 8.5h16V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9 12h6"/>',
  photo: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.6" cy="10" r="1.6"/><path d="m4 17 4.5-4.5 3.5 3.5 3-3L20 17.5"/>',
  music: '<path d="M9 18V6.5l10-2V16"/><circle cx="6.8" cy="18" r="2.7"/><circle cx="16.8" cy="16" r="2.7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.7-1.1H1.3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8 3.4h.09A1.7 1.7 0 0 0 9.2 1.7V1.3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.1 1.7 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 20.6 8v.09a1.7 1.7 0 0 0 1.7 1.1h.4a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.61 1.81z"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m7.5 10 2.5 2-2.5 2M12.5 14.5h4"/>',
  calc: '<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18.5h7"/>',
  chat: '<path d="M20 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-4.6A7.5 7.5 0 1 1 20 12.5z"/><path d="M9 11.5h6M9 14.5h3.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  paint: '<path d="M12 3a9 9 0 0 0 0 18 2.2 2.2 0 0 0 1.6-3.7 2.2 2.2 0 0 1 1.6-3.7H18A3 3 0 0 0 21 10.6C21 6.4 17 3 12 3z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.6" r="1.2"/><circle cx="15.6" cy="9.6" r="1.2"/>',
  code: '<path d="m8.5 8-4.5 4 4.5 4M15.5 8l4.5 4-4.5 4M13.6 5.5 10.4 18.5"/>',
  camera: '<rect x="2.5" y="6.5" width="19" height="13" rx="3"/><circle cx="12" cy="13" r="3.6"/><path d="m8 6.5 1.4-2.2h5.2L16 6.5"/>',
  film: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M7 4.5v15M17 4.5v15M2.5 9.5h4.5M2.5 14.5h4.5M17 9.5h4.5M17 14.5h4.5"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11.5" r="2.2"/><path d="M5.2 16.2c.5-1.6 1.8-2.4 3.3-2.4s2.8.8 3.3 2.4M14.5 10h4.5M14.5 13.5h4.5"/>',
  video: '<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m15.5 11 6-3.2v8.4l-6-3.2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bookmark: '<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>',
  star: '<path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1.1 6.1L12 17.5l-5.5 2.9 1.1-6.1L3.2 10l6.1-.9z"/>',
  apps: '<path d="M12 3.5 21 8v8l-9 4.5L3 16V8z"/><path d="m3 8 9 4.5L21 8M12 12.5V20"/>',
  wand: '<path d="M4 20 16.5 7.5M14.5 5.5l4 4M6 5v3M4.5 6.5h3M18 14v2.5M16.75 15.25h2.5M17 4h.01"/>',
  play: '<path d="m8 5.5 11 6.5-11 6.5z"/>',
  pause: '<rect x="7" y="5" width="3.4" height="14" rx="1.2"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.2"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  chevU: '<path d="m6 14.5 6-6 6 6"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4.5V10h-5.5"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 20.5V14h5v6.5"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.4-3.2 7.8-7.5 9-4.3-1.2-7.5-4.6-7.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  unlock: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 7.5-1.8"/>',
  dots: '<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',
  dotsH: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  external: '<path d="M14 4.5h5.5V10M19 5 11 13"/><path d="M18 14.5v4A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  download: '<path d="M12 4v10.5M8 11l4 4 4-4M5 19.5h14"/>',
  upload: '<path d="M12 20V9.5M8 13l4-4 4 4M5 4.5h14"/>',
  minus: '<path d="M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  vol: '<path d="M4 9.5h3L12 5v14l-5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  volOff: '<path d="M4 9.5h3L12 5v14l-5-4.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  batt: '<rect x="2.5" y="8" width="17" height="8" rx="2.2"/><path d="M21.5 11v2"/><rect x="4.5" y="10" width="10" height="4" rx="1" fill="currentColor" stroke="none"/>',
  wifi: '<path d="M4 9.5a12 12 0 0 1 16 0M6.8 12.6a8 8 0 0 1 10.4 0M9.6 15.7a4 4 0 0 1 4.8 0"/><circle cx="12" cy="18.6" r="1" fill="currentColor" stroke="none"/>',
  bell: '<path d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4.5 18h15z"/><path d="M10 21h4"/>',
  power: '<path d="M12 4v7"/><path d="M7.5 6.8a7.5 7.5 0 1 0 9 0"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c1-3.2 3.3-4.8 6-4.8s5 1.6 6 4.8"/><path d="M16 5.6a3.2 3.2 0 0 1 0 6M17.5 15.4c2 .6 3.3 2.2 4 4.6"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.6" cy="10" r="1.6"/><path d="m4 17 4.5-4.5 3.5 3.5 3-3L20 17.5"/>',
  file: '<path d="M6 3.5h7.5L19 9v11.5H6z"/><path d="M13.5 3.5V9H19"/>',
  save: '<path d="M5 4.5h11L20 8.5v11H5z"/><path d="M8.5 4.5v5h7v-5M8.5 19.5v-5.5h7v5.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  sort: '<path d="M7 5v14M4 16l3 3 3-3M14 7h6M14 12h4M14 17h2"/>',
  grid2: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 9.5h17M9.5 9.5v11"/>',
  maximize: '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
  minimize: '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M4.5 15h4.5v4.5M19.5 15V9H15"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.8" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor" stroke="none"/>',
  layers: '<path d="m12 3.5 9 4.8-9 4.8-9-4.8z"/><path d="m3 12.5 9 4.8 9-4.8"/><path d="m3 16.5 9 4.8 9-4.8"/>',
  eye: '<path d="M2.5 12S5.8 5.5 12 5.5 21.5 12 21.5 12 18.2 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.1"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.4 12 20 12 20z"/>',
  send: '<path d="M4.5 12 20 4.5 15.5 20l-4-6.5z"/>',
  link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 7.5 13 5.5a4 4 0 0 1 5.5 5.5l-2 2M13 16.5 11 18.5A4 4 0 0 1 5.5 13l2-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6h.01"/>',
  warning: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  wifiOff: '<path d="M4 9.5a12 12 0 0 1 5-2.9M15.6 7a12 12 0 0 1 4.4 2.5M6.8 12.6a8 8 0 0 1 3-1.7M15.5 12.2a8 8 0 0 1 1.7 1.4M9.6 15.7a4 4 0 0 1 4.8 0"/><path d="m3 3 18 18"/>',
  sliders: '<path d="M5 6.5h14M5 12h14M5 17.5h14"/><circle cx="9" cy="6.5" r="2" fill="var(--surface)"/><circle cx="15" cy="12" r="2" fill="var(--surface)"/><circle cx="8" cy="17.5" r="2" fill="var(--surface)"/>',
  thumbUp: '<path d="M7 10.5 11 4c1.6 0 2.4 1 2.4 2.4V9.5h4.4a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7z"/><path d="M7 10.5H3.8v9H7z"/>',
  bookmarkPlus: '<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/><path d="M12 7v5M9.5 9.5h5"/>',
};

/** Named icon markup */
export function icon(name, cls = 'ic') {
  const d = P[name] || P.apps;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
}

/** Full app icon (gradient tile + glyph) */
export function appIcon(app, cls = 'ico') {
  const g = app.grad || ['#8b9dff', '#b07bff'];
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  const glyph = app.emoji
    ? `<text x="24" y="31" text-anchor="middle" font-size="22">${app.emoji}</text>`
    : `<g transform="translate(12 12)" fill="none" stroke="#fff" stroke-width="1.6"
         stroke-linecap="round" stroke-linejoin="round" opacity=".96">${P[app.glyph] || P.apps}</g>`;
  return `<span class="${cls}">
    <svg viewBox="0 0 48 48" aria-hidden="true" style="width:100%;height:100%;display:block">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="${g[0]}"/><stop offset="1" stop-color="${g[1]}"/>
      </linearGradient></defs>
      <rect width="48" height="48" rx="12" fill="url(#${id})"/>
      ${glyph}
    </svg></span>`;
}

export { P as paths };
