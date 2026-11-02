/* ============================================================
   LuminOS — Chat Global
   Sem cadastro: só um nome. Salas comunitárias via relay público
   (ntfy.sh) + sincronização entre abas (BroadcastChannel) e um
   histórico local com fila circular de 100 mensagens.

   Privacidade: o nome e o texto vão para o relay público apenas
   quando o relay está disponível; nada é enviado se você estiver
   em "modo local".
   ============================================================ */

import { store, uid } from './core.js';

const RELAY = 'https://ntfy.sh';
const CHANNEL = 'luminsdk-luminos-chat-v1';
const LOCAL_KEY = 'chat.global.v1';
const MAX = 100;

export const ROOMS = [
  { id: 'geral', name: 'geral', topic: 'luminos-global-geral-v1', desc: 'Todo mundo, qualquer assunto' },
  { id: 'estudos', name: 'estudos', topic: 'luminos-global-estudos-v1', desc: 'StudyHub · dúvidas e materiais' },
  { id: 'jogos', name: 'jogos', topic: 'luminos-global-jogos-v1', desc: 'GN-Math, LuminSDK e recordes' },
];

const listeners = new Set();
let bc = null;
let es = null;
let currentTopic = null;
let connected = false;
let nick = '';
let seen = new Set();

/* ── estado ───────────────────────────────────────────────── */
export const state = {
  get room() { return store.get('chat.room', 'geral') || 'geral'; },
  set room(id) { store.set('chat.room', id); subscribeRoom(id); },
  get nick() { return nick || store.get('chat.nick', '') || ''; },
  set nick(v) { nick = (v || '').trim().slice(0, 20); store.set('chat.nick', nick); },
  get online() { return connected; },
};

export function messages(roomId = state.room) {
  const all = store.get(LOCAL_KEY, {});
  return all[roomId] || [];
}

function persist(roomId, list) {
  const all = store.get(LOCAL_KEY, {});
  all[roomId] = list.slice(-MAX);
  store.set(LOCAL_KEY, all);
}

function emit(evt, detail) { listeners.forEach((fn) => { try { fn(evt, detail); } catch {} }); }
export function onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function push(msg, roomId = state.room) {
  if (!msg?.id || seen.has(msg.id)) return;
  seen.add(msg.id);
  const list = messages(roomId);
  list.push(msg);
  persist(roomId, list);
  emit('message', { roomId, msg });
}

/* ── transporte ───────────────────────────────────────────── */
function connectBroadcast() {
  if (bc || typeof BroadcastChannel === 'undefined') return;
  bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (e) => {
    const d = e.data;
    if (d?.type === 'msg' && d.roomId) push(d.msg, d.roomId);
    if (d?.type === 'presence') emit('presence', d);
  };
}

function topicUrl(topic) { return RELAY + '/' + topic + '/json?since=10m'; }

function subscribeRoom(roomId) {
  const room = ROOMS.find((r) => r.id === roomId) || ROOMS[0];
  if (es) { try { es.close(); } catch {} es = null; }
  if (currentTopic === room.topic && connected) return;
  currentTopic = room.topic;
  connected = false;

  try {
    // streaming NDJSON pela API do ntfy (EventSource não é necessário)
    const ctrl = new AbortController();
    es = { close: () => ctrl.abort() };
    fetch(topicUrl(room.topic), { signal: ctrl.signal, headers: { Accept: 'application/x-ndjson' } })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
        connected = true;
        emit('status', { online: true, relay: RELAY, room: roomId });
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.event !== 'message' || !evt.message) continue;
              const m = evt.message;
              const parsed = safeParse(m);
              if (parsed) push(parsed, roomId);
            } catch {}
          }
        }
        connected = false;
        emit('status', { online: false, room: roomId });
      })
      .catch(() => {
        connected = false;
        emit('status', { online: false, room: roomId });
      });
  } catch {
    connected = false;
    emit('status', { online: false, room: roomId });
  }
}

function safeParse(m) {
  // formato: { id, who, text, ts, kind }
  const raw = m.message || m.title || '';
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.who === 'string' && typeof obj.text === 'string') {
      return { id: obj.id || m.id, who: obj.who.slice(0, 20), text: obj.text.slice(0, 500), ts: obj.ts || Date.now() * 1, kind: obj.kind || 'chat' };
    }
  } catch {}
  if (m.title) return { id: m.id, who: String(m.title).slice(0, 20), text: raw.slice(0, 500), ts: Date.now(), kind: 'chat' };
  return null;
}

export function start(roomId = state.room) {
  connectBroadcast();
  subscribeRoom(roomId);
  emit('status', { online: connected, room: roomId });
}

export function stop() {
  if (es) { try { es.close(); } catch {} es = null; }
  if (bc) { try { bc.close(); } catch {} bc = null; }
  connected = false;
}

/* ── envio ────────────────────────────────────────────────── */
export async function send(text, { roomId = state.room, who = state.nick, kind = 'chat' } = {}) {
  const clean = String(text || '').trim().slice(0, 500);
  if (!clean) return { ok: false, error: 'mensagem vazia' };
  const room = ROOMS.find((r) => r.id === roomId) || ROOMS[0];
  const msg = { id: uid('m'), who: (who || 'anônimo').slice(0, 20), text: clean, ts: Date.now(), kind };
  push(msg, roomId);
  bc?.postMessage({ type: 'msg', roomId, msg });

  try {
    const res = await fetch(`${RELAY}/${room.topic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Title: msg.who, Priority: 'min' },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { ok: true, msg, relay: true };
  } catch (err) {
    return { ok: true, msg, relay: false, error: err.message };
  }
}

export function clearRoom(roomId = state.room) {
  persist(roomId, []);
  emit('clear', { roomId });
}

/* ── presença (contador de pessoas) ───────────────────────── */
const PRESENCE = 'luminos-presence-v1';
export function pingPresence() {
  const now = Date.now();
  const all = store.get(PRESENCE, {});
  const me = uid('p');
  all[me] = now;
  // limpa quem não aparece há 75 s
  Object.keys(all).forEach((k) => { if (now - all[k] > 75000) delete all[k]; });
  if (Object.keys(all).length > 120) delete all[Object.keys(all)[0]];
  store.set(PRESENCE, all);
  bc?.postMessage({ type: 'presence', id: me, ts: now });
  return Math.max(1, Object.keys(all).length);
}
