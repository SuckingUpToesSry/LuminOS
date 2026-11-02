/* ============================================================
   LuminOS — Chat local, Relógio, Calendário
   ============================================================ */

import { h, store, uid, pad, fmtTime, pick, rnd, sound } from '../core.js';
import { icon } from '../icons.js';
import { toast, promptDialog } from '../ui.js';

/* ══════════════════ CHAT ══════════════════ */
const BOTS = [
  { name: 'Aurora', color: '#8b6cff', lines: ['alguém aí?', 'esse desktop ficou lindo', 'bom dia a todos ☀️', 'testando o chat global', 'quem curte synthwave?'] },
  { name: 'Kai', color: '#2fb8d9', lines: ['acabei de abrir o Terminal, recomendo', 'o jogo da serpente é viciante', 'alguma dica de música?', 'boa noite!'] },
  { name: 'Mira', color: '#3ecf8e', lines: ['as notas sincronizam sozinhas, adorei', 'testei a IA offline, funciona bem', 'alguém já usou o Paint?'] },
];

export const chatApp = {
  id: 'chat', name: 'Chat', glyph: 'chat', grad: ['#5eb0ff', '#8b6cff'],
  size: { w: 700, h: 500 }, category: 'Social', desktop: true, singleton: true,
  mount(body) {
    const KEY = 'chat.rooms';
    let rooms = store.get(KEY, null);
    if (!rooms) {
      rooms = {
        geral: { name: 'Geral', msgs: [
          { id: uid('m'), who: 'Aurora', color: '#8b6cff', text: 'Bem-vindo ao chat do LuminOS! 👋', ts: Date.now() - 600000 },
          { id: uid('m'), who: 'Kai', color: '#2fb8d9', text: 'As mensagens ficam salvas no seu navegador.', ts: Date.now() - 480000 },
        ] },
        ideias: { name: 'Ideias', msgs: [] },
        ajuda: { name: 'Ajuda', msgs: [{ id: uid('m'), who: 'Mira', color: '#3ecf8e', text: 'Pergunte qualquer coisa sobre o sistema aqui.', ts: Date.now() - 300000 }] },
      };
      store.set(KEY, rooms);
    }
    let room = 'geral';
    body.innerHTML = '';
    const wrap = h('div.chat');
    const side = h('div.chat-list');
    const sideHead = h('div.notes-list-head', {}, h('b', { style: { fontSize: '11px', color: 'var(--text-3)', flex: '1' }, text: 'SALAS' }),
      h('button.btn.icon', { html: icon('plus'), title: 'Nova sala', onclick: newRoom }));
    const roomList = h('div.chat-rooms');
    side.append(sideHead, roomList);

    const main = h('div.chat-main');
    const head = h('div.chat-head');
    const msgs = h('div.chat-msgs');
    const input = h('input.input', { placeholder: 'Escreva uma mensagem…' });
    const form = h('form.chat-form', {}, input, h('button.btn.primary', { html: icon('send'), type: 'submit' }));
    main.append(head, msgs, form);
    wrap.append(side, main);
    body.append(wrap);

    function renderRooms() {
      roomList.innerHTML = '';
      Object.entries(rooms).forEach(([id, r]) => {
        const b = h('button.side-item', { class: id === room ? 'active' : '' },
          h('span', { text: '# ' }), h('span', { text: r.name }),
          h('span.badge', { text: String(r.msgs.length), style: r.msgs.length ? null : { display: 'none' } }));
        b.onclick = () => { room = id; renderRooms(); renderMsgs(); };
        b.oncontextmenu = (e) => {
          e.preventDefault();
          if (Object.keys(rooms).length <= 1) return;
          import('../ui.js').then(({ contextMenu }) => contextMenu(e, [
            { label: 'Apagar sala', icon: 'trash', danger: true, action: () => {
              delete rooms[id]; if (room === id) room = Object.keys(rooms)[0];
              store.set(KEY, rooms); renderRooms(); renderMsgs();
            } },
          ]));
        };
        roomList.append(b);
      });
    }

    function renderMsgs() {
      head.innerHTML = '';
      head.append(h('span', { html: icon('chat') }), h('b', { text: '# ' + rooms[room].name }),
        h('span.grow', { style: { flex: '1' } }),
        h('span.chip', { html: icon('users') + ' ' + new Set(rooms[room].msgs.map((m) => m.who)).size }));
      msgs.innerHTML = '';
      if (!rooms[room].msgs.length) {
        msgs.append(h('div.empty', {}, h('div.big', { text: '💬' }), h('b', { text: 'Silêncio total' }),
          h('p', { text: 'Seja o primeiro a escrever nesta sala.' })));
      }
      rooms[room].msgs.forEach((m) => {
        const me = m.who === store.get('profile.name', 'Você');
        msgs.append(h(`div.chat-msg${me ? '.mine' : ''}`, {},
          h('div.av', { style: { background: m.color || 'var(--accent)' }, text: (m.who || '?')[0] }),
          h('div.txt', {}, h('div.who', { text: m.who }),
            h('div.bb', { text: m.text }),
            h('div.who', { text: fmtTime(new Date(m.ts)) }))));
      });
      msgs.scrollTop = msgs.scrollHeight;
    }

    function save() { store.set(KEY, rooms); }

    function addMine(text) {
      const me = store.get('profile.name', 'Você');
      rooms[room].msgs.push({ id: uid('m'), who: me, color: '#6f8bff', text, ts: Date.now() });
      save(); renderRooms(); renderMsgs();
      sound.tone({ freq: 720, dur: .06, gain: .05 });
      // simulated reply
      setTimeout(() => {
        const bot = pick(BOTS);
        rooms[room].msgs.push({
          id: uid('m'), who: bot.name, color: bot.color,
          text: generateReply(text, bot), ts: Date.now(),
        });
        save();
        if (document.body.contains(msgs)) { renderRooms(); renderMsgs(); sound.notify(); }
      }, rnd(1400, 3200));
    }

    function generateReply(text, bot) {
      const t = text.toLowerCase();
      if (t.includes('?')) return pick(['boa pergunta 👀', 'acho que sim!', 'depende… o que você acha?', 'testa e me conta']);
      if (/oi|olá|ola|bom dia|boa tarde|boa noite/.test(t)) return pick(['oi! 👋', 'olá, tudo bem?', 'bom te ver por aqui']);
      if (/jogo|games|serpente/.test(t)) return pick(['o 2048 é o meu favorito', 'joguei o Simon ontem, difícil!', 'vamos jogar?']);
      return pick(bot.lines);
    }

    form.onsubmit = (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      input.value = '';
      addMine(v);
    };

    function newRoom() {
      promptDialog({ title: 'Nova sala', label: 'Nome da sala', placeholder: 'ex.: música', onOk: (name) => {
        const id = name.toLowerCase().replace(/\s+/g, '-').slice(0, 24) || uid('r');
        rooms[id] = { name, msgs: [] };
        room = id; save(); renderRooms(); renderMsgs();
      } });
    }

    renderRooms(); renderMsgs();
    setTimeout(() => input.focus(), 80);
    return {};
  },
};

/* ══════════════════ CLOCK ══════════════════ */
export const clockApp = {
  id: 'clock', name: 'Relógio', glyph: 'clock', grad: ['#8b93a7', '#5f6a80'],
  size: { w: 400, h: 520 }, category: 'Utilidades', desktop: true, singleton: true,
  mount(body) {
    body.innerHTML = '';
    const face = h('div.clock-face');
    for (let i = 0; i < 12; i++) {
      face.append(h('div.tick', { style: { transform: `rotate(${i * 30}deg)` } }));
    }
    const hh = h('div.h'), mm = h('div.m'), ss = h('div.s'), pin = h('div.pin');
    face.append(hh, mm, ss, pin);
    const digital = h('div', { style: { textAlign: 'center', fontSize: '20px', fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' } });
    const dateEl = h('div.tiny', { style: { textAlign: 'center', marginTop: '2px' } });

    const world = h('div.world');
    const zones = [['São Paulo', 'America/Sao_Paulo'], ['Londres', 'Europe/London'], ['Nova York', 'America/New_York'], ['Tóquio', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney']];
    const rows = zones.map(([name, tz]) => {
      const time = h('span', { text: '--:--' });
      world.append(h('div.world-row', {}, h('b', { text: name }), time));
      return { tz, time };
    });

    /* stopwatch */
    const sw = h('div.timer-disp', { text: '00:00.0' });
    let swStart = 0, swElapsed = 0, swTimer = null, swRunning = false;
    const swBtn = h('button.btn.primary', { html: icon('play') + ' Iniciar' });
    const swReset = h('button.btn', { html: icon('refresh') + ' Zerar' });

    const tabs = h('div', { style: { display: 'flex', gap: '4px', padding: '0 14px 10px' } });
    const panels = { clock: h('div', {}, h('div.analog', {}, face), digital, dateEl, world),
      stopwatch: h('div.timer-box', {}, sw, h('div.timer-row', {}, swBtn, swReset),
        h('p.tiny', { style: { textAlign: 'center' }, text: 'Cronômetro com precisão de 0,1 s.' })) };
    const t1 = h('button.chip.accent', { text: 'Relógio' });
    const t2 = h('button.chip', { text: 'Cronômetro' });
    tabs.append(t1, t2);
    const host = h('div', { style: { flex: '1', overflow: 'auto' } });
    body.append(h('div.clock-app', {}, tabs, host));

    function showTab(k) {
      host.innerHTML = '';
      host.append(panels[k]);
      t1.className = 'chip' + (k === 'clock' ? ' accent' : '');
      t2.className = 'chip' + (k === 'stopwatch' ? ' accent' : '');
    }
    t1.onclick = () => showTab('clock');
    t2.onclick = () => showTab('stopwatch');
    showTab('clock');

    const fmtSW = (ms) => {
      const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, d = Math.floor(ms / 100) % 10;
      return `${pad(m)}:${pad(s)}.${d}`;
    };
    swBtn.onclick = () => {
      if (swRunning) {
        clearInterval(swTimer); swRunning = false;
        swElapsed = Date.now() - swStart;
        swBtn.innerHTML = icon('play') + ' Continuar';
      } else {
        swStart = Date.now() - swElapsed; swRunning = true;
        swBtn.innerHTML = icon('pause') + ' Parar';
        swTimer = setInterval(() => { sw.textContent = fmtSW(Date.now() - swStart); }, 83);
      }
    };
    swReset.onclick = () => {
      clearInterval(swTimer); swRunning = false; swElapsed = 0;
      sw.textContent = '00:00.0'; swBtn.innerHTML = icon('play') + ' Iniciar';
    };

    const tick = () => {
      const d = new Date();
      const s = d.getSeconds(), m = d.getMinutes(), hh24 = d.getHours();
      ss.style.transform = `rotate(${s * 6}deg)`;
      mm.style.transform = `rotate(${m * 6 + s * .1}deg)`;
      hh.style.transform = `rotate(${(hh24 % 12) * 30 + m * .5}deg)`;
      digital.textContent = fmtTime(d, true);
      dateEl.textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      rows.forEach((r) => {
        try {
          r.time.textContent = d.toLocaleTimeString('pt-BR', { timeZone: r.tz, hour: '2-digit', minute: '2-digit' });
        } catch { r.time.textContent = '—'; }
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    const obs = new MutationObserver(() => { if (!host.isConnected) { clearInterval(iv); clearInterval(swTimer); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
    return {};
  },
};

/* ══════════════════ CALENDAR ══════════════════ */
export const calendarApp = {
  id: 'calendar', name: 'Calendário', glyph: 'calendar', grad: ['#f0709a', '#f5b955'],
  size: { w: 620, h: 560 }, category: 'Utilidades', desktop: true, singleton: true,
  mount(body) {
    const KEY = 'calendar.events';
    let events = store.get(KEY, {});
    let view = new Date();
    body.innerHTML = '';

    const head = h('div.cal-head');
    const grid = h('div.cal-month');
    const addRow = h('div.cal-add');
    const bodyEl = h('div.cal-body', {}, grid);
    body.append(h('div.cal-app', {}, head, bodyEl, addRow));

    function keyOf(d) { return d.toISOString().slice(0, 10); }

    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      head.innerHTML = '';
      head.append(
        h('button.btn.subtle.icon', { html: icon('chevL'), onclick: () => { view = new Date(y, m - 1, 1); render(); } }),
        h('b', { text: view.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }),
        h('button.btn.subtle.icon', { html: icon('chevR'), onclick: () => { view = new Date(y, m + 1, 1); render(); } }),
        h('button.btn.subtle', { text: 'Hoje', onclick: () => { view = new Date(); render(); } }),
        h('span.grow', { style: { flex: '1' } }),
        h('span.tiny', { text: `${Object.values(events).flat().length} eventos` }));

      grid.innerHTML = '';
      ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].forEach((d) => grid.append(h('div.dw', { text: d })));
      const first = new Date(y, m, 1);
      const start = new Date(first);
      start.setDate(1 - first.getDay());
      const today = keyOf(new Date());
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const k = keyOf(d);
        const out = d.getMonth() !== m;
        const cell = h('div.cell', { class: `${out ? 'out' : ''} ${k === today ? 'today' : ''}` },
          h('span.dn', { text: String(d.getDate()) }));
        (events[k] || []).slice(0, 2).forEach((ev) => cell.append(h('div.ev', { text: ev.title })));
        if ((events[k] || []).length > 2) cell.append(h('span.tiny', { text: `+${events[k].length - 2}` }));
        cell.onclick = () => {
          promptDialog({ title: `Evento em ${d.toLocaleDateString('pt-BR')}`, label: 'O que acontece?', placeholder: 'Reunião às 14h', onOk: (title) => {
            events[k] = [...(events[k] || []), { id: uid('ev'), title, ts: Date.now() }];
            store.set(KEY, events);
            render();
            toast('Evento adicionado', { kind: 'ok' });
          } });
        };
        cell.oncontextmenu = (e) => {
          if (!(events[k] || []).length) return;
          e.preventDefault();
          import('../ui.js').then(({ contextMenu }) => contextMenu(e, [
            ...(events[k] || []).map((ev, i) => ({ label: '✓ ' + ev.title, action: () => { delete events[k][i]; store.set(KEY, events); render(); } })),
            ...(events[k]?.length ? [{ sep: true }, { label: 'Limpar dia', icon: 'trash', danger: true, action: () => { delete events[k]; store.set(KEY, events); render(); } }] : []),
          ]));
        };
        grid.append(cell);
      }
      sound.click;
    }

    addRow.append(
      h('input.input', { placeholder: 'Novo evento…', onkeydown: (e) => {
        if (e.key !== 'Enter') return;
        const v = e.target.value.trim();
        if (!v) return;
        const k = keyOf(new Date());
        events[k] = [...(events[k] || []), { id: uid('ev'), title: v, ts: Date.now() }];
        store.set(KEY, events);
        e.target.value = '';
        render();
        toast('Evento adicionado', { kind: 'ok' });
      } }),
      h('button.btn.primary', { html: icon('plus') + ' Hoje', onclick: () => {
        const inp = addRow.querySelector('input');
        const v = inp.value.trim();
        if (!v) return;
        const k = keyOf(new Date());
        events[k] = [...(events[k] || []), { id: uid('ev'), title: v, ts: Date.now() }];
        store.set(KEY, events);
        inp.value = '';
        render();
        toast('Evento adicionado', { kind: 'ok' });
      } }));

    render();
    return {};
  },
};
