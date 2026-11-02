/* LuminOS — configuração do Ultraviolet.
   O prefixo é relativo à raiz do site para funcionar em subpastas
   (ex.: usuario.github.io/LuminOS/). Os caminhos de handler/client são
   resolvidos pelo próprio service worker a partir desta pasta. */
self.__uv$config = {
  prefix: new URL('service/', self.location.href).pathname,
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: new URL('uv.handler.js', self.location.href).pathname,
  client: new URL('uv.client.js', self.location.href).pathname,
  bundle: new URL('uv.bundle.js', self.location.href).pathname,
  config: new URL('uv.config.js', self.location.href).pathname,
  sw: new URL('uv.sw.js', self.location.href).pathname,
};
