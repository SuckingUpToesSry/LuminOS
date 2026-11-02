/* ============================================================
   Compatibilidade: o módulo antigo agora aponta para js/proxy.js
   (Scramjet + Ultraviolet, Epoxy + Libcurl + Bare).
   ============================================================ */
export {
  UV, PATHS, WISP_ENDPOINTS, TRANSPORTS, PROTOCOLS, ENGINES,
  runtime, settings as uvSettings, save as saveUvSettings,
  encodeUV, decodeUV, initUV, resetUV, prepare, proxiedUrl, describe,
} from '../js/proxy.js';
