/* ============================================================
   LuminOS — Loja de apps (instala/desinstala apps do desktop)
   ============================================================ */

import { h, store, sound } from '../core.js';
import { icon } from '../icons.js';
import { toast } from '../ui.js';
import { registry } from '../registry.js';

const INSTALLED = 'store.installed';

const ITEMS = [
  { id: 'browser', name: 'LuminBrowser', desc: 'Navegador com abas, favoritos e modo proxy.', cat: 'Internet', rating: 4.8, tag: 'Incluído', size: '—' },
  { id: 'ai', name: 'LuminAI', desc: 'Assistente de IA offline ou com provedor próprio.', cat: 'Sistema', rating: 4.9, tag: 'Incluído', size: '—' },
  { id: 'notes', name: 'Notas', desc: 'Editor de notas com autosave e exportação.', cat: 'Produtividade', rating: 4.6, tag: 'Incluído', size: '—' },
  { id: 'music', name: 'Música', desc: 'Sintetizador generativo com 5 faixas.', cat: 'Mídia', rating: 4.4, tag: 'Incluído', size: '—' },
  { id: 'paint', name: 'Paint', desc: 'Desenhe com pincéis, formas e exporte PNG.', cat: 'Mídia', rating: 4.7, tag: 'Novo', size: '18 KB' },
  { id: 'terminal', name: 'Terminal', desc: 'Shell com comandos do sistema LuminOS.', cat: 'Sistema', rating: 4.5, tag: 'Incluído', size: '—' },
  { id: 'code', name: 'Editor de Código', desc: 'HTML/CSS/JS com pré-visualização ao vivo.', cat: 'Produtividade', rating: 4.6, tag: 'Novo', size: '24 KB' },
  { id: 'clock', name: 'Relógio', desc: 'Relógio analógico, cronômetro e fusos.', cat: 'Utilidades', rating: 4.2, tag: '', size: '9 KB' },
  { id: 'calendar', name: 'Calendário', desc: 'Eventos, notas por dia e visão mensal.', cat: 'Utilidades', rating: 4.3, tag: '', size: '11 KB' },
  { id: 'chat', name: 'Chat Global', desc: 'Sala local com mensagens persistentes.', cat: 'Social', rating: 4.0, tag: '', size: '12 KB' },
  { id: 'creator', name: 'App Creator', desc: 'Crie atalhos de web apps no desktop.', cat: 'Sistema', rating: 4.1, tag: '', size: '7 KB' },
  { id: 'files', name: 'Arquivos', desc: 'Gerencie arquivos e pastas do sistema.', cat: 'Sistema', rating: 4.4, tag: 'Incluído', size: '—' },
  { id: 'games', name: 'Jogos', desc: '7 jogos clássicos feitos em canvas.', cat: 'Jogos', rating: 4.7, tag: 'Popular', size: '32 KB' },
  { id: 'soundboard', name: 'Soundboard', desc: '16 pads sintetizados em tempo real.', cat: 'Mídia', rating: 4.3, tag: '', size: '6 KB' },
  { id: 'camera', name: 'Câmera', desc: 'Capture fotos e vídeos direto no navegador.', cat: 'Mídia', rating: 4.2, tag: 'Novo', size: '9 KB' },
  { id: 'links', name: 'Links', desc: 'Seus atalhos favoritos com categorias.', cat: 'Internet', rating: 4.4, tag: 'Novo', size: '5 KB' },
  { id: 'feedback', name: 'Sugestões', desc: 'Anote ideias e avalie o sistema.', cat: 'Social', rating: 4.1, tag: '', size: '4 KB' },
  { id: 'photos', name: 'Fotos', desc: 'Galeria local com lightbox e wallpaper.', cat: 'Mídia', rating: 4.2, tag: '', size: '8 KB' },
];

export function installed() { return store.get(INSTALLED, null); }
export function isInstalled(id) {
  const l = installed();
  if (!l) return false;
  return l.includes(id);
}
export function install(id) {
  const l = installed() || [];
  if (!l.includes(id)) { l.push(id); store.set(INSTALLED, l); }
  sound.ok();
}
export function uninstall(id) {
  const l = (installed() || []).filter((x) => x !== id);
  store.set(INSTALLED, l);
  sound.close();
}

export const storeApp = {
  id: 'store', name: 'Loja', glyph: 'store', grad: ['#5eb0ff', '#7d5cff'],
  size: { w: 800, h: 580 }, category: 'Sistema', dock: true, desktop: true, singleton: true,
  mount(body, api) {
    let cat = 'Todos';
    const cats = ['Todos', ...new Set(ITEMS.map((i) => i.cat))];

    body.innerHTML = '';
    const wrap = h('div.store');
    const hero = h('div.store-hero', {},
      h('h2', { text: 'Apps para o seu desktop' }),
      h('p', { text: 'Tudo roda local, sem instalação externa. Apps “Incluídos” já vêm no sistema; os demais você pode adicionar ao desktop em um clique.' }));
    const catRow = h('div.store-cats');
    const grid = h('div.store-grid');
    wrap.append(hero, catRow, grid);
    body.append(wrap);

    function renderCats() {
      catRow.innerHTML = '';
      cats.forEach((c) => {
        const b = h('button.chip', { class: c === cat ? 'accent' : '', text: c, style: { cursor: 'pointer', padding: '5px 11px' } });
        b.onclick = () => { cat = c; renderCats(); render(); };
        catRow.append(b);
      });
    }

    function render() {
      grid.innerHTML = '';
      ITEMS.filter((i) => cat === 'Todos' || i.cat === cat).forEach((it) => {
        const app = registry.get(it.id);
        const isCore = it.tag === 'Incluído';
        const onDesktop = isCore || isInstalled(it.id);
        const card = h('div.store-card', {},
          h('div.cover', { text: app?.glyph ? '' : '📦' },
            app ? h('span', { html: '' }) : null,
            h('span.tag.chip', { class: isCore ? '' : 'accent', text: isCore ? 'Incluído' : (it.tag || 'Extra') })),
          h('div.body', {},
            h('b', { text: it.name }),
            h('p', { text: it.desc }),
            h('.foot', {},
              h('span.stars', { text: '★'.repeat(Math.round(it.rating)) + '☆'.repeat(5 - Math.round(it.rating)) }),
              h('span.tiny', { text: it.rating.toFixed(1) })),
            h('button.btn', {
              style: { marginTop: '6px', justifyContent: 'center' },
              class: onDesktop ? '' : 'primary',
              html: onDesktop ? (isCore ? icon('check') + ' Instalado' : icon('check') + ' No desktop') : icon('plus') + ' Adicionar',
              disabled: isCore,
              onclick: () => {
                if (isCore) return;
                if (onDesktop) { uninstall(it.id); toast(`${it.name} removido do desktop`); }
                else { install(it.id); toast(`${it.name} adicionado ao desktop`, { kind: 'ok' }); }
                render();
                import('../desktop.js').then(({ refreshIcons }) => refreshIcons());
              },
            })));
        // paint the cover with the app icon
        const cov = card.querySelector('.cover');
        if (app) {
          import('../icons.js').then(({ appIcon }) => {
            cov.innerHTML = '';
            cov.append(h('span', { html: appIcon(app, ''), style: { width: '46px', height: '46px', display: 'block' } }));
            cov.append(h('span.tag.chip', { class: isCore ? '' : 'accent', text: isCore ? 'Incluído' : (it.tag || 'Extra') }));
          });
        }
        card.querySelector('.body b').onclick = null;
        card.addEventListener('dblclick', () => app && api?.open(it.id));
        grid.append(card);
      });
    }

    renderCats(); render();
    api?.onArgs?.((a) => { if (a?.cat) { cat = a.cat; renderCats(); render(); } });
    return {};
  },
};
