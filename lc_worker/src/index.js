const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const CONTACTS = [
  ["Eixo4 Consultoria e Educação Profissional Ltda", "eixo4contato@gmail.com"],
  ["JBC Consultoria & Instrutoria LTDA", "jotadias1959@gmail.com"],
  ["Despertar Treinamentos e Consultoria Ltda", "nabucoresi@hotmail.com"],
  ["Agilize Desenvolvimento Profissional e Treinamento em Elétrica Ltda", "adm.agilizeassessoria@gmail.com"],
  ["Atena Tecnologia, Inovação e Gestão Ltda", "pm.ba2008@gmail.com"],
  ["APLOPES Tecnologia Ltda", "contact@aplopes.com"],
  ["Instituto Mix de Profissões", "ilheusinstitutomix@gmail.com"],
  ["GO Training Center Ilhéus", "goct.ilheus@gmail.com"],
  ["SENAI Ilhéus", "cacsenaiilheus@fieb.org.br"],
  ["Centro Educacional Álvaro Melo Vieira (CEEP-AMEV)", "ceamev2010@hotmail.com"],
  ["IES Capacitação", "contato@iescapacitacao.com.br"]
].map(([name, email], i) => ({ id: i + 1, name, email, status: "active" }));

const CAMPAIGN = {
  subject: "Locação de salas para treinamentos, reuniões e eventos em Ilhéus",
  body: `Olá, time da [empresa]!\n\nTudo bem?\n\nAqui é da Live Connect Escola de Profissões, em Ilhéus/BA.\n\nAlém dos nossos cursos e atividades de formação profissional, estamos disponibilizando nossas salas para locação por empresas que precisam de um espaço profissional para:\n\n• treinamentos;\n• reuniões;\n• workshops;\n• processos seletivos;\n• encontros de equipe;\n• palestras e outros eventos corporativos.\n\nNossa unidade está localizada no Ed. Fraga Center, na Rua Sá Oliveira, 18, sala 01, Centro, Ilhéus.\n\nSe tiver interesse, posso enviar fotos, estrutura, capacidade, disponibilidade e valores das salas.\n\nPosso te encaminhar essas informações?\n\nAbraços,\n\nLive Connect Escola de Profissões\n(73) 3223-7593\ncomercial@liveconnect.com.br\nwww.liveconnect.com.br\n\nSe este contato não fizer sentido para o time da empresa, basta avisar e não faremos novos contatos sobre esta oferta.`
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
});

function authorized(request, env) {
  return !env.ADMIN_TOKEN || request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "live-connect-prospeccao", database: false, neon: false, contacts: CONTACTS.length });
    }

    if (!authorized(request, env)) return json({ ok: false, error: "Nao autorizado" }, 401);

    if (url.pathname === "/api/contacts" && request.method === "GET") return json(CONTACTS);
    if (url.pathname === "/api/campaign" && request.method === "GET") return json(CAMPAIGN);

    if (url.pathname === "/api/send" && request.method === "POST") {
      return json({
        ok: false,
        error: "O Worker está pronto, mas o envio de e-mail ainda precisa de um provedor HTTP de envio. SMTP direto não funciona nativamente em Cloudflare Workers.",
        next: "RESEND_API_KEY ou outro provedor HTTP"
      }, 503);
    }

    return env.ASSETS.fetch(request);
  }
};
