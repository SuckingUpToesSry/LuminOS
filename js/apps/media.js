/* ============================================================
   LuminOS — Soundboard, Música, Fotos
   ============================================================ */

import { h, store, sound, rnd, pick, uid, debounce } from '../core.js';
import { icon } from '../icons.js';
import { toast, confirmDialog } from '../ui.js';

/* ══════════════════ SOUNDBOARD ══════════════════ */
const PADS = [
  { name: 'Blip', tag: 'interface', play: () => sound.tone({ freq: 880, dur: .07, gain: .12, type: 'square', slide: -300 }) },
  { name: 'Pop', tag: 'interface', play: () => sound.tone({ freq: 420, dur: .09, gain: .16, type: 'sine', slide: 320 }) },
  { name: 'Chime', tag: 'musical', play: () => [523, 659, 784].forEach((f, i) => sound.tone({ freq: f, dur: .35, gain: .08, delay: i * .07, release: .6 })) },
  { name: 'Bass', tag: 'musical', play: () => sound.tone({ freq: 82, dur: .4, gain: .18, type: 'sawtooth', release: .5 }) },
  { name: 'Buzzer', tag: 'efeito', play: () => { sound.tone({ freq: 140, dur: .3, gain: .1, type: 'square' }); sound.tone({ freq: 146, dur: .3, gain: .1, type: 'square' }); } },
  { name: 'Coin', tag: 'jogo', play: () => { sound.tone({ freq: 988, dur: .08, gain: .1, type: 'square' }); sound.tone({ freq: 1319, dur: .18, gain: .09, type: 'square', delay: .07 }); } },
  { name: 'Jump', tag: 'jogo', play: () => sound.tone({ freq: 300, dur: .16, gain: .1, type: 'square', slide: 420 }) },
  { name: 'Laser', tag: 'jogo', play: () => sound.tone({ freq: 1400, dur: .18, gain: .07, type: 'sawtooth', slide: -1100 }) },
  { name: 'Kick', tag: 'bateria', play: () => { sound.tone({ freq: 120, dur: .18, gain: .3, type: 'sine', slide: -80, release: .22 }); } },
  { name: 'Snare', tag: 'bateria', play: () => { sound.noise({ dur: .16, gain: .16, hp: 1200 }); sound.tone({ freq: 190, dur: .1, gain: .07 }); } },
  { name: 'Hat', tag: 'bateria', play: () => sound.noise({ dur: .06, gain: .1, hp: 6000 }) },
  { name: 'Clap', tag: 'bateria', play: () => { [0, .03, .06].forEach((d) => sound.noise({ dur: .07, gain: .1, hp: 2000, delay: d })); } },
  { name: 'Sweep', tag: 'efeito', play: () => sound.tone({ freq: 200, dur: .7, gain: .08, type: 'sine', slide: 2400, release: .8 }) },
  { name: 'Alarm', tag: 'efeito', play: () => [0, .2, .4].forEach((d) => sound.tone({ freq: 740, dur: .12, gain: .1, type: 'square', delay: d })) },
  { name: 'Success', tag: 'interface', play: () => [523, 659, 784, 1046].forEach((f, i) => sound.tone({ freq: f, dur: .2, gain: .09, delay: i * .08, release: .4 })) },
  { name: 'Error', tag: 'interface', play: () => { sound.tone({ freq: 300, dur: .16, gain: .1, type: 'square' }); sound.tone({ freq: 220, dur: .24, gain: .1, type: 'square', delay: .16 }); } },
];

export const soundboardApp = {
  id: 'soundboard', name: 'Soundboard', glyph: 'sound', grad: ['#f0709a', '#ff9f7a'],
  size: { w: 660, h: 500 }, category: 'Mídia', dock: true, desktop: true, singleton: true,
  mount(body) {
    const vol = store.get('sound.volume', .5);
    sound.volume = vol;
    body.innerHTML = '';
    const wrap = h('div.sound');
    const slider = h('input', { type: 'range', min: 0, max: 100, value: Math.round(vol * 100), style: { width: '110px' } });
    slider.addEventListener('input', () => { sound.volume = slider.value / 100; store.set('sound.volume', sound.volume); });
    const bar = h('div.app-toolbar', {},
      h('span.chip.accent', { html: icon('sound') + ' Synthesizer' }),
      h('span.grow'),
      h('span.tiny', { text: 'Volume' }), slider,
      h('button.btn.subtle', { html: icon('volOff'), title: 'Parar tudo', onclick: () => toast('Sons são curtos e param sozinhos 🙂') }));
    const pads = h('div.pads');
    PADS.forEach((p) => {
      const el = h('button.pad', {},
        h('span', { html: icon('sound') }),
        h('b', { text: p.name }),
        h('span', { text: p.tag }));
      el.onclick = () => {
        p.play();
        el.classList.add('on');
        setTimeout(() => el.classList.remove('on'), 130);
      };
      pads.append(el);
    });
    wrap.append(bar, pads, h('div.tiny', { style: { padding: '0 14px 16px' },
      text: 'Todos os sons são gerados com Web Audio API — nenhum arquivo de áudio é carregado.' }));
    body.append(wrap);
    return {};
  },
};

/* ══════════════════ MUSIC (procedural) ══════════════════ */
const TRACKS = [
  { name: 'Aurora', artist: 'LuminOS Sessions', bpm: 78, scale: [0, 2, 4, 7, 9, 12, 14, 16], root: 220, emoji: '🌌' },
  { name: 'Vidro', artist: 'LuminOS Sessions', bpm: 92, scale: [0, 3, 5, 7, 10, 12, 15], root: 196, emoji: '💎' },
  { name: 'Chuva Leve', artist: 'LuminOS Sessions', bpm: 66, scale: [0, 2, 3, 7, 8, 12], root: 174, emoji: '🌧️' },
  { name: 'Nebulosa', artist: 'LuminOS Sessions', bpm: 104, scale: [0, 1, 5, 7, 8, 11, 12], root: 262, emoji: '🌫️' },
  { name: 'Pôr do Sol', artist: 'LuminOS Sessions', bpm: 84, scale: [0, 4, 7, 9, 11, 14], root: 233, emoji: '🌅' },
];

export const musicApp = {
  id: 'music', name: 'Música', glyph: 'music', grad: ['#31c9a3', '#1f8fd8'],
  size: { w: 640, h: 480 }, category: 'Mídia', dock: true, desktop: true, singleton: true,
  mount(body) {
    sound.refresh?.();
    let idx = 0, playing = false, timer = null, step = 0;
    const ctxState = { seek: 0 };

    body.innerHTML = '';
    const cover = h('div.cover.playing', { text: TRACKS[0].emoji });
    const art = h('div.music-art', {}, cover);
    const titleEl = h('h2', { text: TRACKS[0].name });
    const artistEl = h('div.artist', { text: TRACKS[0].artist });
    const bars = h('div.music-bars', {}, ...Array.from({ length: 16 }, () => h('i')));
    const timeEl = h('span', { text: '0:00' });
    const durEl = h('span', { text: '0:00' });
    const seek = h('input', { type: 'range', min: 0, max: 100, value: 0, style: { flex: '1' } });

    const bPrev = h('button.btn.icon.subtle', { html: icon('chevL'), title: 'Anterior' });
    const bPlay = h('button', { html: icon('play'), title: 'Reproduzir', class: 'main' });
    const bNext = h('button.btn.icon.subtle', { html: icon('chevR'), title: 'Próxima' });
    const bShuffle = h('button.btn.icon.subtle', { html: icon('sort'), title: 'Aleatório' });

    const info = h('div.music-info', {}, h('span.chip.accent', { text: 'Gerado ao vivo' }), titleEl, artistEl, bars,
      h('div.music-controls', {},
        h('div.music-seek', {}, timeEl, seek, durEl),
        h('div.music-btns', {}, bShuffle, bPrev, bPlay, bNext,
          h('span.grow', { style: { flex: '1' } }),
          h('span.tiny', { text: 'Web Audio' }))));

    const list = h('div.music-list');
    const top = h('div.music-top', {}, art, info);
    const wrap = h('div.music', {}, top, list);
    body.append(wrap);

    function renderList() {
      list.innerHTML = '';
      TRACKS.forEach((t, i) => {
        const row = h('button.track', { class: i === idx ? 'active' : '' },
          h('span.n', { text: i === idx && playing ? '▶' : String(i + 1) }),
          h('span', { text: t.name }),
          h('span.d', { text: t.bpm + ' BPM' }));
        row.onclick = () => { idx = i; if (!playing) toggle(); else start(); };
        list.append(row);
      });
    }

    /* procedural sequencer */
    function start() {
      stop();
      const t = TRACKS[idx];
      titleEl.textContent = t.name;
      artistEl.textContent = t.artist;
      cover.textContent = t.emoji;
      cover.classList.add('playing');
      bars.classList.remove('paused');
      bPlay.innerHTML = icon('pause');
      playing = true;
      step = 0;
      const beat = 60000 / t.bpm;
      const totalSteps = 64;
      durEl.textContent = fmt((beat * totalSteps / 2) / 1000);
      cover._t0 = Date.now();
      timer = setInterval(() => {
        const t2 = TRACKS[idx];
        // melody note
        const oct = Math.random() < .25 ? 2 : 1;
        const semi = t2.scale[step % t2.scale.length];
        const freq = t2.root * Math.pow(2, semi / 12) * oct;
        sound.tone({ freq, dur: .55, gain: .075, type: 'triangle', release: 1.1, attack: .02 });
        // bass every 4 steps
        if (step % 4 === 0) sound.tone({ freq: t2.root / 2, dur: .8, gain: .07, type: 'sine', release: 1.3 });
        // hat
        if (step % 2 === 0) sound.noise({ dur: .04, gain: .028, hp: 7000 });
        if (step % 8 === 4) sound.noise({ dur: .12, gain: .05, hp: 1800 });
        step = (step + 1) % totalSteps;
        const elapsed = (Date.now() - cover._t0) / 1000;
        timeEl.textContent = fmt(elapsed);
        seek.value = Math.min(100, (elapsed / (beat * totalSteps / 2 / 1000)) * 100);
        if (elapsed >= beat * totalSteps / 2 / 1000) next();
      }, (60000 / t.bpm) / 2);
      renderList();
    }
    function stop() {
      clearInterval(timer); timer = null; playing = false;
      bPlay.innerHTML = icon('play');
      bars.classList.add('paused');
      cover.classList.remove('playing');
    }
    function toggle() { playing ? stop() : start(); }
    function next() { idx = (idx + 1) % TRACKS.length; start(); }
    function prev() { idx = (idx - 1 + TRACKS.length) % TRACKS.length; start(); }

    bPlay.onclick = toggle;
    bNext.onclick = next;
    bPrev.onclick = prev;
    bShuffle.onclick = () => { idx = Math.floor(Math.random() * TRACKS.length); start(); };
    seek.addEventListener('change', () => {
      if (!playing) return;
      const t = TRACKS[idx];
      const total = (60000 / t.bpm * 64 / 2) / 1000;
      cover._t0 = Date.now() - (seek.value / 100) * total * 1000;
    });
    // desenha barras com alturas
    [...bars.children].forEach((b) => { b.style.height = Math.round(rnd(25, 100)) + '%'; b.style.animationDelay = rnd(0, .6) + 's'; });
    renderList();

    // cleanup when window closes
    const obs = new MutationObserver(() => {
      if (!wrap.isConnected) { stop(); obs.disconnect(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    return {
      onClose() { stop(); },
    };
  },
};

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ══════════════════ PHOTOS ══════════════════ */
export const photosApp = {
  id: 'photos', name: 'Fotos', glyph: 'photo', grad: ['#f2b75a', '#f0709a'],
  size: { w: 760, h: 540 }, category: 'Mídia', dock: true, desktop: true, singleton: true,
  mount(body) {
    const KEY = 'photos.items';
    let photos = store.get(KEY, []);
    body.innerHTML = '';
    const wrap = h('div.photos');
    const grid = h('div.photo-grid');
    const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    const status = h('div.app-status');

    const updateStatus = () => {
      status.innerHTML = '';
      status.append(h('span', { text: `${photos.length} imagem${photos.length === 1 ? '' : 's'}` }),
        h('span', { text: '· salvas no navegador' }),
        h('span.grow', { style: { flex: '1' } }),
        h('span', { text: 'Clique numa foto para ampliar' }));
    };

    const addBtn = h('button.btn.primary', { html: icon('plus') + ' Adicionar', onclick: () => fileInput.click() });
    const bar = h('div.app-toolbar', {}, addBtn,
      h('button.btn.subtle', { html: icon('image') + ' Papel de parede', onclick: setWallpaperHint }),
      h('span.grow'),
      h('button.btn.subtle.icon', { html: icon('trash'), title: 'Limpar tudo', onclick: clearAll }));
    wrap.append(bar, grid, status, fileInput);
    body.append(wrap);

    function setWallpaperHint() { toast('Abra uma foto e use “Papel de parede”.'); }

    function render() {
      grid.innerHTML = '';
      if (!photos.length) {
        grid.append(h('div.empty', { style: { gridColumn: '1/-1' } },
          h('div.big', { text: '🖼️' }), h('b', { text: 'Nenhuma foto ainda' }),
          h('p', { text: 'Adicione imagens do seu computador. Elas ficam salvas apenas no seu navegador.' }),
          h('button.btn.primary', { html: icon('plus') + ' Escolher imagens', onclick: () => fileInput.click(), style: { marginTop: '8px' } })));
      }
      photos.forEach((p, i) => {
        const el = h('div.photo', {},
          h('img', { src: p.data, alt: p.name, loading: 'lazy' }),
          h('button.rm', { html: icon('x'), title: 'Remover', onclick: (e) => { e.stopPropagation(); remove(i); } }));
        el.onclick = () => lightbox(i);
        grid.append(el);
      });
      updateStatus();
    }

    function lightbox(i) {
      const p = photos[i];
      const lb = h('div.lightbox', {},
        h('div.lb-bar', {},
          h('button', { html: icon('image'), title: 'Usar como papel de parede', onclick: () => {
            import('../desktop.js').then(({ setWallpaper }) => { setWallpaper(p.data); toast('Papel de parede atualizado', { kind: 'ok' }); lb.remove(); });
          } }),
          h('button', { html: icon('download'), title: 'Baixar', onclick: () => {
            const a = h('a', { href: p.data, download: p.name }); a.click();
          } }),
          h('button', { html: icon('x'), title: 'Fechar', onclick: () => lb.remove() })),
        h('img', { src: p.data, alt: p.name }));
      lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });
      body.append(lb);
    }

    function remove(i) {
      photos.splice(i, 1); store.set(KEY, photos); render();
    }
    function clearAll() {
      if (!photos.length) return;
      confirmDialog({ title: 'Apagar todas as fotos?', text: `${photos.length} imagens serão removidas.`, danger: true, ok: 'Apagar', onOk: () => { photos = []; store.set(KEY, []); render(); } });
    }

    fileInput.onchange = async () => {
      const files = [...fileInput.files];
      for (const f of files) {
        if (f.size > 2.2 * 1024 * 1024) { toast(`${f.name} é grande demais (máx. 2 MB)`, { kind: 'err' }); continue; }
        const data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
        photos.unshift({ id: uid('p'), name: f.name, data, ts: Date.now() });
      }
      store.set(KEY, photos);
      render();
      if (files.length) { toast(`${files.length} foto(s) adicionada(s)`, { kind: 'ok' }); sound.ok(); }
      fileInput.value = '';
    };

    render();
    return {};
  },
};

