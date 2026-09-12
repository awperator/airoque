/**
 * AiroQue site chat — Netlify Function (optional until Git-connected deploy).
 * POST JSON → { reply: string, mode?: string, showLead?: boolean, sessionId?: string }
 *
 * Env (set in Netlify UI; do not commit secrets):
 *   OPENAI_API_KEY          — OpenAI-compatible API key (preferred direct path)
 *   OPENAI_BASE_URL         — optional, default https://api.openai.com/v1
 *   OPENAI_MODEL            — optional, default gpt-4o-mini
 *   NETLIFY_AI_GATEWAY_*    — if Netlify AI Gateway is enabled on the site, the
 *                             platform may inject gateway credentials; we also
 *                             honor AI_GATEWAY_URL + AI_GATEWAY_KEY when set.
 *
 * CORS: airoque.com (+ www) and localhost for testing.
 */

const ALLOWED_ORIGINS = new Set([
  "https://airoque.com",
  "https://www.airoque.com",
  "http://localhost:8888",
  "http://localhost:3000",
  "http://127.0.0.1:8888",
  "http://127.0.0.1:3000",
]);

export const SYSTEM_PROMPT = `You are the AiroQue Assistant (the AiroQue team voice on airoque.com).

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

function corsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://airoque.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

function resolveLlmConfig() {
  const gatewayUrl = process.env.AI_GATEWAY_URL || process.env.NETLIFY_AI_GATEWAY_URL;
  const gatewayKey =
    process.env.AI_GATEWAY_KEY ||
    process.env.NETLIFY_AI_GATEWAY_KEY ||
    process.env.NETLIFY_API_TOKEN;
  if (gatewayUrl) {
    return {
      baseUrl: gatewayUrl.replace(/\/$/, ""),
      apiKey: gatewayKey || process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || process.env.AI_GATEWAY_MODEL || "gpt-4o-mini",
      via: "ai-gateway",
    };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    via: "openai",
  };
}

async function callChatCompletions(cfg, messages) {
  const url = `${cfg.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      max_tokens: 500,
      messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`llm_http_${res.status}:${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply || typeof reply !== "string") throw new Error("llm_empty");
  return reply.trim();
}

export default async (req) => {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" }, origin);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" }, origin);
  }

  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  if (!message || message.length > 4000) {
    return json(400, { error: "invalid_message" }, origin);
  }

  const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId : null;
  const pageUrl = typeof payload?.pageUrl === "string" ? payload.pageUrl : null;
  const replyPath = payload?.replyPath || null;
  const history = Array.isArray(payload?.history) ? payload.history.slice(-12) : [];

  const cfg = resolveLlmConfig();
  if (!cfg || !cfg.apiKey) {
    return json(
      503,
      {
        error: "llm_not_configured",
        hint: "Set OPENAI_API_KEY (or AI Gateway env). Client should fall back to local grounded KB.",
        sessionId,
        replyPath,
      },
      origin
    );
  }

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (pageUrl) {
    messages.push({
      role: "system",
      content: `Visitor page URL: ${pageUrl}. Session: ${sessionId || "unknown"}.`,
    });
  }
  for (const turn of history) {
    if (!turn || (turn.role !== "user" && turn.role !== "assistant")) continue;
    if (typeof turn.content !== "string" || !turn.content.trim()) continue;
    messages.push({ role: turn.role, content: turn.content.slice(0, 2000) });
  }
  messages.push({ role: "user", content: message.slice(0, 2000) });

  try {
    const reply = await callChatCompletions(cfg, messages);
    const showLead = /\b(quote|nda|leave a message|lead form|request a quote|scoped quote|confidential project review|follow-?up form)\b/i.test(reply);
    return json(
      200,
      {
        reply,
        mode: cfg.via,
        showLead,
        sessionId,
        /* Echo stub so AiroQue Chat can later attach a writable reply webhook */
        replyPath: replyPath || {
          type: "stub",
          channel: "airoque-chat",
          sessionId,
          note: "Reserved for live handoff",
        },
      },
      origin
    );
  } catch (err) {
    return json(
      502,
      { error: "llm_failed", detail: String(err?.message || err).slice(0, 240), sessionId },
      origin
    );
  }
};

export const config = { path: ["/api/chat", "/.netlify/functions/chat"] };
