/* ============================================================
   LuminOS — Notas (editor markdown-lite com autosave)
   ============================================================ */

import { h, store, uid, debounce, sound, esc } from '../core.js';
import { icon } from '../icons.js';
import { contextMenu, confirmDialog } from '../ui.js';

const KEY = 'notes.items';

function load() {
  const notes = store.get(KEY, null);
  if (notes) return notes;
  const seed = [{
    id: uid('n'),
    title: 'Bem-vindo ao LuminOS',
    body: `# Bem-vindo\n\nEste é o **Notepad** do LuminOS. Tudo que você escrever fica salvo no seu navegador.\n\n- Escrita com autosave\n- Busca por título e conteúdo\n- Fixar notas importantes\n- Exportar em .md\n\n> Dica: use Ctrl/Cmd + K para abrir qualquer app.`,
    pinned: true,
    created: Date.now(),
    updated: Date.now(),
  }];
  store.set(KEY, seed);
  return seed;
}

export function mountNotes(body, api) {
  let notes = load();
  let activeId = notes[0]?.id || null;
  let query = '';

  body.innerHTML = '';
  const wrap = h('div.notes');
  const list = h('div.notes-list');
  const items = h('div.notes-items');
  const editor = h('div.notes-editor');

  /* header of list */
  const search = h('input.input', { placeholder: 'Buscar…', style: { fontSize: '12px', padding: '6px 9px' } });
  search.addEventListener('input', () => { query = search.value.toLowerCase(); renderList(); });
  const addBtn = h('button.btn.icon', { html: icon('plus'), title: 'Nova nota (Ctrl+N)' });
  list.append(h('div.notes-list-head', {}, search, addBtn), items);

  wrap.append(list, editor);
  body.append(wrap);

  const titleInput = h('input.notes-title', { placeholder: 'Título da nota', spellcheck: 'false' });
  const bodyArea = h('textarea.notes-body', { placeholder: 'Comece a escrever…', spellcheck: 'true' });
  const meta = h('div.notes-meta');
  const editorWrap = h('div.notes-editor', {});

  const save = debounce(() => {
    const n = notes.find((x) => x.id === activeId);
    if (!n) return;
    n.title = titleInput.value.trim() || 'Sem título';
    n.body = bodyArea.value;
    n.updated = Date.now();
    store.set(KEY, notes);
    renderList();
    updateMeta();
  }, 320);

  titleInput.addEventListener('input', save);
  bodyArea.addEventListener('input', save);
  bodyArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = bodyArea.selectionStart, en = bodyArea.selectionEnd;
      bodyArea.value = bodyArea.value.slice(0, s) + '  ' + bodyArea.value.slice(en);
      bodyArea.selectionStart = bodyArea.selectionEnd = s + 2;
      save();
    }
  });

  function updateMeta() {
    const n = notes.find((x) => x.id === activeId);
    if (!n) return;
    const words = (n.body || '').trim().split(/\s+/).filter(Boolean).length;
    meta.innerHTML = '';
    meta.append(
      h('span', { text: `${words} palavra${words === 1 ? '' : 's'}` }),
      h('span', { text: '·' }),
      h('span', { text: `${(n.body || '').length} caracteres` }),
      h('span.grow', { style: { flex: '1' } }),
      h('button.btn.subtle.icon', { html: icon('eye'), title: 'Visualizar (markdown)', onclick: () => togglePreview(n) }),
      h('button.btn.subtle.icon', { html: icon('copy'), title: 'Copiar', onclick: () => { navigator.clipboard?.writeText(n.body || ''); sound.ok(); } }),
      h('button.btn.subtle.icon', { html: icon('download'), title: 'Baixar .md', onclick: () => downloadNote(n) }),
      h('button.btn.subtle.icon', { html: icon('trash'), title: 'Excluir', onclick: () => removeNote(n.id) }),
    );
  }

  let previewing = false;
  function mdToHtml(md) {
    const lines = esc(md).split('\n');
    let out = '', inCode = false, inList = false;
    const inline = (t) => t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    for (const line of lines) {
      if (/^```/.test(line)) {
        out += inCode ? '</pre>' : '<pre>';
        inCode = !inCode;
        continue;
      }
      if (inCode) { out += line + '\n'; continue; }
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        const lvl = Math.min(4, m[1].length);
        out += `<h${lvl + 1}>${inline(m[2])}</h${lvl + 1}>`;
      } else if (/^\s*[-*+]\s+/.test(line)) {
        if (!inList) { out += '<ul>'; inList = true; }
        out += `<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`;
      } else if (/^>\s?/.test(line)) {
        out += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`;
      } else if (/^---+$/.test(line.trim())) {
        out += '<hr>';
      } else if (line.trim() === '') {
        if (inList) { out += '</ul>'; inList = false; }
        out += '';
      } else {
        if (inList) { out += '</ul>'; inList = false; }
        out += `<p>${inline(line)}</p>`;
      }
    }
    if (inList) out += '</ul>';
    if (inCode) out += '</pre>';
    return out;
  }

  function togglePreview(n) {
    previewing = !previewing;
    if (previewing) {
      bodyArea.hidden = true;
      let pv = editor.querySelector('.md-preview');
      if (!pv) {
        pv = h('div.md-preview', { style: {
          flex: '1', overflow: 'auto', padding: '8px 20px 24px', fontSize: '13.5px', lineHeight: '1.7',
        } });
        editor.append(pv);
      }
      pv.hidden = false;
      pv.innerHTML = mdToHtml(n.body || '');
    } else {
      bodyArea.hidden = false;
      const pv = editor.querySelector('.md-preview');
      if (pv) pv.hidden = true;
    }
  }

  function downloadNote(n) {
    const blob = new Blob([`# ${n.title}\n\n${n.body}`], { type: 'text/markdown' });
    const a = h('a', { href: URL.createObjectURL(blob), download: (n.title || 'nota') + '.md' });
    a.click(); URL.revokeObjectURL(a.href);
  }

  function renderList() {
    items.innerHTML = '';
    const filtered = notes
      .filter((n) => !query || (n.title + ' ' + n.body).toLowerCase().includes(query))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated - a.updated);
    if (!filtered.length) {
      items.append(h('div.empty', { style: { padding: '22px 12px' } }, h('b', { text: 'Nada encontrado' }),
        h('p', { text: query ? 'Tente outro termo.' : 'Crie sua primeira nota.' })));
    }
    filtered.forEach((n) => {
      const preview = (n.body || '').replace(/[#*>`-]/g, '').replace(/\n+/g, ' ').trim().slice(0, 46);
      const row = h('div.note-row', { class: n.id === activeId ? 'active' : '' },
        h('b', {}, n.pinned ? '📌 ' : '', n.title || 'Sem título'),
        h('small', { text: preview || 'Vazia' }));
      row.onclick = () => { activeId = n.id; openNote(); renderList(); };
      row.oncontextmenu = (e) => {
        e.preventDefault();
        contextMenu(e, [
          { label: n.pinned ? 'Desafixar' : 'Fixar nota', icon: 'star', action: () => { n.pinned = !n.pinned; store.set(KEY, notes); renderList(); } },
          { label: 'Duplicar', icon: 'copy', action: () => {
            const c = { ...n, id: uid('n'), title: n.title + ' (cópia)', updated: Date.now() };
            notes.unshift(c); store.set(KEY, notes); activeId = c.id; renderList(); openNote();
          } },
          { label: 'Baixar .md', icon: 'download', action: () => downloadNote(n) },
          { sep: true },
          { label: 'Excluir', icon: 'trash', danger: true, action: () => removeNote(n.id) },
        ]);
      };
      items.append(row);
    });
  }

  function openNote() {
    editor.innerHTML = '';
    const n = notes.find((x) => x.id === activeId);
    if (!n) {
      editor.append(h('div.empty', {}, h('div.big', { text: '📝' }), h('b', { text: 'Nenhuma nota aberta' }),
        h('p', { text: 'Crie uma nova nota ou escolha uma na lista.' }),
        h('button.btn.primary', { html: icon('plus') + ' Nova nota', onclick: newNote, style: { marginTop: '8px' } })));
      return;
    }
    previewing = false;
    titleInput.value = n.title;
    bodyArea.value = n.body;
    bodyArea.hidden = false;
    editor.append(meta, titleInput, bodyArea);
    updateMeta();
  }

  function newNote() {
    const n = { id: uid('n'), title: '', body: '', pinned: false, created: Date.now(), updated: Date.now() };
    notes.unshift(n);
    store.set(KEY, notes);
    activeId = n.id;
    renderList(); openNote();
    titleInput.focus();
    sound.open();
  }

  function removeNote(id) {
    confirmDialog({
      title: 'Excluir nota?',
      text: 'Esta ação não pode ser desfeita.',
      danger: true, ok: 'Excluir',
      onOk: () => {
        notes = notes.filter((n) => n.id !== id);
        if (activeId === id) activeId = notes[0]?.id || null;
        store.set(KEY, notes);
        renderList(); openNote(); sound.close();
      },
    });
  }

  addBtn.onclick = newNote;
  api.addTool(h('button', { html: icon('plus'), title: 'Nova nota', onclick: newNote }));

  body.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); }
  });

  renderList();
  openNote();
  return {};
}

export const notesApp = {
  id: 'notes', name: 'Notas', glyph: 'note', grad: ['#f2b75a', '#f0854f'],
  size: { w: 720, h: 520 }, category: 'Produtividade', dock: true, desktop: true, singleton: true,
  mount: mountNotes,
};
