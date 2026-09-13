export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Captura o destino tanto pelo parâmetro ?url=... quanto pelo pathname direto
    let targetParam = url.searchParams.get("url");
    if (!targetParam && url.pathname.length > 1) {
      targetParam = url.pathname.slice(1);
    }

    if (!targetParam) {
      return new Response("HTTP.ipv4 Proxy Ativo. Use ?url=https://exemplo.com ou digite o site na URL.", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // Normaliza a URL de destino (garante o protocolo HTTPS caso não seja informado)
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

    const proxyIp = "16.182.82.203";
    
    // Prepara os headers repassando o Host original do site de destino
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set("Host", targetUrl.hostname);
    modifiedHeaders.set("X-Forwarded-For", proxyIp);

    // Constrói a URL de fetch mantendo o caminho e os parâmetros originais da URL de destino
    const fetchTarget = `${targetUrl.protocol}//${proxyIp}${targetUrl.pathname}${targetUrl.search}`;

    const proxyRequest = new Request(fetchTarget, {
      method: request.method,
      headers: modifiedHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual"
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
