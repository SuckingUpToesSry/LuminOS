/* ============================================================
   LuminOS — Arquivos (FS virtual em localStorage) + Terminal
   ============================================================ */

import { h, store, uid, bytes, sound, rnd } from '../core.js';
import { icon } from '../icons.js';
import { toast, promptDialog, confirmDialog, downloadBlob } from '../ui.js';
import { setWallpaper } from '../desktop.js';

/* ── virtual file system ──────────────────────────────────── */
const FS = 'files.vfs';

export function defaultFS() {
  const now = Date.now();
  return {
    '/': { type: 'dir', children: ['Documentos', 'Imagens', 'Projetos', 'notas.txt'] },
    '/Documentos': { type: 'dir', children: ['bem-vindo.md', 'receita.txt'] },
    '/Imagens': { type: 'dir', children: [] },
    '/Projetos': { type: 'dir', children: ['app.js'] },
    '/notas.txt': { type: 'file', content: 'Bem-vindo ao LuminOS!\n\nEste é um sistema de arquivos virtual salvo no seu navegador.\nTudo que você criar aqui fica entre sessões.\n', ts: now },
    '/Documentos/bem-vindo.md': { type: 'file', content: '# Bem-vindo\n\nO **LuminOS** é um desktop completo no navegador.\n\n- Crie arquivos e pastas\n- Abra e edite textos\n- Use o terminal para navegar\n', ts: now },
    '/Documentos/receita.txt': { type: 'file', content: 'Pão de queijo rápido\n\n1. Misture polvilho, queijo e leite\n2. Modele bolinhas\n3. Asse a 200°C por 20 min\n', ts: now },
    '/Projetos/app.js': { type: 'file', content: "console.log('Olá do LuminOS!');\n", ts: now },
  };
}

export function getFS() {
  const fs = store.get(FS, null);
  if (fs && fs['/']) return fs;
  const d = defaultFS();
  store.set(FS, d);
  return d;
}
export function saveFS(fs) { store.set(FS, fs); }
export const fsApi = {
  list(path) {
    const fs = getFS();
    const node = fs[path];
    if (!node || node.type !== 'dir') return [];
    return node.children.map((name) => {
      const p = path === '/' ? '/' + name : path + '/' + name;
      const n = fs[p] || { type: 'file', content: '', ts: Date.now() };
      return { name, path: p, type: n.type };
    }).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  },
  read(path) { return getFS()[path]?.content ?? null; },
  write(path, content) {
    const fs = getFS();
    fs[path] = { type: 'file', content, ts: Date.now() };
    const parent = path.split('/').slice(0, -1).join('/') || '/';
    if (!fs[parent]) { fs[parent] = { type: 'dir', children: [] }; }
    if (fs[parent].type === 'dir' && !fs[parent].children.includes(baseName(path))) fs[parent].children.push(baseName(path));
    saveFS(fs);
  },
  mkdir(path) {
    const fs = getFS();
    fs[path] = { type: 'dir', children: [] };
    const parent = path.split('/').slice(0, -1).join('/') || '/';
    if (!fs[parent]) fs[parent] = { type: 'dir', children: [] };
    if (!fs[parent].children.includes(baseName(path))) fs[parent].children.push(baseName(path));
    saveFS(fs);
  },
  rm(path) {
    const fs = getFS();
    const parent = path.split('/').slice(0, -1).join('/') || '/';
    if (fs[parent]?.children) fs[parent].children = fs[parent].children.filter((c) => c !== baseName(path));
    Object.keys(fs).filter((k) => k === path || k.startsWith(path + '/')).forEach((k) => delete fs[k]);
    saveFS(fs);
  },
  exists: (p) => !!getFS()[p],
};
function baseName(p) { return p.split('/').filter(Boolean).pop() || ''; }
function joinPath(dir, name) { return (dir === '/' ? '' : dir) + '/' + name.replace(/^\/+/, ''); }

/* ── Files app ───────────────────────────────────────────── */
export const filesApp = {
  id: 'files', name: 'Arquivos', glyph: 'folder', grad: ['#5fa8e8', '#7d6cf0'],
  size: { w: 760, h: 520 }, category: 'Sistema', desktop: true, singleton: true,
  mount(body) {
    let cwd = '/';
    body.innerHTML = '';
    const wrap = h('div.files');
    const crumb = h('div.files-crumb');
    const grid = h('div.file-grid');
    const viewer = h('div.file-viewer', { hidden: true });
    const status = h('div.app-status');

    const mkFile = h('button.btn.subtle', { html: icon('plus') + ' Arquivo', onclick: () => promptDialog({
      title: 'Novo arquivo', label: 'Nome (adicione .txt, .md, .js…)', value: 'documento.txt',
      onOk: (name) => { fsApi.write(joinPath(cwd, name), ''); render(); toast('Arquivo criado', { kind: 'ok' }); },
    }) });
    const mkDir = h('button.btn.subtle', { html: icon('folder') + ' Pasta', onclick: () => promptDialog({
      title: 'Nova pasta', label: 'Nome da pasta', value: 'Nova pasta',
      onOk: (name) => { fsApi.mkdir(joinPath(cwd, name)); render(); toast('Pasta criada', { kind: 'ok' }); },
    }) });
    const up = h('button.btn.subtle.icon', { html: icon('chevU'), title: 'Subir um nível', onclick: () => {
      if (cwd === '/') return;
      cwd = cwd.split('/').slice(0, -1).join('/') || '/';
      render();
    } });
    const delBtn = h('button.btn.subtle.icon', { html: icon('trash'), title: 'Excluir selecionado', onclick: () => {
      if (!sel) return toast('Selecione um item primeiro');
      confirmDialog({ title: 'Excluir?', text: sel, danger: true, ok: 'Excluir', onOk: () => { fsApi.rm(sel); sel = null; render(); } });
    } });

    const bar = h('div.app-toolbar', {}, up, mkFile, mkDir,
      h('span.grow'), delBtn,
      h('button.btn.subtle.icon', { html: icon('upload'), title: 'Importar arquivo', onclick: () => imp.click() }));
    const imp = h('input', { type: 'file', hidden: true, multiple: true, onchange: async () => {
      for (const f of [...imp.files]) {
        if (f.size > 400 * 1024) { toast(`${f.name} grande demais (máx 400 KB)`, { kind: 'err' }); continue; }
        fsApi.write(joinPath(cwd, f.name), await f.text());
      }
      render(); toast('Importado', { kind: 'ok' }); imp.value = '';
    } });

    wrap.append(bar, crumb, grid, viewer, status, imp);
    body.append(wrap);
    let sel = null;

    function renderCrumb() {
      crumb.innerHTML = '';
      const b0 = h('button', { html: icon('home'), title: 'Raiz', onclick: () => { cwd = '/'; render(); } });
      crumb.append(b0);
      const parts = cwd.split('/').filter(Boolean);
      let acc = '';
      parts.forEach((p) => {
        acc += '/' + p;
        crumb.append(h('span.sl', { text: '/' }));
        const path = acc;
        crumb.append(h('button', { text: p, onclick: () => { cwd = path; render(); } }));
      });
    }

    function render() {
      renderCrumb();
      grid.innerHTML = '';
      viewer.hidden = true;
      const items = fsApi.list(cwd);
      if (!items.length) {
        grid.append(h('div.empty', { style: { gridColumn: '1/-1' } }, h('div.big', { text: '📂' }),
          h('b', { text: 'Pasta vazia' }), h('p', { text: 'Crie um arquivo ou importe algo.' })));
      }
      items.forEach((it) => {
        const el = h('button.file', { class: sel === it.path ? 'sel' : '' },
          h('span.fi', { class: it.type === 'dir' ? 'folder' : '', html: icon(it.type === 'dir' ? 'folder' : 'file') }),
          h('span.nm', { text: it.name }));
        el.onclick = () => {
          sel = it.path;
          grid.querySelectorAll('.file').forEach((f) => f.classList.remove('sel'));
          el.classList.add('sel');
          if (it.type === 'dir') { cwd = it.path; sel = null; render(); }
          else openFile(it.path);
        };
        el.ondblclick = () => { if (it.type === 'file') openFile(it.path); };
        el.oncontextmenu = (e) => {
          e.preventDefault();
          import('../ui.js').then(({ contextMenu }) => contextMenu(e, [
            { label: it.type === 'dir' ? 'Abrir pasta' : 'Abrir', icon: 'folder', action: () => { if (it.type === 'dir') { cwd = it.path; render(); } else openFile(it.path); } },
            ...(it.type === 'file' ? [
              { label: 'Renomear', icon: 'edit', action: () => promptDialog({ title: 'Renomear', value: it.name, onOk: (nn) => {
                const content = fsApi.read(it.path);
                fsApi.rm(it.path); fsApi.write(joinPath(cwd, nn), content ?? ''); render();
              } }) },
              { label: 'Baixar', icon: 'download', action: () => downloadBlob(it.name, fsApi.read(it.path) ?? '') },
            ] : []),
            { sep: true },
            { label: 'Excluir', icon: 'trash', danger: true, action: () => confirmDialog({ title: 'Excluir?', text: it.path, danger: true, ok: 'Excluir', onOk: () => { fsApi.rm(it.path); render(); } }) },
          ]));
        };
        grid.append(el);
      });
      status.innerHTML = '';
      status.append(h('span', { text: `${items.length} item${items.length === 1 ? '' : 's'}` }), h('span', { text: '· ' + cwd }));
    }

    function openFile(path) {
      const content = fsApi.read(path) ?? '';
      viewer.hidden = false;
      viewer.innerHTML = '';
      const name = baseName(path);
      const head = h('div.app-toolbar', {},
        h('span', { html: icon('file') }), h('b', { text: name }), h('span.tiny', { text: bytes(new Blob([content]).size) }),
        h('span.grow'),
        h('button.btn.subtle.icon', { html: icon('image'), title: 'Usar como papel de parede (se for imagem)', onclick: () => {
          if (/^data:image/.test(content) || /^https?:.*\.(png|jpe?g|webp|gif)/i.test(content.trim())) { setWallpaper(content.trim()); toast('Papel de parede atualizado', { kind: 'ok' }); }
          else toast('Este arquivo não é uma imagem', { kind: 'err' });
        } }),
        h('button.btn.subtle.icon', { html: icon('download'), title: 'Baixar', onclick: () => downloadBlob(name, content) }),
        h('button.btn.subtle.icon', { html: icon('x'), title: 'Fechar', onclick: () => { viewer.hidden = true; } }));
      const ta = h('textarea', { spellcheck: 'false' });
      ta.value = content;
      let t;
      ta.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { fsApi.write(path, ta.value); sound.tone({ freq: 900, dur: .03, gain: .03 }); }, 500);
      });
      viewer.append(head, ta);
      ta.focus();
    }

    render();
    return { args(a) { if (a?.path && fsApi.exists(a.path)) { cwd = a.path.split('/').slice(0, -1).join('/') || '/'; render(); openFile(a.path); } } };
  },
};

/* ── Terminal ───────────────────────────────────────────── */
export const terminalApp = {
  id: 'terminal', name: 'Terminal', glyph: 'terminal', grad: ['#4a5161', '#20242e'],
  size: { w: 720, h: 440 }, category: 'Sistema', desktop: true, singleton: true,
  mount(body, api) {
    let cwd = '/';
    body.innerHTML = '';
    const wrap = h('div.term');
    const out = h('div.term-out');
    const input = h('input', { type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Comando' });
    const prompt = h('span', { text: 'user@luminos' });
    const pathEl = h('span.hl', { text: cwd });
    const line = h('div.term-in', {}, prompt, h('span', { class: 'dim', text: ':' }), pathEl, h('span', { text: '$' }), input);
    wrap.append(out, line);
    body.append(wrap);

    const WELCOME = [
      { t: 'LuminOS Terminal 1.0', c: 'hl' },
      { t: 'Digite "help" para ver os comandos disponíveis.', c: 'dim' },
      { t: '' },
    ];
    WELCOME.forEach((l) => print(l.t, l.c));

    let histIdx = -1;
    const history = store.get('term.history', []);

    function print(text = '', cls = '') {
      const d = h('div', { class: cls, text });
      out.append(d);
      out.scrollTop = out.scrollHeight;
    }
    function printHTML(html) {
      const d = h('div', { html });
      out.append(d);
      out.scrollTop = out.scrollHeight;
    }

    const CMDS = {
      help: () => {
        print('Comandos disponíveis:', 'hl');
        [
          ['help', 'mostra esta ajuda'],
          ['ls [caminho]', 'lista arquivos'],
          ['cd <pasta>', 'muda de diretório'],
          ['cat <arquivo>', 'mostra o conteúdo'],
          ['touch <arquivo>', 'cria arquivo vazio'],
          ['mkdir <pasta>', 'cria pasta'],
          ['rm <arquivo>', 'remove arquivo/pasta'],
          ['echo <texto>', 'imprime texto'],
          ['pwd', 'caminho atual'],
          ['date', 'data e hora'],
          ['whoami', 'usuário atual'],
          ['neofetch', 'info do sistema'],
          ['theme <nome>', 'muda o tema'],
          ['wallpaper <nome>', 'muda o papel de parede'],
          ['open <app>', 'abre um app'],
          ['apps', 'lista apps disponíveis'],
          ['notify <texto>', 'cria uma notificação'],
          ['clear', 'limpa o terminal'],
          ['exit', 'fecha o terminal'],
        ].forEach(([c, d]) => print(`  ${c.padEnd(22)} ${d}`));
      },
      pwd: () => print(cwd),
      date: () => print(new Date().toLocaleString('pt-BR')),
      whoami: () => print(store.get('profile.name', 'visitante')),
      clear: () => { out.innerHTML = ''; },
      exit: () => api?.close(),
      ls: (args) => {
        const target = args[0] ? resolve(args[0]) : cwd;
        const items = fsApi.list(target);
        if (!items.length && !fsApi.exists(target)) return print(`ls: ${args[0]}: não encontrado`, 'err');
        if (!items.length) return print('(vazio)', 'dim');
        printHTML(items.map((i) => `<span class="${i.type === 'dir' ? 'hl' : ''}">${i.name}${i.type === 'dir' ? '/' : ''}</span>`).join('   '));
      },
      cd: (args) => {
        const t = args[0] ? resolve(args[0]) : '/';
        if (!fsApi.exists(t) || getFSNode(t).type !== 'dir') return print(`cd: ${args[0]}: não é um diretório`, 'err');
        cwd = t; pathEl.textContent = cwd;
      },
      cat: (args) => {
        if (!args[0]) return print('uso: cat <arquivo>', 'err');
        const t = resolve(args[0]);
        const c = fsApi.read(t);
        if (c == null) return print(`cat: ${args[0]}: não encontrado`, 'err');
        print(c);
      },
      touch: (args) => {
        if (!args[0]) return print('uso: touch <arquivo>', 'err');
        fsApi.write(resolve(args[0]), '');
        print(`criado: ${resolve(args[0])}`, 'ok');
      },
      mkdir: (args) => {
        if (!args[0]) return print('uso: mkdir <pasta>', 'err');
        fsApi.mkdir(resolve(args[0]));
        print(`pasta criada: ${resolve(args[0])}`, 'ok');
      },
      rm: (args) => {
        if (!args[0]) return print('uso: rm <arquivo>', 'err');
        const t = resolve(args[0]);
        if (!fsApi.exists(t)) return print(`rm: ${args[0]}: não encontrado`, 'err');
        fsApi.rm(t); print(`removido: ${t}`, 'ok');
      },
      echo: (args) => print(args.join(' ')),
      neofetch: () => {
        const theme = document.documentElement.dataset.theme;
        const keys = store.keys().length;
        printHTML(`<span class="hl">      ▄▄▄▄▄▄      </span>  <span class="hl">user@luminos</span>
<span class="hl">    ▄████████▄    </span>  ────────────
<span class="hl">   ███▀    ▀███   </span>  OS: LuminOS 1.0 (web)
<span class="hl">  ███  ▄▄▄▄  ███  </span>  Kernel: javascript-esm
<span class="hl">  ███  ████  ███  </span>  Shell: lumin-sh
<span class="hl">   ███▄    ▄███   </span>  Tema: ${theme}
<span class="hl">    ▀████████▀    </span>  Apps: ${(window.__luminApps || 15)} apps
<span class="hl">      ▀▀▀▀▀▀      </span>  Chaves: ${keys}
                      Uptime: ${Math.round(performance.now() / 60000)} min`);
      },
      theme: (args) => {
        const t = args[0];
        const ok = ['dark', 'light', 'midnight', 'nord', 'sand', 'glass'];
        if (!ok.includes(t)) return print(`temas: ${ok.join(', ')}`, 'err');
        import('../desktop.js').then(({ setTheme }) => { setTheme(t); store.set('settings', { ...store.get('settings', {}), theme: t }); });
        print(`tema: ${t}`, 'ok');
      },
      wallpaper: (args) => {
        if (!args[0]) return print('uso: wallpaper <id|url>', 'err');
        setWallpaper(args[0]); print(`papel de parede: ${args[0]}`, 'ok');
      },
      open: (args) => {
        const id = args[0];
        if (!id) return print('uso: open <app>', 'err');
        import('../registry.js').then(({ registry }) => {
          const app = registry.get(id);
          if (!app) return print(`open: app "${id}" não encontrado`, 'err');
          window.dispatchEvent(new CustomEvent('lumin:open', { detail: { id } }));
          print(`abrindo ${app.name}…`, 'ok');
        });
      },
      apps: () => {
        import('../registry.js').then(({ registry }) => {
          printHTML(registry.all().map((a) => `<span class="hl">${a.id}</span>`).join('  '));
        });
      },
      notify: (args) => {
        import('../notifications.js').then(({ notify }) => notify({ title: 'Terminal', body: args.join(' ') || 'Notificação de teste', icon: 'terminal' }));
        print('notificação enviada', 'ok');
      },
      sudo: () => print('Você já é root no LuminOS 😎', 'ok'),
      rmrf: () => print('não. 🙂', 'err'),
      coffe: () => print('☕ preparando… (brincadeira, não sei fazer café)', 'ok'),
      hello: () => print(`Olá, ${store.get('profile.name', 'visitante')}!`, 'ok'),
    };
    CMDS['ll'] = CMDS.ls;
    CMDS['dir'] = CMDS.ls;
    CMDS['cls'] = CMDS.clear;

    function resolve(p) {
      if (!p) return cwd;
      let out;
      if (p.startsWith('/')) out = p;
      else if (p === '..') out = cwd.split('/').slice(0, -1).join('/') || '/';
      else if (p === '.') out = cwd;
      else out = (cwd === '/' ? '' : cwd) + '/' + p;
      return out.replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
    }
    function getFSNode(p) { return getFS()[p]; }

    function run(cmdline) {
      const raw = cmdline.trim();
      print(`${store.get('profile.name', 'user')}@luminos:${cwd}$ ${raw}`, 'cmd');
      if (!raw) return;
      history.unshift(raw); store.set('term.history', history.slice(0, 60));
      histIdx = -1;
      const [cmd, ...args] = raw.split(/\s+/);
      const fn = CMDS[cmd.toLowerCase()];
      if (!fn) return print(`lumin-sh: comando não encontrado: ${cmd}`, 'err');
      try { fn(args); } catch (e) { print(String(e), 'err'); }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const v = input.value; input.value = ''; run(v); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx] || ''; }
        else { histIdx = -1; input.value = ''; }
      } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    });
    wrap.addEventListener('click', () => input.focus());
    body.addEventListener('click', (e) => { if (!e.target.closest('input')) input.focus(); });
    setTimeout(() => input.focus(), 80);
    return {};
  },
};

