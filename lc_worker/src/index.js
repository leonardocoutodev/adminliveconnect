import { neon } from "@neondatabase/serverless";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
});

function db(env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL ainda nao configurada");
  return neon(env.DATABASE_URL);
}

function authorized(request, env) {
  return !env.ADMIN_TOKEN || request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "live-connect-prospeccao", database: !!env.DATABASE_URL });
    }

    if (!authorized(request, env)) return json({ ok: false, error: "Nao autorizado" }, 401);

    try {
      const sql = db(env);

      if (url.pathname === "/api/db-test" && request.method === "GET") {
        const r = await sql.query(`
          SELECT
            current_database() AS database,
            current_schema() AS schema,
            (SELECT count(*) FROM companies) AS companies,
            (SELECT count(*) FROM contacts) AS contacts
        `);
        return json({ ok: true, ...r[0] });
      }

      if (url.pathname === "/api/campaign" && request.method === "GET") {
        const r = await sql.query("SELECT * FROM campaigns WHERE active=true ORDER BY id DESC LIMIT 1");
        return json(r[0] || null);
      }

      if (url.pathname === "/api/contacts" && request.method === "GET") {
        const r = await sql.query("SELECT c.id, c.name, co.id AS contact_id, co.email, co.phone, co.status, co.last_sent_at FROM companies c JOIN contacts co ON co.company_id=c.id ORDER BY c.name");
        return json(r);
      }

      if (url.pathname === "/api/send" && request.method === "POST") {
        const body = await request.json();
        if (!body.contact_id) return json({ ok: false, error: "contact_id obrigatorio" }, 400);
        const r = await sql.query("SELECT co.id AS contact_id, co.email, co.status, c.name FROM contacts co JOIN companies c ON c.id=co.company_id WHERE co.id=$1", [body.contact_id]);
        if (!r[0]) return json({ ok: false, error: "Contato nao encontrado" }, 404);
        if (r[0].status === "unsubscribed") return json({ ok: false, error: "Contato descadastrado" }, 409);
        return json({ ok: false, error: "SMTP KingHost ainda nao configurado" }, 503);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: error.message }, 500);
    }
  }
};
