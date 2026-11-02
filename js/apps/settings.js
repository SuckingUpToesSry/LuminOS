/* ============================================================
   LuminOS — Configurações
   ============================================================ */

import { h, store, sound, accentPalette, isMac, modKey } from '../core.js';
import { icon } from '../icons.js';
import { toggleSwitch, modal, toast, confirmDialog } from '../ui.js';
import { setTheme, setAccent, setWallpaper, wallpaperOptions, resetUserdata } from '../desktop.js';
import { version } from '../registry.js';

const SECTIONS = [
  { id: 'appearance', name: 'Aparência', icon: 'palette' },
  { id: 'desktop', name: 'Desktop & Dock', icon: 'grid' },
  { id: 'sound', name: 'Som', icon: 'vol' },
  { id: 'browser', name: 'Navegador', icon: 'globe' },
  { id: 'ai', name: 'IA', icon: 'spark' },
  { id: 'notifications', name: 'Notificações', icon: 'bell' },
  { id: 'account', name: 'Conta', icon: 'user' },
  { id: 'shortcuts', name: 'Atalhos', icon: 'terminal' },
  { id: 'storage', name: 'Armazenamento', icon: 'layers' },
  { id: 'developer', name: 'Avançado', icon: 'sliders' },
  { id: 'about', name: 'Sobre', icon: 'info' },
];

const THEMES = [
  { id: 'dark', name: 'Escuro' },
  { id: 'light', name: 'Claro' },
  { id: 'midnight', name: 'Meia-noite' },
  { id: 'nord', name: 'Nord' },
  { id: 'sand', name: 'Areia' },
  { id: 'glass', name: 'Vidro' },
  { id: 'astolfo', name: 'Astolfo' },
];

export const settingsApp = {
  id: 'settings', name: 'Configurações', glyph: 'settings', grad: ['#8b93a7', '#5f6a80'],
  size: { w: 780, h: 560 }, category: 'Sistema', dock: true, desktop: true, singleton: true,
  mount(body, api) {
    let section = 'appearance';
    body.innerHTML = '';
    const wrap = h('div.settings');
    const nav = h('div.set-nav');
    const main = h('div.set-main');
    wrap.append(nav, main);
    body.append(wrap);

    function renderNav() {
      nav.innerHTML = '';
      SECTIONS.forEach((s) => {
        const b = h('button.side-item', { class: s.id === section ? 'active' : '' },
          h('span', { html: icon(s.icon) }), h('span', { text: s.name }));
        b.onclick = () => { section = s.id; renderNav(); renderMain(); };
        nav.append(b);
      });
    }

    function row(label, desc, ctl) {
      return h('div.set-row', {}, h('div.lbl', {}, h('b', { text: label }), desc ? h('small', { text: desc }) : null), h('div.ctl', {}, ctl));
    }

    function renderMain() {
      main.innerHTML = '';
      const s = store.get('settings', {});
      const set = (k, v) => { const cur = store.get('settings', {}); cur[k] = v; store.set('settings', cur); };

      if (section === 'appearance') {
        main.append(h('h2', { text: 'Aparência' }), h('p.sub', { text: 'Tema, cor de destaque e papel de parede.' }));
        const g1 = h('div.set-group', {}, h('h3', { text: 'Tema' }));
        const cards = h('div.theme-cards');
        const cur = document.documentElement.dataset.theme;
        THEMES.forEach((t) => {
          const c = h('button.theme-card', { class: t.id === cur ? 'active' : '' },
            h('div.sw', { dataset: { theme: t.id } }),
            h('div.nm', {}, h('span', { text: t.name }), t.id === cur ? h('span', { html: icon('check') }) : null));
          c.onclick = () => { setTheme(t.id); set('theme', t.id); renderMain(); };
          cards.append(c);
        });
        g1.append(cards);
        g1.querySelectorAll('.sw').forEach((sw) => {
          const th = sw.dataset.theme;
          const map = {
            dark: 'linear-gradient(140deg,#14171f,#0b0d12)', light: 'linear-gradient(140deg,#fff,#eceef3)',
            midnight: 'linear-gradient(140deg,#111a4a,#05060c)', nord: 'linear-gradient(140deg,#434c5e,#2e3440)',
            sand: 'linear-gradient(140deg,#fffdf9,#efe8dc)', glass: 'linear-gradient(140deg,#2a1f5e,#0d4d5c)',
            astolfo: 'linear-gradient(140deg,#ffd7ea,#e3cdfb)',
          };
          sw.style.background = map[th] || map.dark;
        });

        const g2 = h('div.set-group', {}, h('h3', { text: 'Cor de destaque' }));
        const acc = h('div.accents');
        accentPalette.forEach((a) => {
          const dot = h('button.accent-dot', { style: { background: `linear-gradient(140deg,${a.c},${a.c2})` },
            class: document.documentElement.style.getPropertyValue('--accent').trim() === a.c ? 'active' : '' });
          dot.title = a.name;
          dot.onclick = () => { setAccent(a); set('accent', a.id); renderMain(); };
          acc.append(dot);
        });
        g2.append(acc);

        const g3 = h('div.set-group', {}, h('h3', { text: 'Papel de parede' }));
        const walls = h('div.wall-list');
        wallpaperOptions().forEach((w) => {
          const item = h('button.wall-item', { class: store.get('wallpaper', 'aurora') === w.id ? 'active' : '' },
            h('i', { style: { background: w.css } }));
          item.onclick = () => { setWallpaper(w.id); renderMain(); };
          walls.append(item);
        });
        g3.append(walls);

        const pink = h('button.btn', { text: 'Deixar tudo rosa (Astolfo)', html: icon('heart') + ' Deixar tudo rosa' });
        pink.onclick = () => {
          setTheme('astolfo');
          set('theme', 'astolfo');
          setAccent({ id: 'astolfo', c: '#ec6fa9', c2: '#c39bf7' });
          set('accent', 'astolfo');
          setWallpaper('astolfo');
          renderMain();
        };
        g3.append(h('div', { style: { marginTop: '10px' } }, pink));

        main.append(g1, g2, g3, row('Mover janelas com fímbria', 'Efeito de encaixe nas bordas da tela',
          toggleSwitch(store.get('settings.snap', true), (v) => set('snap', v))));
      }

      if (section === 'desktop') {
        main.append(h('h2', { text: 'Desktop & Dock' }), h('p.sub', { text: 'Deixe o sistema com a sua cara.' }));
        main.append(
          row('Mostrar ícones no desktop', 'Atalhos visíveis na área de trabalho',
            toggleSwitch(store.get('settings.desktopIcons', true), (v) => { set('desktopIcons', v); import('../desktop.js').then(({ applySettings }) => applySettings()); })),
          row('Dock ampliado', 'Mais ícones visíveis na dock',
            toggleSwitch(store.get('settings.bigDock', false), (v) => { set('bigDock', v); import('../desktop.js').then(({ applySettings }) => applySettings()); })),
          row('Relógio com segundos', 'Mostrar segundos na barra superior',
            toggleSwitch(store.get('settings.clockSeconds', false), (v) => { set('clockSeconds', v); toast('Aplicado na barra superior'); })),
          row('Mostrar clima', 'Chip de clima na barra superior',
            toggleSwitch(store.get('settings.showWeather', true), (v) => { set('showWeather', v); import('../desktop.js').then(({ applySettings }) => applySettings()); })),
          row('Blur / transparência', 'Vidro fosco nas janelas e painéis',
            toggleSwitch(store.get('settings.blur', true), (v) => {
              set('blur', v);
              document.documentElement.style.setProperty('--glass-2', v ? '' : 'var(--surface)');
              document.body.classList.toggle('no-blur', !v);
            })),
          row('Animações', 'Transições suaves',
            toggleSwitch(store.get('settings.motion', true), (v) => {
              set('motion', v);
              document.body.classList.toggle('no-motion', !v);
            })),
        );
      }

      if (section === 'sound') {
        const vol = store.get('sound.volume', .5);
        sound.volume = vol;
        const slider = h('input', { type: 'range', min: 0, max: 100, value: Math.round(vol * 100), style: { width: '150px' } });
        const val = h('span.tiny', { text: Math.round(vol * 100) + '%' });
        slider.addEventListener('input', () => {
          sound.volume = slider.value / 100;
          store.set('sound.volume', sound.volume);
          val.textContent = slider.value + '%';
        });
        slider.addEventListener('change', () => sound.tone({ freq: 660, dur: .1, gain: .1 }));
        main.append(h('h2', { text: 'Som' }), h('p.sub', { text: 'Efeitos sonoros do sistema (sintetizados, sem arquivos).' }));
        main.append(
          row('Volume dos efeitos', 'Aplicado a cliques, notificações e jogos', h('div.row', {}, slider, val)),
          row('Sons do sistema', 'Feedback sonoro ao abrir/fechar apps',
            toggleSwitch(sound.enabled, (v) => { sound.enabled = v; store.set('sound.enabled', v); })),
          row('Testar som', 'Ouve um acorde de confirmação', h('button.btn', { text: 'Tocar', onclick: () => sound.boot() })),
          row('Sons do soundboard', 'Volume compartilhado com os pads', h('button.btn', { text: 'Abrir app', onclick: () => api?.open('soundboard') })),
        );
      }

      if (section === 'browser') {
        const bs = store.get('browser.settings', { engine: 'duck', proxy: 'none', home: '' });
        const setB = (k, v) => { const cur = store.get('browser.settings', {}); cur[k] = v; store.set('browser.settings', cur); };
        const eng = h('select.select', {},
          ...[['duck', 'DuckDuckGo'], ['google', 'Google'], ['bing', 'Bing'], ['brave', 'Brave'], ['wiki', 'Wikipedia']]
            .map(([v, t]) => h('option', { value: v, text: t })));
        eng.value = bs.engine;
        eng.onchange = () => setB('engine', eng.value);
        const prox = h('select.select', {},
          ...[['none', 'Sem proxy (direto)'], ['allorigins', 'AllOrigins'], ['corsproxy', 'corsproxy.io'], ['codetabs', 'CodeTabs'], ['thingproxy', 'thingproxy']]
            .map(([v, t]) => h('option', { value: v, text: t })));
        prox.value = bs.proxy;
        prox.onchange = () => setB('proxy', prox.value);
        const home = h('input.input', { placeholder: 'https://exemplo.com', value: bs.home });
        home.onchange = () => setB('home', home.value.trim());
        main.append(h('h2', { text: 'Navegador' }), h('p.sub', { text: 'Motor de busca, página inicial e proxy.' }));
        main.append(
          row('Motor de busca', 'Usado quando você digita um termo', eng),
          row('Proxy padrão', 'Contorna bloqueios de iframe em alguns sites', prox),
          row('Página inicial', 'Abrir ao clicar em Início', home),
          row('Limpar dados de navegação', `Histórico: ${(store.get('browser.history', []) || []).length} itens`,
            h('button.btn.danger', { text: 'Limpar', onclick: () => confirmDialog({ title: 'Limpar histórico?', danger: true, ok: 'Limpar', onOk: () => { store.set('browser.history', []); toast('Histórico limpo', { kind: 'ok' }); renderMain(); } }) })),
          row('Favoritos', `${(store.get('browser.bookmarks', []) || []).length} salvos`,
            h('button.btn', { text: 'Gerenciar', onclick: () => manageBookmarks() })),
        );
      }

      if (section === 'ai') {
        const cfg = store.get('ai.settings', { provider: 'local', endpoint: '', model: '', key: '' });
        const prov = h('select.select', {}, h('option', { value: 'local', text: 'Local (offline)' }),
          h('option', { value: 'openai', text: 'Compatível com OpenAI' }), h('option', { value: 'ollama', text: 'Ollama local' }));
        prov.value = cfg.provider;
        const ep = h('input.input', { value: cfg.endpoint, placeholder: 'https://api.openai.com/v1/chat/completions' });
        const model = h('input.input', { value: cfg.model, placeholder: 'gpt-4o-mini' });
        const key = h('input.input', { type: 'password', value: cfg.key, placeholder: 'sk-…' });
        const save = () => {
          store.set('ai.settings', { ...store.get('ai.settings', {}), provider: prov.value, endpoint: ep.value.trim(), model: model.value.trim(), key: key.value.trim() });
          toast('Configuração de IA salva', { kind: 'ok' });
        };
        main.append(h('h2', { text: 'Assistente de IA' }), h('p.sub', { text: 'Funciona offline por padrão. Conecte um provedor para respostas completas.' }));
        main.append(
          row('Provedor', 'Local não envia nada para fora', prov),
          row('Endpoint', 'Compatível com o formato /chat/completions', ep),
          row('Modelo', 'Ex.: gpt-4o-mini, llama3.1', model),
          row('Chave de API', 'Fica apenas neste navegador', key),
          row('Salvar', '', h('button.btn.primary', { text: 'Salvar', onclick: save })),
          row('Limpar conversa', 'Apaga o histórico do LuminAI', h('button.btn.danger', { text: 'Limpar', onclick: () => { store.set('ai.history', []); toast('Conversa apagada'); } })),
        );
      }

      if (section === 'notifications') {
        const ns = store.get('notif.settings', { enabled: true, sound: true, welcome: true, quiet: false });
        const setN = (k, v) => {
          const cur = store.get('notif.settings', {});
          cur[k] = v; store.set('notif.settings', cur);
        };
        main.append(h('h2', { text: 'Notificações' }), h('p.sub', { text: 'Central de notificações do sistema.' }));
        main.append(
          row('Notificações ativas', 'Avisos de apps e do sistema', toggleSwitch(ns.enabled !== false, (v) => setN('enabled', v))),
          row('Som de notificação', 'Toca um bipe curto ao receber', toggleSwitch(ns.sound !== false, (v) => setN('sound', v))),
          row('Modo silencioso', 'Nada aparece, nem toca', toggleSwitch(!!ns.quiet, (v) => setN('quiet', v))),
          row('Aviso de boas-vindas', 'Msg única ao abrir o sistema', toggleSwitch(ns.welcome !== false, (v) => setN('welcome', v))),
          row('Limpar todas', 'Remove as notificações da central', h('button.btn.danger', { text: 'Limpar', onclick: () => {
            import('../notifications.js').then(({ clearAll }) => { clearAll(); toast('Central limpa', { kind: 'ok' }); });
          } })),
          row('Enviar teste', 'Cria uma notificação de exemplo', h('button.btn', { text: 'Testar', onclick: () => {
            import('../notifications.js').then(({ notify }) => notify({ title: 'Teste de notificação', body: 'Tudo funcionando por aqui.', iconName: 'bell' }));
          } })),
        );
      }

      if (section === 'account') {
        const p = store.get('profile', { name: 'Visitante', pin: '' });
        const name = h('input.input', { value: p.name, maxlength: 24 });
        const pin = h('input.input', { type: 'password', value: p.pin || '', placeholder: 'Sem PIN' , style: { width: '120px' } });
        main.append(h('h2', { text: 'Conta' }), h('p.sub', { text: 'Perfil local — não há servidor, nada sai do navegador.' }));
        const avatar = h('div.lock-avatar', { text: (p.name || 'V')[0].toUpperCase() });
        main.append(h('div.set-about', {}, avatar,
          h('div', {}, h('b', { text: p.name || 'Visitante' }), h('small', { text: 'Conta local · LuminOS ' + version }))));
        main.append(
          row('Seu nome', 'Aparece na tela de bloqueio e no chat', name),
          row('PIN de bloqueio', 'Deixe vazio para não pedir', pin),
          row('Salvar alterações', '', h('button.btn.primary', { text: 'Salvar', onclick: () => {
            store.set('profile', { ...p, name: name.value.trim() || 'Visitante', pin: pin.value });
            toast('Perfil atualizado', { kind: 'ok' });
            import('../desktop.js').then(({ applySettings }) => applySettings());
            renderMain();
          } })),
          row('Bloquear agora', 'Volta para a tela de bloqueio', h('button.btn', { html: icon('lock') + ' Bloquear', onclick: () => api?.lock?.() })),
          row('Sair / refazer a introdução', 'Apaga tudo e recomeça do zero',
            h('button.btn.danger', { text: 'Redefinir', onclick: () => confirmDialog({
              title: 'Redefinir o LuminOS?', text: 'Todos os dados locais (notas, fotos, configs) serão apagados.', danger: true, ok: 'Apagar tudo',
              onOk: () => resetUserdata(),
            }) })),
        );
      }

      if (section === 'shortcuts') {
        main.append(h('h2', { text: 'Atalhos de teclado' }), h('p.sub', { text: 'Produtividade em primeiro lugar.' }));
        const K = isMac ? '⌘' : 'Ctrl';
        const list = [
          [`${K} + K`, 'Abrir a busca de apps'],
          [`${K} + Space`, 'Command palette (ações)'],
          ['Alt + Tab', 'Alternar entre janelas'],
          [`${K} + W`, 'Fechar janela ativa'],
          [`${K} + M`, 'Minimizar janela ativa'],
          [`${K} + T`, 'Nova aba no navegador'],
          [`${K} + L`, 'Focar a barra de endereço'],
          [`${K} + ,`, 'Abrir Configurações'],
          ['F11', 'Tela cheia'],
          ['Esc', 'Fechar painéis e menus'],
          ['Alt + ← / →', 'Voltar / avançar no navegador'],
        ];
        const box = h('div.set-group', {});
        list.forEach(([k, d]) => box.append(h('div.kbd-row', {}, h('span', { text: d }), h('kbd', { text: k }))));
        main.append(box);
      }

      if (section === 'storage') {
        let total = 0;
        const rows = store.keys().map((k) => {
          const raw = localStorage.getItem('luminos:' + k) || '';
          const size = raw.length * 2;
          total += size;
          return { k, size };
        }).sort((a, b) => b.size - a.size);
        main.append(h('h2', { text: 'Armazenamento' }), h('p.sub', { text: 'Tudo é salvo no localStorage do navegador.' }));
        main.append(h('div.set-about', {},
          h('div', {}, h('b', { text: (total / 1024).toFixed(1) + ' KB em uso' }),
            h('small', { text: `${rows.length} chaves · limite típico ~5 MB` }))));
        const g = h('div.set-group', { style: { marginTop: '14px' } }, h('h3', { text: 'Chaves' }));
        rows.slice(0, 18).forEach((r) => {
          g.append(row(r.k, (r.size / 1024).toFixed(1) + ' KB',
            h('button.btn.subtle.icon', { html: icon('trash'), title: 'Remover', onclick: () => { store.del(r.k); renderMain(); } })));
        });
        main.append(g,
          row('Exportar backup', 'Baixa um JSON com todos os dados', h('button.btn', { html: icon('download') + ' Exportar', onclick: exportBackup })),
          row('Importar backup', 'Restaura um arquivo .json', h('label.btn', {}, h('span', { text: 'Importar' }),
            h('input', { type: 'file', accept: '.json', hidden: true, onchange: importBackup }))),
          row('Limpar cache de apps', 'Mantém notas, fotos e perfil', h('button.btn.danger', { text: 'Limpar', onclick: () => {
            ['ai.history', 'browser.history', 'games.scores'].forEach((k) => store.del(k));
            toast('Cache limpo', { kind: 'ok' });
          } })));
      }

      if (section === 'developer') {
        main.append(h('h2', { text: 'Avançado' }), h('p.sub', { text: 'Opções para quem gosta de mexer.' }));
        main.append(
          row('Mostrar painel de debug', 'Overlay com FPS e janelas abertas',
            toggleSwitch(store.get('debug', false), (v) => { store.set('debug', v); window.dispatchEvent(new CustomEvent('lumin:debug', { detail: { on: v } })); })),
          row('Forçar modo proxy', 'Útil para testar o navegador',
            toggleSwitch(store.get('browser.settings', {}).proxy && store.get('browser.settings', {}).proxy !== 'none', (v) => {
              const cur = store.get('browser.settings', {}); cur.proxy = v ? 'allorigins' : 'none';
              store.set('browser.settings', cur);
            })),
          row('API global', 'window.LuminOS.open("browser")',
            h('span.tiny', { text: 'disponível' })),
          row('Recarregar o sistema', 'Reinicia o shell sem apagar dados',
            h('button.btn', { html: icon('refresh') + ' Reiniciar', onclick: () => location.reload() })),
          row('Armazenamento local', `${store.keys().length} chaves · ${(store.keys().length)} registros`,
            h('button.btn.subtle', { text: 'Ver detalhes', onclick: () => { section = 'storage'; renderNav(); renderMain(); } })),
        );
      }

      if (section === 'about') {
        main.append(h('h2', { text: 'Sobre' }), h('p.sub', { text: 'LuminOS — um sistema operacional na web.' }));
        main.append(h('div.about-hero', {},
          h('div.orb'),
          h('h2', { text: 'LuminOS ' + version }),
          h('p', { text: 'Um desktop completo que roda inteiramente no navegador: janelas, apps, jogos e IA — sem servidor, sem cadastro, sem telemetria.' })));
        const kv = h('dl.kv', {});
        [
          ['Versão', version],
          ['Interface', 'HTML + CSS + JavaScript (ES modules)'],
          ['Dependências', 'Nenhuma'],
          ['Armazenamento', 'localStorage do navegador'],
          ['Tema atual', document.documentElement.dataset.theme],
          ['Plataforma', navigator.platform || '—'],
          ['Idioma', navigator.language],
        ].forEach(([k, v]) => kv.append(h('dt', { text: k }), h('dd', { text: String(v) })));
        main.append(kv, h('div.row', { style: { padding: '0 20px 24px', gap: '8px' } },
          h('button.btn.primary', { html: icon('refresh') + ' Ver novidades', onclick: () => modal({ title: 'Novidades', ok: 'Fechar', cancel: null, body: h('div', {}, h('p', { text: 'Versão ' + version }), h('ul', { style: { margin: '8px 0 0 16px', fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.9' } },
            h('li', { text: 'Gerenciador de janelas com encaixe e abas' }),
            h('li', { text: 'LuminAI com modo local e provedor externo' }),
            h('li', { text: 'Loja de apps e instalação no desktop' }),
            h('li', { text: 'Editor de código com preview ao vivo' }),
            h('li', { text: 'Jogos, pintura, música generativa' }))) }) }),
          h('button.btn', { html: icon('external') + ' GitHub', onclick: () => window.open('https://github.com/SuckingUpToesSry/LuminOS', '_blank', 'noopener') })));
      }
    }

    function manageBookmarks() {
      const list = store.get('browser.bookmarks', []);
      const wrap2 = h('div', { style: { display: 'grid', gap: '6px', maxHeight: '300px', overflow: 'auto' } });
      if (!list.length) wrap2.append(h('p.tiny', { text: 'Nenhum favorito ainda.' }));
      list.forEach((b, i) => {
        wrap2.append(h('div.set-row', { style: { marginBottom: 0 } },
          h('div.lbl', {}, h('b', { text: b.name }), h('small', { text: b.url })),
          h('button.btn.subtle.icon', { html: icon('trash'), onclick: () => {
            const l = store.get('browser.bookmarks', []);
            l.splice(i, 1);
            store.set('browser.bookmarks', l);
            close(); manageBookmarks();
          } })));
      });
      const m = modal({ title: 'Favoritos', body: wrap2, ok: 'Fechar', cancel: null });
      const close = () => m.close();
    }

    function exportBackup() {
      const data = {};
      store.keys().forEach((k) => { data[k] = store.get(k); });
      const blob = new Blob([JSON.stringify({ app: 'LuminOS', version, exported: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'luminos-backup.json' });
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Backup exportado', { kind: 'ok' });
    }

    async function importBackup(e) {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        if (!obj.data) throw new Error('formato inválido');
        Object.entries(obj.data).forEach(([k, v]) => store.set(k, v));
        toast('Backup restaurado — recarregando…', { kind: 'ok' });
        setTimeout(() => location.reload(), 900);
      } catch (err) { toast('Arquivo inválido: ' + err.message, { kind: 'err' }); }
    }

    renderNav(); renderMain();
    api?.onArgs?.((a) => { if (a?.section) { section = a.section; renderNav(); renderMain(); } });
    api?.onFocus?.(() => {});
    return {
      args(a) { if (a?.section) { section = a.section; renderNav(); renderMain(); } },
    };
  },
};

