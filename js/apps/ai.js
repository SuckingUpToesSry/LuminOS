/* ============================================================
   LuminOS — IA (assistente local + suporte a provedor externo)
   ============================================================ */

import { h, store, uid, esc, sound } from '../core.js';
import { icon } from '../icons.js';
import { modal } from '../ui.js';

const KEY = 'ai.settings';
const HIST = 'ai.history';

function settings() {
  return store.get(KEY, { provider: 'local', endpoint: '', model: '', key: '', system: 'Você é o LuminOS, um assistente útil, direto e amigável. Responda em português do Brasil.' });
}

const SUGGESTIONS = [
  'Explique o que é LuminOS em 3 frases',
  'Me ajude a escrever um e-mail curto',
  'Dicas para estudar melhor',
  'Resuma o que é computação em nuvem',
  'Ideias de nomes para um projeto',
];

/* ── local reply engine (offline, deterministic-ish) ─────── */
function localReply(prompt) {
  const p = prompt.toLowerCase().trim();
  const has = (...w) => w.some((x) => p.includes(x));

  if (has('oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'e aí', 'eai') && p.length < 24)
    return 'Olá! 👋 Eu sou o assistente do LuminOS. Posso ajudar com textos, resumos, ideias, explicações e código. O que você precisa?';

  if (has('quem é você', 'quem e voce', 'o que você é', 'seu nome'))
    return 'Sou o assistente integrado do LuminOS. Funciono offline por padrão — sem enviar nada para servidores. Você pode conectar um provedor de IA real em Configurações → IA.';

  if (has('luminos', 'lumin os', 'este sistema'))
    return 'O LuminOS é um "sistema operacional" que roda inteiro no navegador: janelas arrastáveis, navegador com abas, notas, IA, jogos, música, terminal e uma loja de apps. Não precisa de instalação, e seus dados ficam no seu próprio navegador.';

  if (has('piada', 'humor', 'engraçado'))
    return 'Por que o programador foi ao médico? Porque estava com um bug no sistema imunológico. 🐛\n\nQuer outra? É só pedir.';

  if (has('receita', 'cozinhar', 'comida'))
    return 'Não sou chef, mas posso sugerir: macarrão alho e óleo em 15 min — água fervendo, alho dourado no azeite, mistura, salsinha e pronto. Quer que eu monte uma lista de compras?';

  if (has('email', 'e-mail', 'carta'))
    return 'Aqui vai um modelo curto:\n\n"Olá [nome],\n\nTudo bem? Escrevo para [motivo em uma frase]. Podemos conversar ainda esta semana? Fico à disposição.\n\nAbraços,\n[seu nome]"\n\nTroque os campos entre colchetes e me diga se quer um tom mais formal.';

  if (has('estudar', 'estudo', 'aprender'))
    return 'Três coisas que funcionam de verdade:\n\n1. **Blocos de 25 min** com pausa de 5 (pomodoro).\n2. **Recordação ativa** — feche o material e tente lembrar/resumir em voz alta.\n3. **Revisão espaçada** — revise em 1 dia, 1 semana, 1 mês.\n\nAplicar um só já melhora muito. Quer um plano de 7 dias?';

  if (has('código', 'codigo', 'javascript', 'python', 'função', 'funcao'))
    return 'Claro. Um exemplo de função com debounce em JavaScript:\n\n```js\nexport const debounce = (fn, ms = 250) => {\n  let t;\n  return (...args) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n};\n```\n\nMe diga a linguagem e o objetivo e eu adapto.';

  if (has('resum', 'resumo'))
    return 'Posso resumir, mas preciso do texto 😄 — cole aqui o conteúdo e eu devolvo em 3 tópicos principais + uma frase de conclusão.';

  if (has('nuvem', 'cloud', 'computação em nuvem'))
    return 'Computação em nuvem é alugar poder de computação pela internet em vez de comprar servidores. Em vez de um PC parado no seu escritório, você usa máquinas de um provedor sob demanda — pagando apenas o que consome.';

  if (has('obrigad', 'valeu', 'brigado'))
    return 'De nada! Se precisar de mais alguma coisa, é só abrir este app. ✨';

  if (has('hora', 'que horas'))
    return `Agora são ${new Date().toLocaleTimeString('pt-BR')} em ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`;

  if (p.endsWith('?')) {
    return `Boa pergunta. Pelo meu modo local (offline), posso te dar um caminho:\n\n• Divida o problema em 2 ou 3 partes menores.\n• Escreva o que você já sabe e o que falta.\n• Teste a menor hipótese possível.\n\nPara respostas completas de IA, conecte um provedor em **Configurações → IA** (compatível com OpenAI).`;
  }

  return `Entendi: "${prompt.slice(0, 120)}".\n\nEstou no modo local (offline), então minhas respostas são baseadas em modelos prontos. Posso ajudar com:\n\n• textos e e-mails\n• explicações curtas\n• ideias e listas\n• trechos de código\n\nQuer que eu tente um desses?`;
}

async function remoteReply(prompt, cfg, history) {
  const messages = [
    { role: 'system', content: cfg.system || 'Você é um assistente útil.' },
    ...history.slice(-8).map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: prompt },
  ];
  const res = await fetch(cfg.endpoint.replace(/\/$/, ''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cfg.key ? { Authorization: 'Bearer ' + cfg.key } : {}) },
    body: JSON.stringify({ model: cfg.model || undefined, messages, stream: false }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || data?.message?.content || JSON.stringify(data).slice(0, 600);
}

export function mountAI(body, api) {
  let messages = store.get(HIST, []);
  let busy = false;
  const cfg0 = settings();

  body.innerHTML = '';
  const wrap = h('div.ai');
  const head = h('div.ai-head',
    h('span.chip.accent', { html: icon('spark') + ' LuminAI' }),
    h('b', { text: cfg0.provider === 'local' ? 'Modo local' : 'Provedor conectado' }),
    h('span.grow', { style: { flex: '1' } }),
    h('button.btn.icon.subtle', { html: icon('settings'), title: 'Configurar IA', onclick: openSettings }),
    h('button.btn.icon.subtle', { html: icon('trash'), title: 'Limpar conversa', onclick: () => { messages = []; store.set(HIST, []); render(); } }));

  const scroll = h('div.ai-scroll');
  const ta = h('textarea', { rows: 1, placeholder: 'Pergunte alguma coisa…  (Enter envia · Shift+Enter quebra linha)' });
  const sendBtn = h('button.ai-send', { html: icon('send'), title: 'Enviar', disabled: true });
  const compose = h('div.ai-compose',
    h('div.ai-inputwrap', {}, ta, sendBtn),
    h('div.ai-foot', {},
      h('span', { text: 'Enter envia · Shift+Enter nova linha' }),
      h('span', { id: 'ai-count', text: `${messages.length} mensagens` })));

  wrap.append(head, scroll, compose);
  body.append(wrap);

  function render() {
    scroll.innerHTML = '';
    if (!messages.length) {
      const hero = h('div.ai-hero', {},
        h('div.orb'),
        h('h2', { text: 'Como posso ajudar?' }),
        h('p', { text: 'Assistente do LuminOS · ' + (settings().provider === 'local' ? 'offline' : 'conectado') }));
      const sug = h('div.ai-sugg');
      SUGGESTIONS.forEach((s) => {
        const b = h('button', { text: s });
        b.onclick = () => { ta.value = s; send(); };
        sug.append(b);
      });
      hero.append(sug);
      scroll.append(hero);
    } else {
      messages.forEach((m) => scroll.append(bubble(m)));
    }
    const c = document.getElementById('ai-count');
    if (c) c.textContent = `${messages.length} mensagens`;
    scroll.scrollTop = scroll.scrollHeight;
  }

  function bubble(m) {
    const isAI = m.role === 'ai';
    const text = h('div.bubble');
    text.innerHTML = format(m.text);
    return h(`div.msg.${isAI ? 'ai' : 'me'}`, {},
      h('div.av', { text: isAI ? 'AI' : (store.get('profile.name', 'Você')[0] || 'V').toUpperCase() }),
      text);
  }

  function format(t) {
    let out = esc(t);
    out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code.trim()}</pre>`);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return out;
  }

  function autosize() {
    ta.style.height = 'auto';
    ta.style.height = Math.min(130, ta.scrollHeight) + 'px';
    sendBtn.disabled = !ta.value.trim() || busy;
  }
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.onclick = () => send();

  async function send() {
    const text = ta.value.trim();
    if (!text || busy) return;
    ta.value = ''; autosize();
    busy = true; sendBtn.disabled = true;
    messages.push({ id: uid('m'), role: 'user', text, ts: Date.now() });
    store.set(HIST, messages);
    render();

    const typing = h('div.msg.ai', {}, h('div.av', { text: 'AI' }),
      h('div.bubble', {}, h('span.typing', {}, h('i'), h('i'), h('i'))));
    scroll.append(typing);
    scroll.scrollTop = scroll.scrollHeight;

    const cfg = settings();
    let replyText = '';
    try {
      if (cfg.provider === 'local' || !cfg.endpoint) {
        await new Promise((r) => setTimeout(r, 420 + Math.random() * 380));
        replyText = localReply(text);
      } else {
        replyText = await remoteReply(text, cfg, messages.slice(0, -1));
      }
    } catch (err) {
      replyText = `⚠️ Não consegui falar com o provedor (${err.message}).\n\nVerifique a URL do endpoint em Configurações → IA. Enquanto isso, minha resposta local:\n\n${localReply(text)}`;
    }
    typing.remove();
    messages.push({ id: uid('m'), role: 'ai', text: replyText, ts: Date.now() });
    store.set(HIST, messages);
    busy = false;
    render();
    sound.ok();
  }

  function openSettings() {
    const cfg = settings();
    const provider = h('select.select', {},
      h('option', { value: 'local', text: 'Local (offline, sem chave)' }),
      h('option', { value: 'openai', text: 'Compatível com OpenAI (/chat/completions)' }),
      h('option', { value: 'ollama', text: 'Ollama local (http://localhost:11434/v1/chat/completions)' }));
    provider.value = cfg.provider;
    const endpoint = h('input.input', { placeholder: 'https://api.openai.com/v1/chat/completions', value: cfg.endpoint });
    const model = h('input.input', { placeholder: 'gpt-4o-mini', value: cfg.model });
    const key = h('input.input', { type: 'password', placeholder: 'sk-…', value: cfg.key });
    const sys = h('textarea.input', { rows: 3, placeholder: 'Instruções do sistema', value: cfg.system });
    const hint = h('p.tiny', { text: 'A chave fica apenas no seu navegador (localStorage). Nada é enviado a terceiros além do endpoint que você escolher.' });

    provider.onchange = () => {
      const p = provider.value;
      if (p === 'openai') { endpoint.value = cfg.endpoint || 'https://api.openai.com/v1/chat/completions'; model.value = cfg.model || 'gpt-4o-mini'; }
      if (p === 'ollama') { endpoint.value = 'http://localhost:11434/v1/chat/completions'; model.value = 'llama3.1'; }
      if (p === 'local') { endpoint.value = ''; }
    };

    modal({
      title: 'Assistente de IA',
      body: [
        h('.field', {}, h('span', { text: 'Provedor' }), provider),
        h('.field', {}, h('span', { text: 'Endpoint' }), endpoint),
        h('.field', {}, h('span', { text: 'Modelo' }), model),
        h('.field', {}, h('span', { text: 'Chave de API' }), key),
        h('.field', {}, h('span', { text: 'Instruções' }), sys),
        hint,
      ],
      ok: 'Salvar',
      onOk: () => {
        store.set(KEY, { provider: provider.value, endpoint: endpoint.value.trim(), model: model.value.trim(), key: key.value.trim(), system: sys.value });
        inst.refresh();
        sound.ok();
      },
    });
  }

  function refresh() {
    const cfg = settings();
    head.querySelector('b').textContent = cfg.provider === 'local' ? 'Modo local' : 'Provedor conectado';
    render();
  }

  const inst = {
    args(a) {
      if (a?.prompt) { ta.value = a.prompt; send(); }
    },
  };
  api?.onArgs?.((a) => { if (a?.prompt) { ta.value = a.prompt; send(); } });
  if (api?.args?.prompt) { ta.value = api.args.prompt; setTimeout(() => send(), 120); }

  render();
  setTimeout(() => ta.focus(), 80);
  return inst;
}

export const aiApp = {
  id: 'ai', name: 'LuminAI', glyph: 'spark', grad: ['#8b6cff', '#e06be0'],
  size: { w: 620, h: 600 }, category: 'Sistema', dock: true, desktop: true, singleton: true,
  mount: mountAI,
};
