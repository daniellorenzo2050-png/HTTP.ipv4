export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    let targetParam = url.searchParams.get("url");
    if (!targetParam && url.pathname.length > 1) {
      targetParam = url.pathname.slice(1);
    }

    if (!targetParam) {
      return new Response("HTTP.ipv4 Proxy Ativo. Use ?url=https://exemplo.com", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    let targetUrl;
    try {
      if (!targetParam.startsWith("http://") && !targetParam.startsWith("https://")) {
        targetUrl = new URL(`https://${targetParam}`);
      } else {
        targetUrl = new URL(targetParam);
      }
    } catch (e) {
      return new Response("URL de destino inválida", { status: 400 });
    }

    // IP de roteamento configurado
    const proxyIp = "16.182.82.203";
    
    // Para contornar a restrição de IP direto do Cloudflare Workers (Erro 1003),
    // o fetch deve apontar para o domínio de destino original, forçando a resolução 
    // ou passando pelo proxy do servidor correspondente.
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set("Host", targetUrl.hostname);
    modifiedHeaders.set("X-Forwarded-For", proxyIp);

    // Redireciona mantendo o domínio alvo mas injetando o proxy IP se necessário,
    // ou conectando via IP caso o destino não use Cloudflare.
    const fetchTarget = `${targetUrl.protocol}//${proxyIp}${targetUrl.pathname}${targetUrl.search}`;

    const proxyRequest = new Request(fetchTarget, {
      method: request.method,
      headers: modifiedHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
      // Configuração para permitir conexões por IP sem disparar bloqueio de SNI do Cloudflare
      cf: {
        resolveOverride: targetUrl.hostname
      }
    });

    try {
      const response = await fetch(proxyRequest);
      
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      newResponse.headers.set("X-Proxy-Protocol", "HTTP.ipv4");
      newResponse.headers.set("X-Target-IP", proxyIp);
      return newResponse;

    } catch (err) {
      return new Response(`Erro de roteamento no HTTP.ipv4 via ${proxyIp}: ${err.message}`, { 
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  }
};
