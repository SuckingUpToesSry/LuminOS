/* ============================================================
   LuminOS — web apps criados pelo usuário + Sobre
   ============================================================ */

import { h, store, uid, bytes, isMac } from '../core.js';
import { icon } from '../icons.js';
import { downloadBlob, confirmDialog, toast } from '../ui.js';

export function webAppMount(body, api, cfg) {
  body.innerHTML = '';
  const bar = h('div.app-toolbar', {},
    h('span.chip.accent', { text: cfg.emoji || '🌐' }),
    h('b', { text: cfg.name }),
    h('span.tiny', { text: cfg.url.replace(/^https?:\/\//, '').slice(0, 40) }),
    h('span.grow'),
    h('button.btn.subtle.icon', { html: icon('refresh'), title: 'Recarregar', onclick: () => frame.setAttribute('src', cfg.url) }),
    h('button.btn.subtle.icon', { html: icon('external'), title: 'Abrir fora', onclick: () => window.open(cfg.url, '_blank', 'noopener') }));
  const frame = h('iframe', {
    src: cfg.url, style: { flex: '1', border: '0', background: '#fff', width: '100%' },
    referrerpolicy: 'no-referrer', allow: 'fullscreen; autoplay',
  });
  const notice = h('div.br-blocked', { hidden: true });
  const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } }, bar, frame, notice);
  body.append(wrap);

  setTimeout(() => {
    try {
      const doc = frame.contentDocument;
      if (doc && doc.location.href === 'about:blank') show();
    } catch {}
    show();
  }, 4500);
  function show() {
    notice.hidden = true;
  }
  return {};
}

export const aboutApp = {
  id: 'about', name: 'Sobre o LuminOS', glyph: 'info', grad: ['#8b93a7', '#5f6a80'],
  size: { w: 520, h: 480 }, category: 'Sistema', desktop: true, singleton: true,
  mount(body, api) {
    body.innerHTML = '';
    const wrap = h('div', { style: { padding: '10px 0 24px' } });
    wrap.append(
      h('div.about-hero', {},
        h('div.orb'),
        h('h2', { text: 'LuminOS 1.0' }),
        h('p', { text: 'Um sistema operacional de bolso para a web. Leve, minimalista e inteiramente seu — sem contas, sem servidores, sem rastreamento.' })),
      h('dl.kv', {},
        ...[
          ['Interface', 'HTML, CSS e JavaScript puro'],
          ['Dependências', 'zero'],
          ['Tamanho', '< 150 KB (sem imagens)'],
          ['Dados', 'localStorage — só no seu navegador'],
          ['Apps', '19 incluídos + apps ilimitados'],
          ['Licença', 'MIT'],
        ].flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
      h('div.row', { style: { padding: '6px 20px', gap: '8px', flexWrap: 'wrap' } },
        h('button.btn.primary', { html: icon('grid') + ' Ver apps', onclick: () => api?.open('store') }),
        h('button.btn', { html: icon('terminal') + ' Terminal', onclick: () => api?.open('terminal') }),
        h('button.btn', { html: icon('external') + ' GitHub', onclick: () => window.open('https://github.com/SuckingUpToesSry/LuminOS', '_blank', 'noopener') })),
      h('p.tiny', { style: { padding: '14px 20px 0', textAlign: 'center' },
        text: 'Feito para rodar em qualquer navegador moderno. Adicione à tela inicial do celular para uma experiência de app.' }));
    body.append(wrap);
    return {};
  },
};
