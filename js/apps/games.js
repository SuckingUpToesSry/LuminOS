/* ============================================================
   LuminOS — Jogos (canvas + DOM, sem dependências)
   ============================================================ */

import { h, store, sound, rnd, pick } from '../core.js';
import { icon } from '../icons.js';
import { toast } from '../ui.js';

const SCORES = 'games.scores';
const best = (id) => store.get(SCORES, {})[id] || 0;
function setBest(id, v) {
  const s = store.get(SCORES, {});
  if (v > (s[id] || 0)) { s[id] = v; store.set(SCORES, s); return true; }
  return false;
}

/* ── catalogue ───────────────────────────────────────────── */
const GAMES = [
  { id: 'snake', name: 'Serpente', emoji: '🐍', desc: 'Coma e cresça sem se morder', mount: mountSnake },
  { id: 'memory', name: 'Memória', emoji: '🧠', desc: 'Encontre os pares', mount: mountMemory },
  { id: 'ttt', name: 'Jogo da Velha', emoji: '⭕', desc: 'Você contra a IA', mount: mountTTT },
  { id: '2048', name: '2048', emoji: '🔢', desc: 'Junte números iguais', mount: mount2048 },
  { id: 'reaction', name: 'Reflexo', emoji: '⚡', desc: 'Clique o mais rápido possível', mount: mountReaction },
  { id: 'mines', name: 'Campo Minado', emoji: '💣', desc: '9×9 com 10 minas', mount: mountMines },
  { id: 'simon', name: 'Simon', emoji: '🎵', desc: 'Repita a sequência de cores', mount: mountSimon },
];

export const gamesApp = {
  id: 'games', name: 'Jogos', glyph: 'game', grad: ['#4ade80', '#14b8a6'],
  size: { w: 700, h: 560 }, category: 'Mídia', dock: true, desktop: true, singleton: true,
  mount(body, api) {
    body.innerHTML = '';
    const wrap = h('div.games');
    const bar = h('div.app-toolbar');
    const main = h('div.app-main');
    const title = h('b', { text: 'Jogos' });
    const back = h('button.btn.subtle', { html: icon('chevL') + ' Voltar', hidden: true });
    bar.append(title, h('span.grow'), h('span.chip', { html: icon('star') + ' Recordes salvos' }));
    wrap.append(bar, main);
    body.append(wrap);

    function showGrid() {
      back.hidden = true;
      title.textContent = 'Jogos';
      main.innerHTML = '';
      const grid = h('div.games-grid');
      GAMES.forEach((g) => {
        const card = h('button.game-card', {},
          h('div.art', { text: g.emoji }),
          h('div.meta', {}, h('b', { text: g.name }), h('span', { text: `Recorde: ${best(g.id) || '—'}` })));
        card.onclick = () => play(g);
        grid.append(card);
      });
      main.append(grid, h('div.tiny', { style: { padding: '0 16px 18px' }, text: 'Todos os jogos rodam offline, direto no navegador. Progresso salvo localmente.' }));
    }

    function play(g) {
      back.hidden = false;
      title.textContent = g.name;
      main.innerHTML = '';
      const stage = h('div.game-stage');
      main.append(stage);
      try {
        g.mount(stage, {
          setBest: (v) => { if (setBest(g.id, v)) toast(`Novo recorde: ${v}`, { kind: 'ok' }); },
          onClose: (fn) => api?.onClose?.(fn),
        });
      }
      catch (e) { stage.append(h('.empty', {}, h('b', { text: 'Erro ao iniciar o jogo' }), h('p', { text: String(e) }))); }
    }

    back.onclick = showGrid;
    api?.onArgs?.((a) => { if (a?.game) { const g = GAMES.find((x) => x.id === a.game); if (g) play(g); } });
    showGrid();
    return {};
  },
};

/* ══════════════════ SNAKE ══════════════════ */
function mountSnake(stage, app = {}) {
  const size = 20, cell = 17;
  const canvas = h('canvas', { width: size * cell, height: size * cell });
  const hud = h('div.game-hud', {}, h('span', {}, 'Pontos ', h('b', { id: 'sk-score', text: '0' })),
    h('span', {}, 'Recorde ', h('b', { text: String(best('snake') || 0) })));
  const hint = h('div.game-hint', { text: 'Setas ou WASD para mover · Espaço para pausar' });
  stage.append(h('div.game-canvas-wrap', {}, hud, canvas, hint));
  const ctx = canvas.getContext('2d');

  let snake, dir, next, food, score, alive, paused, timer;
  const reset = () => {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 }; next = { ...dir };
    score = 0; alive = true; paused = false;
    placeFood();
    hud.querySelector('b').textContent = '0';
    clearInterval(timer);
    timer = setInterval(tick, 118);
    draw();
  };
  function placeFood() {
    do { food = { x: Math.floor(rnd(0, size)), y: Math.floor(rnd(0, size)) }; }
    while (snake.some((s) => s.x === food.x && s.y === food.y));
  }
  function tick() {
    if (!alive || paused) return;
    dir = next;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || snake.some((s) => s.x === head.x && s.y === head.y)) return die();
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10; sound.tone({ freq: 700, dur: .07, gain: .07, type: 'square' });
      hud.querySelector('b').textContent = score;
      placeFood();
    } else snake.pop();
    draw();
  }
  function die() {
    alive = false; clearInterval(timer);
    sound.error();
    const isBest = setBest('snake', score);
    stage.append(h('div.game-over', {}, h('.card', {},
      h('b', { text: 'Fim de jogo' }),
      h('p', { text: `Pontuação: ${score}${isBest ? ' · novo recorde! 🎉' : ''}` }),
      h('button.btn.primary', { text: 'Jogar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); reset(); } }))));
  }
  function draw() {
    const cs = getComputedStyle(document.body);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = cs.getPropertyValue('--surface-2') || '#191d26';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // grid
    ctx.strokeStyle = 'rgba(128,128,128,.09)'; ctx.lineWidth = 1;
    for (let i = 1; i < size; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke();
    }
    const accent = cs.getPropertyValue('--accent').trim() || '#6f8bff';
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * .3, 0, Math.PI * 2);
    ctx.fill();
    snake.forEach((s, i) => {
      ctx.globalAlpha = 1 - i / (snake.length + 6);
      ctx.fillStyle = accent;
      roundRect(ctx, s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3, 4);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function roundRect(c, x, y, w, hh, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r);
    c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  const key = (e) => {
    const k = e.key.toLowerCase();
    const map = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
    if (map[k]) {
      e.preventDefault();
      const [x, y] = map[k];
      if (x !== -dir.x || y !== -dir.y) next = { x, y };
    }
    if (k === ' ') { e.preventDefault(); paused = !paused; }
  };
  window.addEventListener('keydown', key);
  if (app.onClose) app.onClose(() => { clearInterval(timer); window.removeEventListener('keydown', key); });
  reset();
}

/* ══════════════════ MEMORY ══════════════════ */
function mountMemory(stage) {
  const EMO = ['🌙', '⭐', '🔥', '🌊', '🍀', '🎈', '💎', '🎧'];
  let deck = [], openI = [], matched = 0, moves = 0, timer = null, secs = 0;
  const grid = h('div.gg-grid');
  const hud = h('div.game-hud', {},
    h('span', {}, 'Jogadas ', h('b', { id: 'mem-moves', text: '0' })),
    h('span', {}, 'Tempo ', h('b', { id: 'mem-time', text: '0s' })),
    h('span', {}, 'Recorde ', h('b', { text: (best('memory') || 0) + ' jogadas' })));
  stage.append(h('div.game-canvas-wrap', {}, hud, grid));

  function start() {
    deck = [...EMO, ...EMO].map((e, i) => ({ e, i, up: false, done: false }))
      .sort(() => Math.random() - .5);
    openI = []; matched = 0; moves = 0; secs = 0;
    clearInterval(timer);
    timer = setInterval(() => { secs++; const t = document.getElementById('mem-time'); if (t) t.textContent = secs + 's'; }, 1000);
    render();
  }
  function render() {
    grid.innerHTML = '';
    deck.forEach((c, i) => {
      const up = c.up || c.done;
      const el = h('button.gg-card', { class: up ? 'up' : '', text: up ? c.e : '' });
      el.onclick = () => flip(i);
      grid.append(el);
    });
  }
  function flip(i) {
    const c = deck[i];
    if (c.up || c.done || openI.length >= 2) return;
    c.up = true; openI.push(i);
    sound.tone({ freq: 520 + openI.length * 120, dur: .07, gain: .06 });
    render();
    if (openI.length === 2) {
      moves++;
      const m = document.getElementById('mem-moves'); if (m) m.textContent = moves;
      const [a, b] = openI.map((x) => deck[x]);
      if (a.e === b.e && a.i !== b.i) {
        a.done = b.done = true; a.up = b.up = false; openI = []; matched++;
        sound.ok();
        render();
        if (matched === EMO.length) win();
      } else {
        setTimeout(() => {
          a.up = b.up = false; openI = []; render();
          sound.tone({ freq: 220, dur: .09, gain: .05, type: 'square' });
        }, 620);
      }
    }
  }
  function win() {
    clearInterval(timer);
    const isBest = moves < (best('memory') || 999);
    if (isBest) setBest('memory', moves);
    stage.append(h('div.game-over', {}, h('.card', {},
      h('b', { text: 'Você venceu! 🎉' }),
      h('p', { text: `${moves} jogadas em ${secs}s${isBest ? ' · novo recorde!' : ''}` }),
      h('button.btn.primary', { text: 'Jogar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); start(); } }))));
  }
  start();
}

/* ══════════════════ TIC TAC TOE ══════════════════ */
function mountTTT(stage) {
  let board, turn, over;
  const grid = h('div.ttt-grid');
  const status = h('div.game-hud', {}, h('b', { text: 'Sua vez' }),
    h('span.chip', { text: 'Você = ×  ·  IA = ○' }));
  stage.append(h('div.game-canvas-wrap', {}, status, grid,
    h('div.game-hint', { text: 'Você joga com ×. A IA joga com ○.' })));

  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winner = (b) => {
    for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line: [a, c, d] };
    return b.every(Boolean) ? { p: 'draw' } : null;
  };
  function start() {
    board = Array(9).fill(''); turn = 'X'; over = false;
    status.querySelector('b').textContent = 'Sua vez';
    render();
  }
  function render(winLine = []) {
    grid.innerHTML = '';
    board.forEach((v, i) => {
      const el = h('button.ttt-cell', { class: winLine.includes(i) ? 'win' : '', text: v });
      el.onclick = () => play(i);
      grid.append(el);
    });
  }
  function play(i) {
    if (over || board[i] || turn !== 'X') return;
    board[i] = 'X'; sound.click();
    check(); if (over) return;
    turn = 'O';
    status.querySelector('b').textContent = 'IA pensando…';
    setTimeout(ai, 320);
  }
  function ai() {
    if (over) return;
    const empties = board.map((v, i) => v ? null : i).filter((x) => x !== null);
    // try win / block / center / corner / random
    let move = null;
    for (const p of ['O', 'X']) {
      for (const i of empties) {
        const b2 = [...board]; b2[i] = p;
        if (winner(b2)?.p === p) { move = i; break; }
      }
      if (move != null) break;
    }
    if (move == null && !board[4]) move = 4;
    if (move == null) { const c = [0, 2, 6, 8].filter((i) => !board[i]); if (c.length) move = pick(c); }
    if (move == null) move = pick(empties);
    board[move] = 'O'; sound.tone({ freq: 380, dur: .08, gain: .06 });
    turn = 'X';
    if (!check()) status.querySelector('b').textContent = 'Sua vez';
    render();
  }
  function check() {
    const w = winner(board);
    if (!w) { render(); return false; }
    over = true;
    render(w.line || []);
    const txt = w.p === 'draw' ? 'Empate!' : w.p === 'X' ? 'Você venceu! 🎉' : 'A IA venceu 😅';
    status.querySelector('b').textContent = txt;
    if (w.p === 'X') { sound.ok(); setBest('ttt', (best('ttt') || 0) + 1); } else sound.error();
    setTimeout(() => {
      if (!stage.isConnected) return;
      stage.append(h('div.game-over', {}, h('.card', {}, h('b', { text: txt }),
        h('button.btn.primary', { text: 'Jogar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); start(); } }))));
    }, 380);
    return true;
  }
  start();
}

/* ══════════════════ 2048 ══════════════════ */
function mount2048(stage, app = {}) {
  let grid, score;
  const board = h('div', { style: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 62px)', gap: '7px',
    background: 'var(--surface-2)', padding: '8px', borderRadius: '12px', border: '1px solid var(--line)' } });
  const hud = h('div.game-hud', {}, h('span', {}, 'Pontos ', h('b', { text: '0' })),
    h('span', {}, 'Recorde ', h('b', { text: String(best('2048') || 0) })));
  const hint = h('div.game-hint', { text: 'Setas ou WASD para deslizar · o objetivo é chegar a 2048' });
  stage.append(h('div.game-canvas-wrap', {}, hud, board, hint));

  const COLORS = { 2: '#7c8598', 4: '#71809c', 8: '#6c8fbf', 16: '#6a9fd6', 32: '#5fa8d8',
    64: '#4fb2c9', 128: '#3fbca8', 256: '#38c08a', 512: '#4fc26a', 1024: '#8fc94a', 2048: '#e0b23a' };

  const start = () => {
    grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    score = 0; addTile(); addTile(); render();
  };
  function addTile() {
    const free = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = pick(free);
    grid[r][c] = Math.random() < .9 ? 2 : 4;
  }
  function render() {
    board.innerHTML = '';
    hud.querySelector('b').textContent = score;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = grid[r][c];
      board.append(h('div', {
        style: {
          height: '62px', borderRadius: '9px', display: 'grid', placeItems: 'center',
          fontSize: v >= 1024 ? '17px' : v >= 128 ? '20px' : '23px', fontWeight: '600',
          background: v ? COLORS[v] || '#e0b23a' : 'var(--surface-3)',
          color: v ? '#fff' : 'transparent', transition: 'background .12s',
        }, text: v || '·',
      }));
    }
  }
  function slide(row) {
    const nz = row.filter(Boolean);
    const out = [];
    for (let i = 0; i < nz.length; i++) {
      if (nz[i] === nz[i + 1]) { out.push(nz[i] * 2); score += nz[i] * 2; i++; }
      else out.push(nz[i]);
    }
    while (out.length < 4) out.push(0);
    return out;
  }
  function move(dir) {
    const before = JSON.stringify(grid);
    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < 4; r++) {
        let row = grid[r].slice();
        if (dir === 'right') row.reverse();
        row = slide(row);
        if (dir === 'right') row.reverse();
        grid[r] = row;
      }
    } else {
      for (let c = 0; c < 4; c++) {
        let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        if (dir === 'down') col.reverse();
        col = slide(col);
        if (dir === 'down') col.reverse();
        for (let r = 0; r < 4; r++) grid[r][c] = col[r];
      }
    }
    if (JSON.stringify(grid) !== before) {
      addTile(); render();
      sound.tone({ freq: 300, dur: .05, gain: .04 });
      if (score > (best('2048') || 0)) setBest('2048', score);
      if (grid.flat().includes(2048) && !grid._won) {
        grid._won = true;
        toast('Você chegou a 2048! 🏆', { kind: 'ok' });
        sound.ok();
      }
      if (isOver()) {
        stage.append(h('div.game-over', {}, h('.card', {}, h('b', { text: 'Sem jogadas!' }),
          h('p', { text: `Pontuação: ${score}` }),
          h('button.btn.primary', { text: 'Jogar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); start(); } }))));
      }
    }
  }
  function isOver() {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
    return true;
  }
  const key = (e) => {
    const map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    const m = map[e.key.toLowerCase()];
    if (m) { e.preventDefault(); move(m); }
  };
  window.addEventListener('keydown', key);
  if (app.onClose) app.onClose(() => window.removeEventListener('keydown', key));
  start();
}

/* ══════════════════ REACTION ══════════════════ */
function mountReaction(stage) {
  const pad = h('div', {
    style: { width: '280px', height: '200px', borderRadius: '16px', display: 'grid', placeItems: 'center',
      cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--surface-3)',
      fontSize: '13px', textAlign: 'center', padding: '14px', transition: 'background .1s', userSelect: 'none' },
  });
  const hud = h('div.game-hud', {}, h('span', {}, 'Recorde ', h('b', { text: (best('reaction') || '—') + (best('reaction') ? ' ms' : '') })));
  stage.append(h('div.game-canvas-wrap', {}, hud, pad, h('div.game-hint', { text: 'Clique assim que a tela ficar verde.' })));

  let state = 'idle', t0 = 0, timeout = null;
  const paint = (bg, txt) => { pad.style.background = bg; pad.textContent = txt; };
  function reset() { state = 'idle'; paint('var(--surface-3)', 'Clique para começar'); }
  pad.onclick = () => {
    if (state === 'idle') {
      state = 'wait'; paint('var(--surface-3)', 'Espere…');
      timeout = setTimeout(() => { state = 'go'; t0 = performance.now(); paint('var(--ok)', 'CLIQUE!'); sound.tone({ freq: 900, dur: .06, gain: .08 }); }, rnd(900, 2600));
    } else if (state === 'wait') {
      clearTimeout(timeout);
      paint('var(--danger)', 'Cedo demais! Clique para tentar de novo');
      sound.error(); state = 'idle';
      setTimeout(reset, 900);
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - t0);
      state = 'idle';
      paint('var(--surface-3)', `${ms} ms — clique para jogar de novo`);
      if (!best('reaction') || ms < best('reaction')) { setBest('reaction', ms); toast(`Novo recorde: ${ms} ms`, { kind: 'ok' }); sound.ok(); }
      else sound.click();
      hud.querySelector('b').textContent = best('reaction') + ' ms';
    }
  };
  reset();
}

/* ══════════════════ MINESWEEPER ══════════════════ */
function mountMines(stage) {
  const N = 9, MINES = 10;
  let cells, over, flags, revealed;
  const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${N},32px)`, gap: '3px' } });
  const hud = h('div.game-hud', {}, h('span', {}, 'Minas ', h('b', { text: String(MINES) })),
    h('span', {}, 'Bandeiras ', h('b', { id: 'ms-flags', text: '0' })));
  stage.append(h('div.game-canvas-wrap', {}, hud, grid,
    h('div.game-hint', { text: 'Clique para revelar · clique com o botão direito para marcar 💣' })));

  function start() {
    cells = Array.from({ length: N * N }, () => ({ mine: false, open: false, flag: false, n: 0 }));
    over = false; flags = 0; revealed = 0;
    let placed = 0;
    while (placed < MINES) { const i = Math.floor(rnd(0, N * N)); if (!cells[i].mine) { cells[i].mine = true; placed++; } }
    cells.forEach((c, i) => { if (!c.mine) c.n = neigh(i).filter((j) => cells[j].mine).length; });
    render();
  }
  const neigh = (i) => {
    const r = Math.floor(i / N), c = i % N, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
    }
    return out;
  };
  function render() {
    grid.innerHTML = '';
    const colors = ['', 'var(--accent)', '#3ecf8e', '#f5b955', '#f0709a', '#b07bff', '#2fb8d9', '#8b91a0', '#ff6b6b'];
    cells.forEach((c, i) => {
      const bg = c.open ? (c.mine ? 'var(--danger)' : 'var(--surface-3)') : 'var(--surface-2)';
      const el = h('button', {
        style: { width: '32px', height: '32px', borderRadius: '6px', background: bg, border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: '600', color: c.open && c.n ? colors[c.n] : 'var(--text)' },
        text: c.open ? (c.mine ? '💣' : c.n || '') : (c.flag ? '🚩' : ''),
      });
      el.onclick = () => reveal(i);
      el.oncontextmenu = (e) => { e.preventDefault(); flag(i); };
      grid.append(el);
    });
    const f = document.getElementById('ms-flags'); if (f) f.textContent = flags;
  }
  function flag(i) {
    if (over || cells[i].open) return;
    cells[i].flag = !cells[i].flag;
    flags += cells[i].flag ? 1 : -1;
    sound.click(); render();
  }
  function reveal(i) {
    if (over || cells[i].open || cells[i].flag) return;
    const c = cells[i];
    c.open = true;
    if (c.mine) return lose();
    revealed++;
    sound.tone({ freq: 480, dur: .04, gain: .04 });
    if (!c.n) neigh(i).forEach((j) => { if (!cells[j].open) reveal(j); });
    render();
    if (revealed === N * N - MINES) win();
  }
  function lose() {
    over = true; cells.forEach((c) => { if (c.mine) c.open = true; });
    render(); sound.error();
    stage.append(h('div.game-over', {}, h('.card', {}, h('b', { text: 'Boom! 💥' }),
      h('button.btn.primary', { text: 'Tentar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); start(); } }))));
  }
  function win() {
    over = true; setBest('mines', (best('mines') || 0) + 1); sound.ok();
    stage.append(h('div.game-over', {}, h('.card', {}, h('b', { text: 'Campo limpo! 🎉' }),
      h('p', { text: 'Você encontrou todas as minas.' }),
      h('button.btn.primary', { text: 'Jogar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); start(); } }))));
  }
  start();
}

/* ══════════════════ SIMON ══════════════════ */
function mountSimon(stage) {
  const COLORS = ['#6f8bff', '#3ecf8e', '#f5b955', '#ff6b6b'];
  let seq = [], idx = 0, playing = false, round = 0;
  const pads = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,76px)', gap: '8px' } });
  const btns = COLORS.map((c) => {
    const b = h('button', { style: { width: '76px', height: '76px', borderRadius: '14px', background: c, opacity: '.55',
      border: '1px solid var(--line)', transition: 'opacity .1s, transform .1s' } });
    b.onclick = () => press(COLORS.indexOf(c));
    pads.append(b);
    return b;
  });
  const status = h('div.game-hud', {}, h('b', { text: 'Clique para começar' }),
    h('span', {}, 'Rodada ', h('b', { id: 'sm-round', text: '0' })));
  stage.append(h('div.game-canvas-wrap', {}, status, pads,
    h('div.game-hint', { text: 'Repita a sequência de cores. A cada rodada, uma cor nova.' })));

  const flash = (i, ms = 320) => {
    const b = btns[i];
    b.style.opacity = '1'; b.style.transform = 'scale(1.05)';
    sound.tone({ freq: [330, 415, 495, 620][i], dur: ms / 1000, gain: .09, type: 'triangle' });
    setTimeout(() => { b.style.opacity = '.55'; b.style.transform = ''; }, ms);
  };
  async function nextRound() {
    playing = false;
    round++;
    document.getElementById('sm-round').textContent = round;
    seq.push(Math.floor(rnd(0, 4)));
    status.querySelector('b').textContent = 'Observe…';
    for (const i of seq) { flash(i, 340); await new Promise((r) => setTimeout(r, 520)); }
    idx = 0; playing = true;
    status.querySelector('b').textContent = 'Sua vez!';
  }
  function press(i) {
    if (!playing) { if (!seq.length) nextRound(); return; }
    flash(i, 180);
    if (seq[idx] === i) {
      idx++;
      if (idx === seq.length) { playing = false; setTimeout(nextRound, 520); }
    } else {
      playing = false; sound.error();
      status.querySelector('b').textContent = `Errou! Chegou à rodada ${round}`;
      setBest('simon', round);
      stage.append(h('div.game-over', {}, h('.card', {}, h('b', { text: 'Fim! 🎵' }),
        h('p', { text: `Você chegou à rodada ${round}.` }),
        h('button.btn.primary', { text: 'Jogar de novo', onclick: (e) => { e.target.closest('.game-over').remove(); seq = []; round = 0; nextRound(); } }))));
    }
  }
}

export { GAMES as gameList };
