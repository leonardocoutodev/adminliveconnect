import { Client } from "pg";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
});

async function query(env, text, params = []) {
  if (!env.HYPERDRIVE) throw new Error("Hyperdrive ainda nao configurado");
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  try {
    await client.connect();
    return await client.query(text, params);
  } finally {
    await client.end();
  }
}

function authorized(request, env) {
  return !env.ADMIN_TOKEN || request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "live-connect-prospeccao", database: !!env.HYPERDRIVE });
    }

    if (!authorized(request, env)) return json({ ok: false, error: "Nao autorizado" }, 401);

    try {
      if (url.pathname === "/api/campaign" && request.method === "GET") {
        const r = await query(env, "SELECT * FROM campaigns WHERE active=true ORDER BY id DESC LIMIT 1");
        return json(r.rows[0] || null);
      }

      if (url.pathname === "/api/contacts" && request.method === "GET") {
        const r = await query(env, `SELECT c.id, c.name, co.id AS contact_id, co.email, co.phone, co.status, co.last_sent_at
          FROM companies c JOIN contacts co ON co.company_id=c.id ORDER BY c.name`);
        return json(r.rows);
      }

      if (url.pathname === "/api/send" && request.method === "POST") {
        const body = await request.json();
        if (!body.contact_id) return json({ ok: false, error: "contact_id obrigatorio" }, 400);
        const r = await query(env, `SELECT co.id AS contact_id, co.email, co.status, c.name
          FROM contacts co JOIN companies c ON c.id=co.company_id WHERE co.id=$1`, [body.contact_id]);
        if (!r.rows[0]) return json({ ok: false, error: "Contato nao encontrado" }, 404);
        if (r.rows[0].status === "unsubscribed") return json({ ok: false, error: "Contato descadastrado" }, 409);
        return json({ ok: false, error: "SMTP KingHost ainda nao configurado" }, 503);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: error.message }, 500);
    }
  }
};
