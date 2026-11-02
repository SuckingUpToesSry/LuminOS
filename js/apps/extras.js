/* ============================================================
   LuminOS — Câmera, Links, Feedback
   ============================================================ */

import { h, store, uid, sound, relTime } from '../core.js';
import { icon } from '../icons.js';
import { toast, promptDialog, confirmDialog, downloadBlob } from '../ui.js';

/* ══════════════════ CÂMERA ══════════════════ */
export const cameraApp = {
  id: 'camera', name: 'Câmera', glyph: 'camera', grad: ['#4a5161', '#8b93a7'],
  size: { w: 720, h: 540 }, category: 'Mídia', desktop: true, singleton: true,
  mount(body, api) {
    body.innerHTML = '';
    let stream = null, facing = 'user', timer = null, countdown = 0;

    const video = h('video', {
      autoplay: '', playsinline: '', muted: '',
      style: { width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none' },
    });
    const placeholder = h('div', { style: {
      position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', gap: '10px',
      textAlign: 'center', padding: '20px', color: 'var(--text-3)', background: 'var(--bg-2)',
    } }, h('div', { style: { fontSize: '34px' }, text: '📷' }),
      h('b', { style: { color: 'var(--text-2)', fontSize: '13px' }, text: 'Câmera desligada' }),
      h('p', { style: { fontSize: '11.5px', maxWidth: '300px' }, text: 'Seu navegador pedirá permissão. Nada é enviado para nenhum servidor — a captura fica só aqui.' }));

    const stage = h('div', { style: { flex: '1', position: 'relative', minHeight: '0', background: '#000', overflow: 'hidden' } }, video, placeholder);
    const thumbRow = h('div', { style: { display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px 10px', borderTop: '1px solid var(--line)' } });
    const status = h('div.app-status');

    const startBtn = h('button.btn.primary', { html: icon('video') + ' Ligar câmera' });
    const snapBtn = h('button.btn', { html: icon('camera') + ' Capturar', disabled: true });
    const flipBtn = h('button.btn.subtle.icon', { html: icon('refresh'), title: 'Virar câmera' });
    const timerBtn = h('button.btn.subtle.icon', { html: icon('clock'), title: 'Temporizador 3s' });
    const recBtn = h('button.btn.subtle', { html: icon('film') + ' Gravar 5s' });

    const bar = h('div.app-toolbar', {}, startBtn, snapBtn, h('span.grow'), timerBtn, recBtn, flipBtn);
    body.append(h('div.app', {}, bar, stage, thumbRow, status));

    function setStatus(t) {
      status.innerHTML = '';
      status.append(h('span', { text: t }));
    }
    setStatus('Câmera desligada');

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast('Este navegador não expõe a câmera', { kind: 'err' });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        video.srcObject = stream;
        placeholder.hidden = true;
        startBtn.innerHTML = icon('x') + ' Desligar';
        snapBtn.disabled = false;
        setStatus('Câmera ativa · ' + (video.videoWidth || '—') + '×' + (video.videoHeight || '—'));
        sound.ok();
      } catch (err) {
        toast('Permissão negada ou câmera indisponível', { kind: 'err' });
        setStatus('Sem acesso à câmera: ' + err.name);
      }
    }
    function stop() {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
      placeholder.hidden = false;
      startBtn.innerHTML = icon('video') + ' Ligar câmera';
      snapBtn.disabled = true;
      setStatus('Câmera desligada');
    }
    startBtn.onclick = () => (stream ? stop() : start());

    function capture() {
      if (!stream) return null;
      const c = document.createElement('canvas');
      c.width = video.videoWidth || 640;
      c.height = video.videoHeight || 480;
      const ctx = c.getContext('2d');
      if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', .9);
    }

    function saveShot(data) {
      const photos = store.get('photos.items', []);
      photos.unshift({ id: uid('p'), name: 'camera-' + Date.now() + '.jpg', data, ts: Date.now() });
      store.set('photos.items', photos.slice(0, 60));
      renderThumbs();
      sound.tone({ freq: 1100, dur: .06, gain: .1 });
      toast('Foto salva em Fotos', { kind: 'ok' });
    }

    function renderThumbs() {
      thumbRow.innerHTML = '';
      const photos = store.get('photos.items', []).slice(0, 10);
      if (!photos.length) {
        thumbRow.append(h('span.tiny', { style: { padding: '6px' }, text: 'Suas capturas aparecerão aqui.' }));
        return;
      }
      photos.forEach((p) => {
        const img = h('img', { src: p.data, style: {
          width: '52px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--line)', cursor: 'pointer',
        } });
        img.onclick = () => downloadBlob(p.name, p.data.split(',')[1] ? dataURLtoBlob(p.data) : p.data);
        img.oncontextmenu = (e) => {
          e.preventDefault();
          confirmDialog({ title: 'Apagar foto?', danger: true, ok: 'Apagar', onOk: () => {
            store.set('photos.items', store.get('photos.items', []).filter((x) => x.id !== p.id));
            renderThumbs();
          } });
        };
        thumbRow.append(img);
      });
    }
    function dataURLtoBlob(u) {
      const [head, b64] = u.split(',');
      const mime = head.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }

    snapBtn.onclick = () => {
      if (countdown) return;
      const fire = () => {
        const d = capture();
        if (d) saveShot(d);
      };
      if (!timerRequested) return fire();
      countdown = 3;
      const badge = h('div', { style: {
        position: 'absolute', inset: '0', display: 'grid', placeItems: 'center',
        fontSize: '64px', color: '#fff', textShadow: '0 4px 20px #000', background: 'rgba(0,0,0,.25)',
      }, text: '3' });
      stage.append(badge);
      const iv = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(iv); badge.remove(); timerRequested = false; fire(); return;
        }
        badge.textContent = String(countdown);
        sound.tone({ freq: 600, dur: .06, gain: .08 });
      }, 1000);
      sound.tone({ freq: 900, dur: .08, gain: .1 });
    };

    let timerRequested = false;
    timerBtn.onclick = () => {
      timerRequested = !timerRequested;
      timerBtn.classList.toggle('primary', timerRequested);
      toast(timerRequested ? 'Temporizador de 3s ativado' : 'Temporizador desativado');
    };

    recBtn.onclick = () => {
      if (!stream) return toast('Ligue a câmera primeiro', { kind: 'err' });
      if (!window.MediaRecorder) return toast('Gravação não suportada aqui', { kind: 'err' });
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '' });
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        downloadBlob('luminos-camera-' + Date.now() + '.webm', blob);
        toast('Vídeo gravado (5s)', { kind: 'ok' });
        setStatus('Câmera ativa');
      };
      rec.start();
      setStatus('● Gravando… 5s');
      recBtn.disabled = true;
      setTimeout(() => { rec.stop(); recBtn.disabled = false; }, 5000);
    };

    flipBtn.onclick = async () => {
      facing = facing === 'user' ? 'environment' : 'user';
      video.style.transform = facing === 'user' ? 'scaleX(-1)' : 'none';
      if (stream) { stop(); await start(); }
    };

    renderThumbs();
    api?.onClose?.(stop);
    api?.onClose?.(() => clearInterval(timer));
    return { onClose: stop };
  },
};

/* ══════════════════ LINKS ══════════════════ */
const DEFAULT_LINKS = [
  { name: 'Wikipedia', url: 'https://pt.wikipedia.org', cat: 'Estudo' },
  { name: 'GitHub', url: 'https://github.com', cat: 'Dev' },
  { name: 'YouTube', url: 'https://youtube.com', cat: 'Mídia' },
  { name: 'Archive.org', url: 'https://archive.org', cat: 'Estudo' },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', cat: 'Dev' },
  { name: 'Wiktionary', url: 'https://pt.wiktionary.org', cat: 'Estudo' },
  { name: 'OpenStreetMap', url: 'https://openstreetmap.org', cat: 'Utilidades' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', cat: 'Dev' },
];

export const linksApp = {
  id: 'links', name: 'Links', glyph: 'link', grad: ['#5eb0ff', '#31c9a3'],
  size: { w: 660, h: 500 }, category: 'Internet', desktop: true, singleton: true,
  mount(body) {
    const KEY = 'links.items';
    let links = store.get(KEY, DEFAULT_LINKS);
    let filter = 'Todos';
    body.innerHTML = '';
    const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } });
    const cats = h('div.store-cats');
    const grid = h('div', { style: { padding: '4px 20px 24px', display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '9px' } });
    const bar = h('div.app-toolbar', {},
      h('span.chip.accent', { html: icon('link') + ' Seus atalhos' }),
      h('span.grow'),
      h('button.btn.primary', { html: icon('plus') + ' Novo link', onclick: addLink }));
    wrap.append(bar, cats, grid);
    body.append(wrap);

    function addLink() {
      let name = '', url = '', cat = 'Geral';
      import('../ui.js').then(({ modal }) => {
        const nI = h('input.input', { placeholder: 'Wikipedia' });
        const uI = h('input.input', { placeholder: 'https://…' });
        const cI = h('input.input', { placeholder: 'Categoria', value: 'Geral' });
        modal({
          title: 'Novo link', ok: 'Adicionar',
          body: [
            h('.field', {}, h('span', { text: 'Nome' }), nI),
            h('.field', {}, h('span', { text: 'URL' }), uI),
            h('.field', {}, h('span', { text: 'Categoria' }), cI),
          ],
          onOk: () => {
            name = nI.value.trim(); url = uI.value.trim(); cat = cI.value.trim() || 'Geral';
            if (!name || !url) return false;
            links.push({ name, url: url.startsWith('http') ? url : 'https://' + url, cat });
            store.set(KEY, links);
            render();
            toast('Link adicionado', { kind: 'ok' });
          },
        });
      });
    }

    function render() {
      const all = ['Todos', ...new Set(links.map((l) => l.cat))];
      cats.innerHTML = '';
      all.forEach((c) => {
        const b = h('button.chip', { class: c === filter ? 'accent' : '', text: c, style: { cursor: 'pointer', padding: '5px 11px' } });
        b.onclick = () => { filter = c; render(); };
        cats.append(b);
      });
      grid.innerHTML = '';
      links.filter((l) => filter === 'Todos' || l.cat === filter).forEach((l, i) => {
        let host = l.url;
        try { host = new URL(l.url).host.replace('www.', ''); } catch {}
        const card = h('div.store-card', {},
          h('.cover', { style: { height: '52px' }, html: icon('globe') }),
          h('.body', {},
            h('b', { text: l.name }),
            h('p', { text: host }),
            h('.foot', {},
              h('span.chip', { text: l.cat }),
              h('button.btn.subtle.icon', { html: icon('trash'), title: 'Remover', onclick: (e) => {
                e.stopPropagation();
                links = links.filter((x) => x !== l);
                store.set(KEY, links); render();
              } }))));
        card.onclick = () => {
          import('../desktop.js').then(({ openApp }) => {
            import('../wm.js').then(({ wm }) => {
              import('../registry.js').then(({ resolveApp }) => {
                wm.open(resolveApp('browser'), { args: { url: l.url } });
              });
            });
          });
        };
        grid.append(card);
      });
      void 0;
    }
    render();
    return {};
  },
};

/* ══════════════════ FEEDBACK ══════════════════ */
export const feedbackApp = {
  id: 'feedback', name: 'Sugestões', glyph: 'star', grad: ['#f5b955', '#f0709a'],
  size: { w: 620, h: 500 }, category: 'Social', desktop: true, singleton: true,
  mount(body) {
    const KEY = 'feedback.items';
    let items = store.get(KEY, []);
    let rating = 0;
    body.innerHTML = '';
    const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' } });

    const stars = h('div', { style: { display: 'flex', gap: '5px' } });
    [...Array(5)].forEach((_, i) => {
      const b = h('button', { html: icon('star'), style: { color: 'var(--text-3)', padding: '3px' } });
      b.onclick = () => {
        rating = i + 1;
        [...stars.children].forEach((c, j) => { c.style.color = j <= i ? 'var(--warn)' : 'var(--text-3)'; });
        sound.click();
      };
      stars.append(b);
    });
    const cat = h('select.select', {}, ...['Ideia', 'Bug', 'Elogio', 'Outro'].map((c) => h('option', { value: c, text: c })));
    const text = h('textarea.input', { rows: 4, placeholder: 'Conte o que você gostaria de ver no LuminOS…' });
    const list = h('div', { style: { display: 'grid', gap: '6px', padding: '0 20px 20px' } });

    const send = h('button.btn.primary', { html: icon('send') + ' Enviar sugestão', onclick: () => {
      const t = text.value.trim();
      if (!t) return toast('Escreva algo primeiro', { kind: 'err' });
      items.unshift({ id: uid('f'), text: t, cat: cat.value, rating, ts: Date.now() });
      store.set(KEY, items);
      text.value = ''; rating = 0;
      [...stars.children].forEach((c) => { c.style.color = 'var(--text-3)'; });
      render();
      toast('Obrigado pela sugestão! 💛', { kind: 'ok' });
      sound.ok();
    } });

    function render() {
      list.innerHTML = '';
      if (!items.length) {
        list.append(h('div.empty', { style: { padding: '20px' } }, h('b', { text: 'Nenhuma sugestão ainda' }),
          h('p', { text: 'As enviadas ficam salvas no seu navegador — este é um sistema local.' })));
        return;
      }
      items.forEach((it) => {
        list.append(h('div.set-row', { style: { marginBottom: 0 } },
          h('div.lbl', {}, h('b', { text: it.cat + (it.rating ? ' · ' + '★'.repeat(it.rating) : '') }),
            h('small', { text: it.text }), h('small', { text: relTime(it.ts) })),
          h('button.btn.subtle.icon', { html: icon('trash'), onclick: () => {
            items = items.filter((x) => x.id !== it.id); store.set(KEY, items); render();
          } })));
      });
    }

    wrap.append(
      h('div', { style: { padding: '20px 20px 8px', display: 'grid', gap: '10px' } },
        h('h2', { text: 'Sugestões & feedback', style: { fontSize: '18px' } }),
        h('p.tiny', { text: 'Este sistema é local: seu recado fica guardado no navegador e serve como bloco de notas de ideias.' }),
        h('.field', {}, h('span', { text: 'Nota' }), stars),
        h('.field', {}, h('span', { text: 'Categoria' }), cat),
        h('.field', {}, h('span', { text: 'Mensagem' }), text),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, send),
        h('h3', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-3)', marginTop: '6px' }, text: 'Enviadas' })),
      list);
    body.append(wrap);
    render();
    void promptDialog;
    return {};
  },
};
