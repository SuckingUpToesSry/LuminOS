/* ============================================================
   LuminOS — Calculadora, Paint, Editor de código, App Creator
   ============================================================ */

import { h, store, sound, uid, esc } from '../core.js';
import { icon } from '../icons.js';
import { toast, modal, downloadBlob, promptDialog } from '../ui.js';
import { install } from './store.js';

/* ══════════════════ CALCULATOR ══════════════════ */
export const calculatorApp = {
  id: 'calculator', name: 'Calculadora', glyph: 'calc', grad: ['#7c8aa0', '#4d5a6e'],
  size: { w: 320, h: 470 }, category: 'Utilidades', desktop: true, singleton: true,
  mount(body) {
    let cur = '0', prev = null, op = null, justEval = false;
    body.innerHTML = '';
    const hist = h('div.calc-hist', { text: '' });
    const val = h('div.calc-val', { text: '0' });
    const disp = h('div.calc-disp', {}, hist, val);
    const keys = h('div.calc-keys');
    body.innerHTML = '';
    body.append(h('div.calc', {}, disp, keys));

    const layout = [
      ['AC', 'fn'], ['±', 'fn'], ['%', 'fn'], ['÷', 'op'],
      ['7', ''], ['8', ''], ['9', ''], ['×', 'op'],
      ['4', ''], ['5', ''], ['6', ''], ['−', 'op'],
      ['1', ''], ['2', ''], ['3', ''], ['+', 'op'],
      ['0', ''], ['.', ''], ['⌫', 'fn'], ['=', 'eq'],
    ];
    function show() {
      val.textContent = cur.length > 12 ? Number(cur).toPrecision(10).replace(/\.?0+$/, '') : cur;
      hist.textContent = prev != null ? `${prev} ${op || ''}` : '';
    }
    function calc(a, b, o) {
      a = +a; b = +b;
      switch (o) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? NaN : a / b;
        default: return b;
      }
    }
    function press(k) {
      sound.tone({ freq: 600 + Math.random() * 80, dur: .03, gain: .03 });
      if (/[0-9]/.test(k)) {
        cur = (cur === '0' || justEval) ? k : cur + k;
        justEval = false;
      } else if (k === '.') { if (!cur.includes('.')) cur += '.'; }
      else if (k === 'AC') { cur = '0'; prev = null; op = null; justEval = false; }
      else if (k === '±') { cur = String(-1 * +cur); }
      else if (k === '%') { cur = String(+cur / 100); }
      else if (k === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
      else if (['+', '−', '×', '÷'].includes(k)) {
        if (prev != null && op && !justEval) { prev = String(round(calc(prev, cur, op))); cur = prev; }
        else prev = cur;
        op = k; justEval = false; cur = '0';
      } else if (k === '=') {
        if (prev != null && op) {
          const r = calc(prev, cur, op);
          hist.textContent = `${prev} ${op} ${cur} =`;
          cur = String(round(r));
          prev = null; op = null; justEval = true;
          show(); val.textContent = cur === 'NaN' ? 'Erro' : val.textContent;
          hist.textContent = `${hist.textContent}`;
          return;
        }
      }
      show();
    }
    const round = (n) => Number.isFinite(n) ? Math.round(n * 1e10) / 1e10 : n;
    layout.forEach(([k, cls]) => {
      const b = h(`button.calc-key.${cls || 'num'}`, { text: k });
      b.onclick = () => press(k);
      keys.append(b);
    });
    body.addEventListener('keydown', (e) => {
      const map = { '/': '÷', '*': '×', '-': '−', '+': '+', 'Enter': '=', '=': '=', 'Escape': 'AC', 'Backspace': '⌫', '%': '%' };
      if (/^[0-9.]$/.test(e.key)) press(e.key);
      else if (map[e.key]) { e.preventDefault(); press(map[e.key]); }
    });
    body.tabIndex = 0;
    setTimeout(() => body.focus(), 50);
    show();
    return {};
  },
};

/* ══════════════════ PAINT ══════════════════ */
export const paintApp = {
  id: 'paint', name: 'Paint', glyph: 'paint', grad: ['#f0709a', '#f2b75a'],
  size: { w: 820, h: 600 }, category: 'Mídia', desktop: true, singleton: true,
  mount(body) {
    let color = '#6f8bff', size = 4, tool = 'brush', drawing = false, last = null;
    body.innerHTML = '';
    const canvas = h('canvas', { width: 1200, height: 700 });
    const stage = h('div', { style: { flex: '1', overflow: 'auto', display: 'grid', placeItems: 'center', padding: '12px',
      background: 'var(--surface-2)' } }, canvas);
    canvas.style.cssText = 'background:#fff;border-radius:10px;box-shadow:var(--shadow-sm);cursor:crosshair;max-width:100%;touch-action:none';
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = ctx.lineCap = 'round';

    const colorInput = h('input', { type: 'color', value: color,
      style: { width: '34px', height: '28px', border: '1px solid var(--line)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' } });
    colorInput.oninput = () => { color = colorInput.value; };
    const sizeInput = h('input', { type: 'range', min: 1, max: 40, value: size, style: { width: '90px' } });
    sizeInput.oninput = () => { size = +sizeInput.value; };
    const tools = [['brush', 'paint', 'Pincel'], ['eraser', 'x', 'Borracha'], ['line', 'minus', 'Linha'], ['rect', 'grid2', 'Retângulo'], ['circle', 'star', 'Círculo']];

    const bar = h('div.app-toolbar');
    const toolBtns = tools.map(([id, ic, label]) => {
      const b = h('button.btn.subtle.icon', { html: icon(ic), title: label, class: id === tool ? 'primary' : '' });
      b.onclick = () => { tool = id; toolBtns.forEach((x, i) => x.className = 'btn subtle icon ' + (tools[i][0] === id ? 'primary' : '')); };
      bar.append(b);
      return b;
    });
    const pal = ['#111820', '#6f8bff', '#b07bff', '#3ecf8e', '#f5b955', '#ff6b6b', '#2fb8d9', '#f0709a'];
    const swatches = pal.map((c) => {
      const b = h('button', { title: c, style: { width: '20px', height: '20px', borderRadius: '50%', background: c, border: '2px solid var(--line)' } });
      b.onclick = () => { color = c; colorInput.value = c; };
      return b;
    });
    bar.append(h('span', { style: { width: '1px', height: '20px', background: 'var(--line)' } }), colorInput, ...swatches, sizeInput,
      h('span.grow'),
      h('button.btn.subtle', { html: icon('trash') + ' Limpar', onclick: () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } }),
      h('button.btn.subtle', { html: icon('download') + ' PNG', onclick: () => {
        canvas.toBlob((blob) => downloadBlob('luminos-paint.png', blob), 'image/png');
      } }),
      h('button.btn.subtle', { html: icon('image') + ' Wallpaper', onclick: () => {
        import('../desktop.js').then(({ setWallpaper }) => { setWallpaper(canvas.toDataURL('image/png')); toast('Papel de parede atualizado', { kind: 'ok' }); });
      } }));
    body.append(h('div.app', {}, bar, stage));

    let snapshot = null;
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    }
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      drawing = true; last = pos(e);
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (tool === 'brush' || tool === 'eraser') { dot(last); }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      if (tool === 'brush' || tool === 'eraser') { line(last, p); last = p; }
      else { ctx.putImageData(snapshot, 0, 0); shape(last, p); }
    });
    canvas.addEventListener('pointerup', () => { drawing = false; });
    canvas.addEventListener('pointerleave', () => { drawing = false; });

    function styleFor() {
      ctx.strokeStyle = tool === 'eraser' ? '#fff' : color;
      ctx.fillStyle = tool === 'eraser' ? '#fff' : color;
      ctx.lineWidth = tool === 'eraser' ? size * 2.4 : size;
    }
    function dot(p) {
      styleFor();
      ctx.beginPath(); ctx.arc(p.x, p.y, (tool === 'eraser' ? size * 1.2 : size / 2), 0, Math.PI * 2); ctx.fill();
    }
    function line(a, b) {
      styleFor();
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    function shape(a, b) {
      styleFor();
      ctx.beginPath();
      if (tool === 'line') { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); return; }
      if (tool === 'rect') { ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); return; }
      if (tool === 'circle') {
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    return {};
  },
};

/* ══════════════════ CODE EDITOR ══════════════════ */
const DEFAULT_CODE = `<!doctype html>
<html>
<head>
  <style>
    body{ font-family: system-ui; display:grid; place-items:center;
          height:100vh; margin:0; background:#0b0d12; color:#e9ebf2 }
    h1{ font-weight:300; letter-spacing:-.02em }
    b{ color:#6f8bff }
    button{ margin-top:14px; padding:9px 16px; border-radius:99px; border:0;
            background:#6f8bff; color:#fff; font:inherit; cursor:pointer }
  </style>
</head>
<body>
  <div style="text-align:center">
    <h1>Olá, <b>LuminOS</b> 👋</h1>
    <p>Edite o código à esquerda — a prévia atualiza sozinha.</p>
    <button onclick="alert('funciona!')">Clique</button>
  </div>
</body>
</html>`;

export const codeApp = {
  id: 'code', name: 'Editor de Código', glyph: 'code', grad: ['#5b6b8f', '#9d6bff'],
  size: { w: 900, h: 580 }, category: 'Produtividade', desktop: true, singleton: true,
  mount(body) {
    const KEY = 'code.snippet';
    let code = store.get(KEY, DEFAULT_CODE);
    body.innerHTML = '';
    const bar = h('div.app-toolbar');
    const ta = h('textarea', { spellcheck: 'false', wrap: 'off' });
    ta.value = code;
    ta.style.cssText = 'flex:1;resize:none;border:0;outline:none;background:var(--surface-2);color:var(--text);' +
      'font-family:var(--mono);font-size:12px;line-height:1.65;padding:12px;min-width:0';
    const frame = h('iframe', { sandbox: 'allow-scripts allow-modals allow-forms allow-popups', style: { flex: '1', border: '0', background: '#fff', minWidth: '0' } });
    const split = h('div', { style: { flex: '1', display: 'flex', minHeight: '0' } }, ta, frame);
    const status = h('div.app-status');

    const run = () => { frame.srcdoc = ta.value; };
    const save = () => { store.set(KEY, ta.value); toast('Código salvo', { kind: 'ok' }); };
    bar.append(
      h('button.btn.primary', { html: icon('play') + ' Executar', onclick: run }),
      h('button.btn.subtle', { html: icon('save') + ' Salvar', onclick: save }),
      h('button.btn.subtle', { html: icon('download') + ' Baixar', onclick: () => downloadBlob('snippet.html', ta.value, 'text/html') }),
      h('span.grow'),
      h('span.tiny', { text: 'HTML + CSS + JS · prévia ao vivo' }),
      h('button.btn.subtle.icon', { html: icon('refresh'), title: 'Restaurar exemplo', onclick: () => { ta.value = DEFAULT_CODE; run(); } }));
    body.append(h('div.app', {}, bar, split, status));
    let t;
    ta.addEventListener('input', () => {
      status.innerHTML = '';
      status.append(h('span', { text: `${ta.value.length} caracteres` }), h('span', { text: '·' }), h('span', { text: 'editando…' }));
      clearTimeout(t);
      t = setTimeout(run, 600);
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    });
    status.append(h('span', { text: 'Ctrl/Cmd + Enter para executar · Ctrl/Cmd + S para salvar' }));
    run();
    return {};
  },
};

/* ══════════════════ APP CREATOR ══════════════════ */
export const creatorApp = {
  id: 'creator', name: 'App Creator', glyph: 'wand', grad: ['#9d6bff', '#5eb0ff'],
  size: { w: 700, h: 480 }, category: 'Sistema', desktop: true, singleton: true,
  mount(body, api) {
    const KEY = 'creator.apps';
    let apps = store.get(KEY, []);
    body.innerHTML = '';
    const wrap = h('div.creator');
    const form = h('div.creator-form');
    const preview = h('div.creator-preview');
    wrap.append(form, preview);
    body.append(h('div.app', {}, wrap));

    const nameI = h('input.input', { placeholder: 'Meu app' });
    const urlI = h('input.input', { placeholder: 'https://exemplo.com' });
    const emojiI = h('input.input', { placeholder: '🌐', maxlength: 2 });
    const c1 = h('input', { type: 'color', value: '#6f8bff' });
    const c2 = h('input', { type: 'color', value: '#b07bff' });
    const cpCard = h('div.cp-card');
    const list = h('div', { style: { display: 'grid', gap: '5px', maxHeight: '150px', overflow: 'auto' } });

    function renderPreview() {
      cpCard.innerHTML = '';
      cpCard.append(
        h('div.cp-head', { text: emojiI.value || '🌐', style: { background: `linear-gradient(140deg,${c1.value},${c2.value})` } }),
        h('div.cp-body', {}, h('b', { text: nameI.value || 'Meu app' }), h('p', { text: urlI.value || 'https://exemplo.com' }),
          h('button.btn.primary', { html: icon('external') + ' Abrir', onclick: () => { if (urlI.value) window.open(urlI.value, '_blank', 'noopener'); } })));
    }
    [nameI, urlI, emojiI, c1, c2].forEach((i) => i.addEventListener('input', renderPreview));

    function renderList() {
      list.innerHTML = '';
      if (!apps.length) list.append(h('p.tiny', { text: 'Nenhum app criado ainda.' }));
      apps.forEach((a, i) => {
        list.append(h('div.row', { style: { background: 'var(--surface-3)', borderRadius: '8px', padding: '5px 8px' } },
          h('span', { text: a.emoji || '🌐' }),
          h('span', { style: { flex: '1', fontSize: '11.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, text: a.name }),
          h('button.btn.subtle.icon', { html: icon('trash'), title: 'Excluir', onclick: () => {
            apps.splice(i, 1); store.set(KEY, apps); renderList();
            import('../desktop.js').then(({ refreshIcons }) => refreshIcons());
          } })));
      });
    }

    form.append(
      h('h3', { text: 'Criar atalho' }),
      h('.field', {}, h('span', { text: 'Nome' }), nameI),
      h('.field', {}, h('span', { text: 'URL' }), urlI),
      h('.field', {}, h('span', { text: 'Emoji' }), emojiI),
      h('.field', {}, h('span', { text: 'Cores' }), h('div.row', {}, c1, c2)),
      h('button.btn.primary', { html: icon('plus') + ' Adicionar ao desktop', onclick: () => {
        const name = nameI.value.trim();
        if (!name) return toast('Dê um nome ao app', { kind: 'err' });
        if (!urlI.value.trim()) return toast('Informe uma URL', { kind: 'err' });
        const a = { id: uid('web'), name, url: urlI.value.trim(), emoji: emojiI.value || '🌐', c1: c1.value, c2: c2.value };
        apps.push(a); store.set(KEY, apps);
        renderList();
        nameI.value = ''; urlI.value = ''; emojiI.value = ''; renderPreview();
        toast(`${name} adicionado`, { kind: 'ok' }); sound.ok();
        import('../desktop.js').then(({ refreshIcons }) => refreshIcons());
      } }),
      h('hr.sep'),
      h('h3', { text: 'Seus atalhos' }),
      list,
      h('p.tiny', { text: 'Os atalhos aparecem no desktop e podem ser abertos em uma janela própria do LuminOS.' }));
    preview.append(cpCard);
    renderPreview(); renderList();
    return {};
  },
};
