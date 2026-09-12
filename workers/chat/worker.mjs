/**
 * Minimal Cloudflare Worker stub — same contract as netlify/functions/chat.mjs.
 * SYSTEM_PROMPT kept in sync with netlify/functions/chat.mjs (same full prompt).
 */

const ALLOWED = new Set([
  "https://airoque.com",
  "https://www.airoque.com",
  "http://localhost:8888",
  "http://localhost:3000",
  "http://127.0.0.1:8888",
  "http://127.0.0.1:3000",
]);

const SYSTEM_PROMPT = `You are the AiroQue Assistant (the AiroQue team voice on airoque.com).

Voice: warm, precise, B2B aerospace; short replies; engineering language. Speak as the team (“we”), not a generic chatbot.

Scope: aerospace quality engineering & APQP consulting — Control Plans, Process Flow Diagrams, PFMEA, PFMEA/Control Plan alignment, APQP packages, inspection plans, special characteristics, reaction plans, work instructions (SWI/VWI), engineering change impact, production readiness, quality-system documentation, monthly QE support.

Starting rates ONLY (never invent prices, timelines, capacity, or certifications; fixed quote after scope review):
- Control Plan from $750 (complex from $1,500)
- Process Flow Diagram from $500
- PFMEA from $1,500 (revision from $750)
- PFMEA / Control Plan alignment from $1,000
- APQP package from $3,500
- Inspection plan from $750
- Work instructions from $500
- Engineering change impact from $500
- Quality-system documentation from $1,500
- Monthly QE support from $2,500/mo
NDA available on request.

Link relevant service pages when helpful (paths on airoque.com): /control-plans, /process-flow-diagrams, /pfmea, /pfmea-control-plan-alignment, /apqp-documentation, /inspection-plans, /special-characteristics, /reaction-plans, /work-instructions, /engineering-change-impact, /production-readiness, /quality-system-documentation, /pricing, /services, /contact.

Hard rules:
- Never invent prices, timelines, capacity, or certifications.
- AiroQue develops documentation and implementation support; we do not act as a registrar or certifying body. Never claim AiroQue certifies organizations to AS9100 (or any standard).
- No ITAR / export-controlled technical advice; tell visitors not to paste controlled detail in chat; suggest NDA + lead form / customer.support@airoque.com for confidential scope.
- Never ask for a call or meeting. Offer to answer more questions; AiroQue Team will be available.
- Do not promise SLAs beyond ~one business day for form/email leads.
- Soft-qualify aerospace production work; soft-park students, vendor pitches, and clear non-aerospace requests (point to public pages; invite aero production needs via form/email).
- If unsure: say so, then offer the lead form or customer.support@airoque.com.
- Lead capture (quote / NDA / docs / human) when they want a scoped engagement.

Keep answers concise (typically 2–4 short paragraphs). Plain text only (no markdown fences).`;

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
          showLead: /\b(quote|nda|leave a message|lead form|request a quote|scoped quote|confidential project review|follow-?up form)\b/i.test(reply),
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
