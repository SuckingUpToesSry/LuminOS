/* ============================================================
   LuminOS — registro central de apps
   ============================================================ */

import { browserApp } from './apps/browser.js';
import { notesApp } from './apps/notes.js';
import { aiApp } from './apps/ai.js';
import { gamesApp } from './apps/games.js';
import { soundboardApp, musicApp, photosApp } from './apps/media.js';
import { storeApp } from './apps/store.js';
import { settingsApp } from './apps/settings.js';
import { filesApp, terminalApp } from './apps/files.js';
import { calculatorApp, paintApp, codeApp, creatorApp } from './apps/tools.js';
import { chatApp, clockApp, calendarApp } from './apps/social.js';
import { cameraApp, linksApp, feedbackApp } from './apps/extras.js';
import { webAppMount, aboutApp } from './apps/webapp.js';

export const version = '1.0.0';

const APPS = [
  browserApp, notesApp, aiApp, gamesApp, soundboardApp, musicApp, photosApp,
  storeApp, settingsApp, filesApp, terminalApp, calculatorApp, paintApp,
  codeApp, creatorApp, chatApp, clockApp, calendarApp, cameraApp, linksApp,
  feedbackApp, aboutApp,
];

class Registry {
  constructor() { this.map = new Map(); }
  register(app) {
    if (!app?.id) throw new Error('app sem id');
    this.map.set(app.id, { ...app, size: app.size || { w: 720, h: 500 } });
  }
  get(id) { return this.map.get(id); }
  all() { return [...this.map.values()]; }
  dockApps() { return this.all().filter((a) => a.dock); }
  desktopApps() {
    const out = this.all().filter((a) => a.desktop);
    const custom = JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]');
    return { core: out, custom };
  }
  categories() { return [...new Set(this.all().map((a) => a.category || 'Outros'))]; }
}

export const registry = new Registry();
APPS.forEach((a) => registry.register(a));
export { webAppMount };

/** resolve any icon id (including user-created web apps) to an app-like object */
export function resolveApp(id) {
  const core = registry.get(id);
  if (core) return core;
  if (id.startsWith('web:')) {
    const wid = id.slice(4);
    const list = JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]');
    const w = list.find((x) => x.id === wid);
    if (!w) return null;
    return {
      id, name: w.name, glyph: 'globe', grad: [w.c1 || '#6f8bff', w.c2 || '#b07bff'], emoji: w.emoji,
      category: 'Web', size: { w: 900, h: 620 }, custom: true,
      mount: (body, api) => webAppMount(body, api, w),
    };
  }
  return null;
}
