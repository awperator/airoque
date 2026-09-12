/**
 * Minimal Cloudflare Worker stub — same contract as netlify/functions/chat.mjs.
 * Copy SYSTEM_PROMPT from the Netlify function README / source when enabling LLM.
 */

const ALLOWED = new Set([
  "https://airoque.com",
  "https://www.airoque.com",
  "http://localhost:8888",
  "http://localhost:3000",
  "http://127.0.0.1:8888",
  "http://127.0.0.1:3000",
]);

const SYSTEM_PROMPT = `You are the AiroQue Assistant (team voice). Warm, precise, B2B aerospace; short; engineering language.
Starting rates only: CP $750 / complex $1,500; PFD $500; PFMEA $1,500 / rev $750; alignment $1,000; APQP $3,500; inspection $750; WI $500; EC $500; QMS $1,500; monthly $2,500/mo. Fixed quote after scope. NDA available.
Hard no: invent prices/timelines/capacity/certs; never claim AS9100 certification; no ITAR/export-controlled detail; never ask for a call/meeting; no SLA beyond ~one business day on form leads.
If unsure → say so + lead form / customer.support@airoque.com. Soft-qualify aero; soft-park students/vendors/non-aero.`;

function cors(origin) {
  const allow = origin && ALLOWED.has(origin) ? origin : "https://airoque.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: cors(origin),
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: cors(origin),
      });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const replyPath = body.replyPath || {
      type: "stub",
      channel: "airoque-chat",
      sessionId,
      note: "Reserved for AiroQue Chat live handoff",
    };

    if (!message) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400,
        headers: cors(origin),
      });
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "llm_not_configured",
          hint: "Client should use local grounded KB",
          sessionId,
          replyPath,
        }),
        { status: 503, headers: cors(origin) }
      );
    }

    const base = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = env.OPENAI_MODEL || "gpt-4o-mini";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(body.pageUrl
        ? [{ role: "system", content: `Visitor page URL: ${body.pageUrl}. Session: ${sessionId || "unknown"}.` }]
        : []),
      ...history
        .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) })),
      { role: "user", content: message.slice(0, 2000) },
    ];

    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, temperature: 0.3, max_tokens: 500, messages }),
      });
      if (!res.ok) throw new Error(`llm_http_${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("llm_empty");
      return new Response(
        JSON.stringify({
          reply,
          mode: "worker",
          showLead: /\b(quote|nda|contact|email|form|follow.?up)\b/i.test(reply),
          sessionId,
          replyPath,
        }),
        { status: 200, headers: cors(origin) }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "llm_failed", detail: String(err?.message || err).slice(0, 240), sessionId }),
        { status: 502, headers: cors(origin) }
      );
    }
  },
};
