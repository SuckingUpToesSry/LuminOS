/* ============================================================
   StudyHub — a página de estudos do LuminOS
   Acionada pelo Botão "-" (panic switch). Tem logotipo próprio,
   busca, quizzes interativos, materiais e o Chat Global.
   Pressionar "-" novamente volta ao LuminOS.
   ============================================================ */

import { $, h, store, sound } from './core.js';
import { icon } from './icons.js';
import {
  ROOMS as CHAT_ROOMS, state as chatState, start as chatStart, send as chatSend,
  messages as chatMessages, onEvent as onChatEvent, stop as chatStop,
} from './chat.js';

/* ── quizzes ──────────────────────────────────────────────── */
export const QUIZ_BANK = {
  matematica: {
    label: 'Matemática',
    color: '#2f7d5c',
    icon: 'calc',
    questions: [
      { q: 'Qual é o valor de 7 × 8?', o: ['54', '56', '64', '48'], a: 1, why: '7 × 8 = 56.' },
      { q: 'Quanto é 25% de 240?', o: ['48', '60', '72', '24'], a: 1, why: '25% = 1/4; 240 ÷ 4 = 60.' },
      { q: 'Resolva: 3x + 6 = 21. Qual é x?', o: ['3', '5', '7', '9'], a: 1, why: '3x = 15 → x = 5.' },
      { q: 'Qual é a raiz quadrada de 169?', o: ['11', '12', '13', '14'], a: 2, why: '13² = 169.' },
      { q: 'A sequência 2, 6, 18, 54… segue qual padrão?', o: ['+4', '×3', '×2', 'quadrados perfeitos'], a: 1, why: 'Cada termo é o anterior multiplicado por 3.' },
      { q: 'Quanto é 2⁵?', o: ['10', '25', '32', '64'], a: 2, why: '2·2·2·2·2 = 32.' },
      { q: 'Qual fração é equivalente a 0,75?', o: ['1/2', '2/3', '3/4', '4/5'], a: 2, why: '0,75 = 75/100 = 3/4.' },
      { q: 'Se um carro percorre 180 km em 2 horas, qual a velocidade média?', o: ['60 km/h', '80 km/h', '90 km/h', '120 km/h'], a: 2, why: '180 ÷ 2 = 90 km/h.' },
    ],
  },
  geometria: {
    label: 'Geometria',
    color: '#2b6cb0',
    icon: 'grid2',
    questions: [
      { q: 'A soma dos ângulos internos de um triângulo é:', o: ['90°', '180°', '270°', '360°'], a: 1, why: 'Sempre 180° na geometria euclidiana.' },
      { q: 'Área de um retângulo de 6 cm por 4 cm:', o: ['10 cm²', '20 cm²', '24 cm²', '36 cm²'], a: 2, why: 'Área = base × altura = 6 × 4 = 24 cm².' },
      { q: 'Um triângulo com três lados iguais é chamado de:', o: ['Escaleno', 'Isósceles', 'Equilátero', 'Retângulo'], a: 2, why: 'Equilátero: todos os lados (e ângulos) iguais.' },
      { q: 'No teorema de Pitágoras, a² = b² + c² vale para:', o: ['Qualquer triângulo', 'Triângulos retângulos', 'Círculos', 'Quadrados'], a: 1, why: 'Só em triângulos com um ângulo de 90°.' },
      { q: 'A área de um círculo de raio 3 é (use π ≈ 3,14):', o: ['9,42', '18,84', '28,26', '6,28'], a: 2, why: 'A = πr² = 3,14 × 9 ≈ 28,26.' },
      { q: 'Quantas faces tem um cubo?', o: ['4', '6', '8', '12'], a: 1, why: '6 faces quadradas.' },
      { q: 'O ângulo de 90° é chamado de:', o: ['Agudo', 'Obtuso', 'Reto', 'Raso'], a: 2, why: 'Ângulo reto = exatamente 90°.' },
    ],
  },
  ciencias: {
    label: 'Ciências',
    color: '#7b4bb7',
    icon: 'spark',
    questions: [
      { q: 'Qual é o planeta mais próximo do Sol?', o: ['Vênus', 'Mercúrio', 'Marte', 'Terra'], a: 1, why: 'Mercúrio é o mais próximo.' },
      { q: 'A fórmula química da água é:', o: ['CO₂', 'H₂O', 'O₂', 'NaCl'], a: 1, why: 'Dois hidrogênios e um oxigênio.' },
      { q: 'Qual órgão bombeia o sangue pelo corpo?', o: ['Pulmão', 'Fígado', 'Coração', 'Rim'], a: 2, why: 'O coração é a bomba do sistema circulatório.' },
      { q: 'A fotossíntese usa qual gás?', o: ['Oxigênio', 'Nitrogênio', 'Gás carbônico', 'Hidrogênio'], a: 2, why: 'Plantas consomem CO₂ e liberam O₂.' },
      { q: 'Quanto tempo a luz do Sol leva para chegar à Terra?', o: ['8 segundos', '8 minutos', '8 horas', '8 dias'], a: 1, why: 'Cerca de 8 minutos e 20 segundos.' },
      { q: 'Qual é o estado da água a 100 °C ao nível do mar?', o: ['Sólido', 'Líquido', 'Gasoso', 'Plasma'], a: 2, why: 'Entra em ebulição e vira vapor.' },
    ],
  },
  portugues: {
    label: 'Português',
    color: '#b45309',
    icon: 'note',
    questions: [
      { q: 'Qual palavra está escrita corretamente?', o: ['Excessão', 'Exceção', 'Esceção', 'Exeção'], a: 1, why: '"Exceção" — sem "ss".' },
      { q: 'Em “Ela correu rapidamente”, “rapidamente” é:', o: ['Adjetivo', 'Advérbio', 'Substantivo', 'Pronome'], a: 1, why: 'Modifica o verbo: advérbio de modo.' },
      { q: 'Qual é o plural de “cidadão”?', o: ['Cidadãos', 'Cidadães', 'Cidadões', 'Cidadans'], a: 0, why: 'Cidadãos.' },
      { q: 'A palavra “mas” introduz ideia de:', o: ['Adição', 'Oposição', 'Conclusão', 'Causa'], a: 1, why: 'É uma conjunção adversativa.' },
      { q: 'Qual frase está pontuada corretamente?', o: ['Vou sair, já volto.', 'Vou sair já, volto.', 'Vou sair já volto.', 'Vou, sair já volto.'], a: 0, why: 'A vírgula separa as orações.' },
    ],
  },
};

/* ── persistência ─────────────────────────────────────────── */
const SCORE_KEY = 'studyhub.scores';
const scores = () => store.get(SCORE_KEY, {});
const setScore = (cat, val) => {
  const s = scores();
  if (!s[cat] || val > s[cat]) { s[cat] = val; store.set(SCORE_KEY, s); }
};

/* ── logo do StudyHub ─────────────────────────────────────── */
export function logoMark(size = 30) {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" style="display:block">
    <defs><linearGradient id="shg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f7d5c"/><stop offset="1" stop-color="#43b581"/>
    </linearGradient></defs>
    <rect width="48" height="48" rx="13" fill="url(#shg)"/>
    <path d="M13 15.5c3.6-1.4 7.4-1.4 11 .8 3.6-2.2 7.4-2.2 11-.8v16c-3.6-1.4-7.4-1.4-11 .8-3.6-2.2-7.4-2.2-11-.8z"
          fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M24 16.3v16" stroke="#fff" stroke-width="1.4" stroke-opacity=".8"/>
    <circle cx="33.5" cy="13" r="3.2" fill="#ffe08a"/>
    <path d="M33.5 8.4v1.6M33.5 16v1.6M29.9 13h-1.6M38.7 13H37M31 10.5l-1.1-1.1M37.1 16.6l-1.1-1.1M36 10.5l1.1-1.1M29.9 16.6l1.1-1.1"
          stroke="#ffe08a" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}

/* ── controle do modo estudo ──────────────────────────────── */
let active = false;
let prevTitle = '';
let sessionStart = 0;

export function isStudyMode() { return active; }

export function toggleStudyHub(force) {
  const next = force === undefined ? !active : !!force;
  if (next === active) return active;
  active = next;
  const root = $('#studyhub');
  document.body.classList.toggle('study-mode', active);

  if (active) {
    prevTitle = document.title;
    document.title = 'StudyHub — Recursos Educacionais';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f7faf8');
    sessionStart = Date.now();
    root.hidden = false;
    root.classList.add('in');
    renderApp();
    chatStart('estudos');
    sound.tone({ freq: 520, dur: .09, gain: .06, type: 'sine' });
    store.set('studyhub.sessions', (store.get('studyhub.sessions', 0) || 0) + 1);
  } else {
    document.title = prevTitle || 'LuminOS';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b0d12');
    root.classList.remove('in');
    setTimeout(() => { if (!active) root.hidden = true; }, 180);
    chatStop();
    const mins = Math.round((Date.now() - sessionStart) / 60000);
    store.set('studyhub.minutes', (store.get('studyhub.minutes', 0) || 0) + mins);
    sound.tone({ freq: 420, dur: .1, gain: .05 });
  }
  return active;
}

/* ── app ──────────────────────────────────────────────────── */
let built = false;
let currentTab = 'inicio';
let chatRender = null;
let chatStatusEl = null;

function renderApp() {
  const root = $('#studyhub');
  if (built) { renderTabRef(); return; }
  built = true;
  root.innerHTML = '';

  // ── referências (declaradas ANTES de qualquer callback usar) ──
  const header = h('header.sh-header');
  const nav = h('nav.sh-nav');
  const userChip = h('div.sh-user');
  const mainEl = h('main.sh-main');
  const footer = h('footer.sh-footer');
  const navBtns = [];
  let renderTab = () => {};

  const tabsDef = [
    ['inicio', 'Início', 'search'],
    ['quizzes', 'Quizzes', 'spark'],
    ['materiais', 'Materiais', 'book'],
    ['chat', 'Chat Global', 'chat'],
  ];
  tabsDef.forEach(([id, label, ic]) => {
    const b = h('button.sh-navbtn', { html: icon(ic) + ' ' + label, dataset: { tab: id } });
    b.onclick = () => { currentTab = id; renderTab(); };
    nav.append(b);
    navBtns.push(b);
  });

  const brand = h('button.sh-brand', { title: 'StudyHub' },
    h('span', { html: logoMark(30), style: { display: 'flex' } }),
    h('span.sh-brandtext', {}, h('b', { text: 'Study' }), h('span', { text: 'Hub' })));
  brand.onclick = () => { currentTab = 'inicio'; renderTab(); };

  // camuflagem: parecer um portal escolar comum (útil no colégio/aula)
  const sfwBtn = h('button.sh-sfw-toggle', { html: icon('shield'), title: 'Modo discreto (site escolar)' });
  sfwBtn.onclick = () => {
    const on = !root.classList.contains('sh-sfw');
    root.classList.toggle('sh-sfw', on);
    sfwBtn.classList.toggle('on', on);
    sfwBtn.title = on ? 'Modo discreto ativo — clique para voltar ao visual StudyHub' : 'Modo discreto (site escolar)';
    store.set('studyhub.sfw', on);
    sound.click();
  };
  if (store.get('studyhub.sfw', false)) { root.classList.add('sh-sfw'); sfwBtn.classList.add('on'); }

  const exitBtn = h('button.sh-exit', { title: 'Sair do modo estudo (-)', text: '−' });
  exitBtn.onclick = () => toggleStudyHub(false);

  header.append(brand, nav, h('span.grow', { style: { flex: '1' } }), userChip, sfwBtn);
  root.append(header, mainEl, footer);

  function paintUser() {
    userChip.innerHTML = '';
    const name = chatState.nick || store.get('profile.name', '');
    userChip.append(
      h('span.sh-avatar', { text: (name || 'E')[0].toUpperCase() }),
      h('span', { style: { fontSize: '12.5px' }, text: name || 'Estudante' }));
  }

  renderTab = () => {
    navBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
    paintUser();
    mainEl.innerHTML = '';
    mainEl.dataset.tab = currentTab;
    if (currentTab === 'inicio') mainEl.append(viewHome());
    if (currentTab === 'quizzes') mainEl.append(viewQuizzes());
    if (currentTab === 'materiais') mainEl.append(viewMaterials());
    if (currentTab === 'chat') mainEl.append(viewChat());
    footer.innerHTML = '';
    footer.append(
      h('span', { text: 'StudyHub · recursos educacionais gratuitos' }),
      h('span', { style: { flex: '1' } }),
      h('span.tiny', { text: 'Sessões: ' + (store.get('studyhub.sessions', 1) || 1) }),
      exitBtn);
  };

  renderTabRef = renderTab;

  onChatEvent((evt, d) => {
    if (evt === 'message' && chatRender) chatRender();
    if (evt === 'status' && chatStatusEl) {
      chatStatusEl.textContent = d.online ? 'online · conversa ao vivo' : 'modo local entre abas';
    }
  });

  renderTab();
}

let renderTabRef = () => {};
function renderTab() { renderTabRef(); }

/* ── Início: busca + atalhos ──────────────────────────────── */
function viewHome() {
  const wrap = h('div.sh-home');
  const input = h('input', { type: 'text', placeholder: 'Pesquise um tema, uma fórmula ou uma dúvida…', autocomplete: 'off' });
  const search = h('form.sh-search', {},
    h('span', { html: icon('search') }),
    input,
    h('button.sh-searchbtn', { type: 'submit', html: icon('chevR') }));
  search.onsubmit = (e) => {
    e.preventDefault();
    go(input.value.trim());
  };

  const chips = h('div.sh-chips');
  ['Álgebra', 'Geometria plana', 'Fotossíntese', 'Regra de três', 'Interpretação de texto', 'Tabela periódica'].forEach((c) => {
    const b = h('button.chip', { text: c });
    b.onclick = () => go(c);
    chips.append(b);
  });

  const subjects = h('div.sh-cards');
  Object.entries(QUIZ_BANK).forEach(([id, cat]) => {
    const best = scores()[id];
    const card = h('button.sh-card', {},
      h('span.sh-cardicon', { html: icon(cat.icon), style: { background: cat.color + '18', color: cat.color } }),
      h('b', { text: cat.label }),
      h('span', { text: `${cat.questions.length} questões` + (best ? ` · melhor: ${best}/${cat.questions.length}` : '') }));
    card.onclick = () => { startQuiz(id); };
    subjects.append(card);
  });

  const recent = h('div.sh-recent');
  const history = store.get('studyhub.history', []);
  recent.append(h('h3', { text: 'Buscas recentes' }));
  if (!history.length) recent.append(h('p.tiny', { text: 'Nada por aqui ainda.' }));
  history.slice(0, 6).forEach((q) => {
    const b = h('button.sh-chip', { text: q });
    b.onclick = () => go(q);
    recent.append(b);
  });

  wrap.append(
    h('div.sh-hero', {},
      h('div', { html: logoMark(52), style: { display: 'flex', justifyContent: 'center', marginBottom: '14px' } }),
      h('h1', {}, 'Estude ', h('em', { text: 'melhor' }), ', não mais.'),
      h('p', { text: 'Quizzes interativos, materiais de apoio e uma comunidade de estudos — tudo em um só lugar.' })),
    search, chips, subjects, recent);
  setTimeout(() => input.focus(), 120);

  function go(q) {
    if (!q) return;
    if (/^https?:\/\//i.test(q) || /^[\w-]+(\.[\w-]+)+/.test(q) && !q.includes(' ')) {
      window.open(/^https?:/.test(q) ? q : 'https://' + q, '_blank', 'noopener');
    } else {
      const hist = store.get('studyhub.history', []);
      store.set('studyhub.history', [q, ...hist.filter((x) => x !== q)].slice(0, 20));
      window.open('https://duckduckgo.com/?q=' + encodeURIComponent(q + ' explicação'), '_blank', 'noopener');
    }
  }
  return wrap;
}

/* ── Quizzes ──────────────────────────────────────────────── */
let quiz = null;

function startQuiz(catId) {
  const cat = QUIZ_BANK[catId];
  if (!cat) return;
  const qs = [...cat.questions].sort(() => Math.random() - .5).slice(0, 6);
  quiz = { catId, cat, qs, i: 0, score: 0, answered: false, startedAt: Date.now() };
  currentTab = 'quizzes';
  renderTab();
}

function viewQuizzes() {
  if (!quiz) {
    const wrap = h('div.sh-quizpick');
    wrap.append(h('h2', { text: 'Escolha um assunto' }),
      h('p.tiny', { text: 'Cada rodada tem 6 questões sorteadas do banco. Feedback imediato com explicação.' }));
    const cards = h('div.sh-cards');
    Object.entries(QUIZ_BANK).forEach(([id, cat]) => {
      const best = scores()[id];
      const c = h('button.sh-card', {},
        h('span.sh-cardicon', { html: icon(cat.icon), style: { background: cat.color + '18', color: cat.color } }),
        h('b', { text: cat.label }),
        h('span', { text: `${cat.questions.length} questões` + (best ? ` · recorde ${best}` : '') }));
      c.onclick = () => startQuiz(id);
      cards.append(c);
    });
    wrap.append(cards);

    const total = store.get('studyhub.answered', 0);
    const correct = store.get('studyhub.correct', 0);
    if (total) {
      wrap.append(h('div.sh-stats', {},
        h('.sh-stat', {}, h('b', { text: String(total) }), h('span', { text: 'questões respondidas' })),
        h('.sh-stat', {}, h('b', { text: Math.round((correct / total) * 100) + '%' }), h('span', { text: 'de acerto' })),
        h('.sh-stat', {}, h('b', { text: String(store.get('studyhub.minutes', 0) || 0) + ' min' }), h('span', { text: 'tempo total' }))));
    }
    return wrap;
  }

  const { cat, qs, i, score, answered } = quiz;
  const q = qs[i];
  const wrap = h('div.sh-quiz');

  const progress = h('div.sh-progress', {}, h('i', { style: { width: ((i / qs.length) * 100).toFixed(0) + '%' } }));
  wrap.append(
    h('div.sh-quizhead', {},
      h('span.chip', { text: cat.label }),
      h('span.tiny', { text: `Questão ${i + 1} de ${qs.length}` }),
      h('span.grow', { style: { flex: '1' } }),
      h('b', { text: `${score} acerto${score === 1 ? '' : 's'}` })),
    progress,
    h('h2', { text: q.q }));

  const opts = h('div.sh-options');
  q.o.forEach((label, idx) => {
    const b = h('button.sh-option', {}, h('span.sh-letter', { text: 'ABCD'[idx] }), h('span', { text: label }));
    b.onclick = () => answer(idx, b, opts);
    opts.append(b);
  });
  wrap.append(opts);

  if (answered) {
    // mostra estado respondido (ex.: após trocar de aba)
    wrap.append(feedbackBox());
  }
  return wrap;
}

function answer(idx, btn, opts) {
  if (quiz.answered) return;
  quiz.answered = true;
  const q = quiz.qs[quiz.i];
  const correct = idx === q.a;
  if (correct) quiz.score++;
  store.set('studyhub.answered', (store.get('studyhub.answered', 0) || 0) + 1);
  if (correct) store.set('studyhub.correct', (store.get('studyhub.correct', 0) || 0) + 1);
  sound.tone({ freq: correct ? 720 : 220, dur: .12, gain: .08, type: correct ? 'sine' : 'square' });
  [...opts.children].forEach((el, i) => {
    el.disabled = true;
    if (i === q.a) el.classList.add('ok');
    else if (i === idx) el.classList.add('bad');
  });
  opts.parentElement.append(feedbackBox());
  opts.parentElement.querySelector('.sh-next')?.focus();
}

function feedbackBox() {
  const q = quiz.qs[quiz.i];
  const box = h('div.sh-feedback', {},
    h('b', { text: 'Resposta: ' + q.o[q.a] }),
    h('p', { text: q.why }),
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' } },
      h('button.sh-btn.primary.sh-next', { text: quiz.i + 1 < quiz.qs.length ? 'Próxima questão →' : 'Ver resultado', onclick: () => {
        if (quiz.i + 1 < quiz.qs.length) { quiz.i++; quiz.answered = false; renderTab(); }
        else finishQuiz();
      } })));
  return box;
}

function finishQuiz() {
  const { catId, cat, score, qs } = quiz;
  setScore(catId, score);
  const pct = Math.round((score / qs.length) * 100);
  const msg = pct === 100 ? 'Perfeito! 🏆' : pct >= 66 ? 'Muito bom! 👏' : pct >= 34 ? 'Bom começo — revise e tente de novo.' : 'Vamos praticar mais um pouco?';
  quiz = null;
  const wrap = h('div.sh-result', {},
    h('div', { html: logoMark(44), style: { display: 'flex', justifyContent: 'center', marginBottom: '10px' } }),
    h('h2', { text: msg }),
    h('div.sh-bigscore', {}, h('b', { text: `${score}/${qs.length}` }), h('span', { text: cat.label })),
    h('p.tiny', { text: 'Recorde deste assunto: ' + (scores()[catId] || score) }),
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' } },
      h('button.sh-btn.primary', { text: 'Jogar de novo', onclick: () => startQuiz(catId) }),
      h('button.sh-btn', { text: 'Outro assunto', onclick: () => { currentTab = 'quizzes'; renderTab(); } }),
      h('button.sh-btn', { text: 'Chat de estudos', onclick: () => { currentTab = 'chat'; renderTab(); } })));
  currentTab = 'quizzes';
  const host = $('#studyhub .sh-main');
  host.innerHTML = '';
  host.append(wrap);
}

/* ── Materiais ────────────────────────────────────────────── */
function viewMaterials() {
  const wrap = h('div.sh-materials');
  wrap.append(h('h2', { text: 'Materiais e referências' }),
    h('p.tiny', { text: 'Fontes abertas para estudar qualquer assunto.' }));
  const groups = [
    ['Referência geral', [
      ['Wikipédia em português', 'https://pt.wikipedia.org'],
      ['Wikcionário', 'https://pt.wiktionary.org'],
      ['Brasil Escola', 'https://brasilescola.uol.com.br'],
      ['Mundo Educação', 'https://mundoeducacao.uol.com.br'],
    ]],
    ['Matemática e ciências', [
      ['Khan Academy (pt)', 'https://pt.khanacademy.org'],
      ['GeoGebra', 'https://www.geogebra.org'],
      ['Desmos (gráficos)', 'https://www.desmos.com/calculator'],
      ['Wolfram Alpha', 'https://www.wolframalpha.com'],
    ]],
    ['Leitura e escrita', [
      ['Domínio Público', 'https://www.dominiopublico.gov.br'],
      ['Portal da Língua Portuguesa', 'https://www.portaldalinguaportuguesa.org'],
      ['Volp (vocabulário)', 'https://www.academia.org.br/nossa-lingua/busca-no-vocabulario'],
    ]],
    ['Ferramentas de estudo', [
      ['Google Acadêmico', 'https://scholar.google.com.br'],
      ['SciELO', 'https://www.scielo.br'],
      ['Pomodoro Timer', 'https://pomofocus.io'],
    ]],
  ];
  groups.forEach(([title, links]) => {
    const box = h('section.sh-matgroup', {}, h('h3', { text: title }));
    const list = h('div.sh-matlist');
    links.forEach(([name, url]) => {
      const a = h('button.sh-matrow', {},
        h('span.sh-cardicon', { html: icon('link'), style: { background: '#2f7d5c14', color: '#2f7d5c' } }),
        h('b', { text: name }),
        h('span.tiny', { text: new URL(url).host.replace('www.', '') }),
        h('span', { style: { marginLeft: 'auto', opacity: '.5' }, html: icon('external') }));
      a.onclick = () => window.open(url, '_blank', 'noopener');
      list.append(a);
    });
    box.append(list);
    wrap.append(box);
  });
  return wrap;
}

/* ── Chat Global (sala estudos) ───────────────────────────── */
function viewChat() {
  const wrap = h('div.sh-chat');
  const rooms = h('div.sh-chatrooms');
  const list = h('div.sh-chatlist');
  const nickInput = h('input', { placeholder: 'Seu nome para participar', value: chatState.nick || store.get('profile.name', '') });
  const msgInput = h('input', { placeholder: 'Escreva uma mensagem para a comunidade…' });
  const status = h('span.tiny', { text: 'conectando…' });

  function renderRooms() {
    rooms.innerHTML = '';
    CHAT_ROOMS.forEach((r) => {
      const b = h('button.sh-chip', { text: '# ' + r.name });
      b.classList.toggle('active', r.id === chatState.room);
      b.onclick = () => { chatState.room = r.id; renderRooms(); renderMsgs(); chatStart(r.id); };
      rooms.append(b);
    });
  }

  function renderMsgs() {
    list.innerHTML = '';
    const msgs = chatMessages();
    if (!msgs.length) {
      list.append(h('div.sh-empty', {}, h('div', { style: { fontSize: '28px' }, text: '💬' }),
        h('b', { text: 'Seja o primeiro a escrever' }),
        h('p', { text: 'Compartilhe uma dúvida, um resumo ou uma dica de estudo.' })));
    }
    msgs.slice(-80).forEach((m) => {
      const mine = m.who === chatState.nick;
      list.append(h('div.sh-msg', { class: mine ? 'mine' : '' },
        h('span.sh-avatar', { text: (m.who || '?')[0].toUpperCase() }),
        h('div', { style: { minWidth: '0' } },
          h('div.sh-msgwho', {}, h('b', { text: m.who }), h('span.tiny', { text: new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })),
          h('div.sh-msgtext', { text: m.text }))));
    });
    list.scrollTop = list.scrollHeight;
  }

  const nameRow = h('div.sh-namerow', {}, nickInput, h('button.sh-btn.primary', { text: 'Entrar', onclick: () => {
    chatState.nick = nickInput.value.trim() || 'Estudante';
    nameRow.hidden = true;
    renderMsgs();
    msgInput.focus();
  } }));

  const form = h('form.sh-chatform', {}, msgInput, h('button.sh-btn.primary', { type: 'submit', html: icon('send') + ' Enviar' }));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const t = msgInput.value.trim();
    if (!t) return;
    if (!chatState.nick) { nameRow.hidden = false; nickInput.focus(); return; }
    msgInput.value = '';
    const res = await chatSend(t, { who: chatState.nick });
    renderMsgs();
    status.textContent = res.relay ? 'online · mensagem enviada' : 'modo local (relay offline)';
  };

  chatRender = renderMsgs;
  chatStatusEl = status;

  chatStart(chatState.room || 'estudos');
  renderRooms(); renderMsgs();
  if (chatState.nick) nameRow.hidden = true;

  wrap.append(
    h('div.sh-chathead', {},
      h('h2', { text: 'Chat Global' }),
      h('span.tiny', { text: '· sala da comunidade' }),
      h('span', { style: { flex: '1' } }),
      status),
    rooms,
    list,
    nameRow,
    form);
  return wrap;
}

/* ── injeta a casca no DOM e registra o atalho "-" ────────── */
export function installStudyHub() {
  if ($('#studyhub')) return;
  const root = h('div#studyhub.sh', { hidden: true });
  document.body.append(root);

  // Só bloqueia o atalho quando o foco está num campo REALMENTE visível:
  // inputs de painéis fechados (onboarding, launcher, janelas fechadas)
  // continuam sendo o activeElement em alguns navegadores.
  const isTyping = () => {
    const el = document.activeElement;
    if (!el) return false;
    const field = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (!field) return false;
    if (el.closest('[hidden]')) return false;
    const rects = el.getClientRects?.() || [];
    return rects.length > 0;
  };

  document.addEventListener('keydown', (e) => {
    // Botão "-" (menos) — também aceita "_" (shift + -) e o teclado numérico
    const isMinus = e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '_';
    if (isMinus && !isTyping() && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleStudyHub();
      return;
    }
    // atalhos alternativos
    if (active) {
      if (e.key === 'Escape' && !isTyping()) {
        // 3 × Esc em 1,2 s = voltar ao LuminOS
        const now = Date.now();
        window.__escTimes = (window.__escTimes || []).filter((t) => now - t < 1200);
        window.__escTimes.push(now);
        if (window.__escTimes.length >= 3) { window.__escTimes = []; toggleStudyHub(false); }
      }
      if ((e.shiftKey && (e.key === 'D' || e.key === 'd')) && !isTyping()) toggleStudyHub(false);
    } else if (e.shiftKey && (e.key === 'D' || e.key === 'D') && !isTyping() && e.altKey) {
      toggleStudyHub(true);
    }
  }, true);
}

