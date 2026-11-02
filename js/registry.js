/* ============================================================
   LuminOS — registro central de apps

   Importante: as referências aos apps são resolvidas de forma
   PREGUIÇOSA (na primeira chamada), nunca no topo do módulo.
   Isso evita "Cannot access 'X' before initialization" quando
   existe ciclo de imports (registry → app → registry), que é o
   que acontecia ao carregar os módulos nativos no navegador.
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

export const version = '1.0.1';

/** Só é chamada em tempo de execução (pós-avaliação dos módulos). */
function appList() {
  return [
    browserApp, notesApp, aiApp, gamesApp, soundboardApp, musicApp, photosApp,
    storeApp, settingsApp, filesApp, terminalApp, calculatorApp, paintApp,
    codeApp, creatorApp, chatApp, clockApp, calendarApp, cameraApp, linksApp,
    feedbackApp, aboutApp,
  ];
}

class Registry {
  constructor() {
    this.map = new Map();
    this.ready = false;
  }
  #ensure() {
    if (this.ready) return;
    this.ready = true; // marca antes para evitar reentrância
    for (const app of appList()) {
      if (app?.id) this.map.set(app.id, { ...app, size: app.size || { w: 720, h: 500 } });
    }
  }
  register(app) {
    if (!app?.id) throw new Error('app sem id');
    this.map.set(app.id, { ...app, size: app.size || { w: 720, h: 500 } });
  }
  get(id) { this.#ensure(); return this.map.get(id); }
  all() { this.#ensure(); return [...this.map.values()]; }
  dockApps() { return this.all().filter((a) => a.dock); }
  customApps() {
    try { return JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]'); } catch { return []; }
  }
  desktopApps() {
    return { core: this.all().filter((a) => a.desktop), custom: this.customApps() };
  }
  categories() { return [...new Set(this.all().map((a) => a.category || 'Outros'))]; }
}

export const registry = new Registry();
export { webAppMount };

/** resolve qualquer id de ícone (inclusive web apps criados pelo usuário) */
export function resolveApp(id) {
  const core = registry.get(id);
  if (core) return core;
  if (id?.startsWith('web:')) {
    const wid = id.slice(4);
    const w = registry.customApps().find((x) => x.id === wid);
    if (!w) return null;
    return {
      id,
      name: w.name,
      glyph: 'globe',
      grad: [w.c1 || '#6f8bff', w.c2 || '#b07bff'],
      emoji: w.emoji,
      category: 'Web',
      size: { w: 900, h: 620 },
      custom: true,
      mount: (body, api) => webAppMount(body, api, w),
    };
  }
  return null;
}
