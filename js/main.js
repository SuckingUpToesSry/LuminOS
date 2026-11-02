/* ============================================================
   LuminOS — bootstrap
   ============================================================ */

import { $, h, store, sound, accentPalette, sound as snd } from './core.js';
import { icon } from './icons.js';
import { initDesktop, openApp, setTheme, setAccent, applySettings, updateProfileChip } from './desktop.js';
import { installStudyHub, toggleStudyHub } from './studyhub.js';

let startedAt = 0;
const BOOT_MSGS = [
  'Iniciando o sistema…',
  'Carregando gerenciador de janelas…',
  'Montando apps…',
  'Preparando o desktop…',
  'Quase lá…',
];

const THEME_SWATCHES = {
  dark: 'linear-gradient(140deg,#191d26,#0b0d12)',
  light: 'linear-gradient(140deg,#fff,#e9ebf0)',
  midnight: 'linear-gradient(140deg,#1a2569,#05060c)',
  nord: 'linear-gradient(140deg,#4c566a,#2e3440)',
  sand: 'linear-gradient(140deg,#fffdf9,#e6ddcf)',
  glass: 'linear-gradient(140deg,#3a2a7a,#0d4d5c)',
};

async function boot() {
  try { window.__LUMIN_OK?.(); } catch {}
  // exibe qualquer falha de carregamento em vez de congelar a tela de boot
  window.addEventListener('error', (e) => showFatal(e?.message || 'Erro inesperado'));
  window.addEventListener('unhandledrejection', (e) => showFatal(e?.reason?.message || String(e?.reason || '')));
  const bootEl = $('#boot');
  const msg = $('#boot-msg');
  let i = 0;
  const iv = setInterval(() => { i = (i + 1) % BOOT_MSGS.length; if (msg) msg.textContent = BOOT_MSGS[i]; }, 420);

  // profile / first run
  const profile = store.get('profile', null);
  const onboarded = store.get('onboarded', false);

  // restore preferences early (avoid flash)
  const s = store.get('settings', {});
  document.documentElement.dataset.theme = s.theme || 'dark';
  if (s.accent) {
    const a = accentPalette.find((x) => x.id === s.accent)
    || (s.accent === 'astolfo' ? { c: '#ec6fa9', c2: '#c39bf7' } : accentPalette[0]);
    document.documentElement.style.setProperty('--accent', a.c);
    document.documentElement.style.setProperty('--accent-2', a.c2);
  }
  const preBright = store.get('brightness', 100);
  snd.enabled = store.get('sound.enabled', true);
  snd.volume = store.get('sound.volume', .5);

  await new Promise((r) => setTimeout(r, 900));
  clearInterval(iv);
  $('#boot-msg').textContent = 'Pronto.';
  startedAt = Date.now();

  bootEl.classList.add('done');
  $('#desktop').hidden = false;
  $('#topbar').hidden = false;
  $('#dock').hidden = false;
  setTimeout(() => { bootEl.style.display = 'none'; }, 500);

  initDesktop();
  initDebugOverlay();

  // Botão de pânico: a tecla "-" troca o LuminOS pelo StudyHub (e vice-versa).
  try { installStudyHub(); } catch (e) { console.warn('[StudyHub]', e); }
  if (preBright !== 100) $('#wallpaper').style.filter = `brightness(${preBright / 100})`;

  if (!onboarded || !profile) {
    showSetup();
  } else {
    applySettings();
    updateProfileChip();
    maybeWelcome();
  }

  // unlock audio on first interaction
  const unlock = () => { sound.ready(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock);

  // resize handler for mobile / orientation
  window.addEventListener('resize', () => {
    const wide = window.innerWidth < 700;
    document.body.classList.toggle('mobile', wide);
  });
}

function showSetup() {
  const setup = $('#setup');
  setup.hidden = false;
  const themeWrap = $('#setup-theme');
  const accentWrap = $('#setup-accent');
  const nameInput = $('#setup-name');
  let theme = store.get('settings', {}).theme || 'dark';
  let accent = store.get('settings', {}).accent || 'indigo';

  themeWrap.innerHTML = '';
  const themes = [
    ['dark', 'Escuro'], ['light', 'Claro'], ['midnight', 'Meia-noite'],
    ['nord', 'Nord'], ['sand', 'Areia'], ['glass', 'Vidro'], ['astolfo', 'Astolfo'],
  ];
  themes.forEach(([id, nm]) => {
    const b = h('button.theme-pick', { type: 'button', class: id === theme ? 'active' : '' },
      h('span.sw', { style: { background: THEME_SWATCHES[id] } }),
      h('b', { text: nm }));
    b.onclick = () => {
      theme = id;
      [...themeWrap.children].forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      document.documentElement.dataset.theme = id;
    };
    themeWrap.append(b);
  });

  accentWrap.innerHTML = '';
  accentPalette.forEach((a) => {
    const b = h('button.accent-pick', { type: 'button', title: a.name,
      style: { background: `linear-gradient(140deg,${a.c},${a.c2})` },
      class: a.id === accent ? 'active' : '' });
    b.onclick = () => {
      accent = a.id;
      [...accentWrap.children].forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      document.documentElement.style.setProperty('--accent', a.c);
      document.documentElement.style.setProperty('--accent-2', a.c2);
    };
    accentWrap.append(b);
  });

  setTimeout(() => nameInput.focus(), 120);

  $('#setup-form').onsubmit = (e) => {
    e.preventDefault();
    const name = nameInput.value.trim() || 'Visitante';
    finishSetup(name, theme, accent);
  };
  $('#setup-guest').onclick = () => finishSetup('Visitante', theme, accent);
}

function finishSetup(name, theme, accent) {
  store.set('profile', { name, pin: '' });
  store.set('onboarded', true);
  store.set('settings', { ...store.get('settings', {}), theme, accent });
  store.set('seen.welcome', true);
  setTheme(theme);
  setAccent(accent);
  $('#setup').hidden = true;
  applySettings();
  updateProfileChip();
  sound.boot();
  maybeWelcome(name);
}

function maybeWelcome(name) {
  const p = store.get('profile', {});
  const n = name || p.name || 'Visitante';
  import('./notifications.js').then(({ notify }) => {
    notify({
      title: `Olá, ${n}!`,
      body: 'Tudo pronto. Use Ctrl/Cmd + K para buscar apps e clique com o botão direito no desktop.',
      iconName: 'spark',
    });
  });
  setTimeout(() => {
    openApp('about');
  }, 700);
}

/* mostra uma falha de inicialização com ações de recuperação */
function showFatal(detail) {
  if (document.getElementById('fatal-panel')) return;
  const boot = document.getElementById('boot');
  if (boot) boot.style.display = 'none';
  const box = document.createElement('div');
  box.id = 'fatal-panel';
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;' +
    'background:var(--bg);color:var(--text);font-family:var(--font)';
  box.innerHTML = '<div style="max-width:440px;width:100%">' +
    '<div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(140deg,var(--accent),var(--accent-2));margin-bottom:16px"></div>' +
    '<h1 style="font-size:19px;margin:0 0 8px;letter-spacing:-.02em">Algo deu errado ao iniciar</h1>' +
    '<p style="color:var(--text-2);font-size:13px;margin:0 0 16px">Seus dados continuam salvos. ' +
    'Recarregue para tentar novamente — se o erro repetir, limpe o cache do sistema.</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button id="fatal-reload" class="btn primary" style="font:inherit">Recarregar</button>' +
    '<button id="fatal-reset" class="btn" style="font:inherit">Limpar cache e recarregar</button></div>' +
    (detail ? '<p style="font-size:11.5px;color:var(--text-3);margin:14px 0 0;word-break:break-word">' +
      String(detail).slice(0, 240).replace(/[<>]/g, '') + '</p>' : '') + '</div>';
  document.body.appendChild(box);
  box.querySelector('#fatal-reload').onclick = () => location.reload();
  box.querySelector('#fatal-reset').onclick = async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {}
    location.reload();
  };
}

/* debug overlay */
function initDebugOverlay() {
  let box = null;
  const build = () => {
    box = document.createElement('div');
    box.id = 'debug-overlay';
    box.style.cssText = 'position:fixed;right:8px;bottom:calc(var(--dock-h) + 20px);z-index:9500;' +
      'font:10px/1.5 ui-monospace,monospace;padding:6px 9px;border-radius:8px;background:rgba(0,0,0,.62);' +
      'color:#9fe8b8;pointer-events:none;white-space:pre;border:1px solid rgba(255,255,255,.12)';
    document.body.append(box);
  };
  if (store.get('debug', false)) build();
  window.addEventListener('lumin:debug', (e) => {
    if (e.detail.on && !box) build();
    if (!e.detail.on && box) { box.remove(); box = null; }
  });
  let frames = 0, last = performance.now(), fps = 0;
  const loop = (t) => {
    frames++;
    if (t - last >= 1000) { fps = frames; frames = 0; last = t;
      if (box) box.textContent = `fps ${fps}\njanelas ${document.querySelectorAll('.win').length}\nmem ${(performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + 'MB' : '—')}\nview ${window.innerWidth}×${window.innerHeight}`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* global error guard */
window.addEventListener('error', (e) => {
  console.warn('[LuminOS]', e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.warn('[LuminOS] promise:', e.reason);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
window.__LUMIN_OK?.();

/* PWA: instala o service worker para o sistema funcionar offline */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.update?.().catch(() => {});
    }).catch((err) => console.warn('[LuminOS] SW:', err.message));
  });
  // caminho de emergência: ?nosw=1 remove o cache e desregistra o worker
  if (new URLSearchParams(location.search).has('nosw')) {
    caches?.keys?.().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).finally(() => {
      navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister())))
        .finally(() => console.info('[LuminOS] cache e service worker removidos'));
    });
  }
}

// expose a tiny API for power users
window.LuminOS = {
  open: (id, args) => { document.dispatchEvent(new CustomEvent('lumin:open-app', { detail: { id, args } })); },
  store,
  get version() { return '1.1.0'; },
  study: {
    open: () => toggleStudyHub(true),
    close: () => toggleStudyHub(false),
    toggle: () => toggleStudyHub(),
  },
};

