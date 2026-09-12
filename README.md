# AiroQue website (airoque.com)

Static site for **AiroQue Engineering Solutions** — aerospace quality engineering & APQP consulting.

Publish root is this directory (Netlify / GitHub Pages-ready). **Do not invent prices or certifications** when editing copy; published starting rates live on `/pricing`.

---

## Chat architecture (free-text + chips)

The site-wide bubble (`initAiroQueChat` in `app.js` / `app.v20260912c.js`) supports:

1. **Quick chips** (Control Plans, PFMEA, APQP, Pricing, Talk to a human) — unchanged FAQ paths + lead form (Formspree `mnpqddwg`, `source=site-chat`).
2. **Free-text input** in the chat foot — user messages appear in the transcript; typing status while waiting.
3. **Primary interim path: local grounded KB** in the browser (keyword / FAQ expansion from embedded knowledge). Works **without** Netlify Functions or Workers. Does **not** claim a live LLM.
4. **Optional remote API** — `POST` to `window.AIROQUE_CHAT_API` or `/.netlify/functions/chat`. On failure / timeout / undeployed function, the client falls back to the local grounded responder. Hard failures that also break local reply show an apology + lead form / `mailto:customer.support@airoque.com`.

### Client → API JSON (when a function/worker exists)

```json
{
  "sessionId": "aq_…",
  "message": "visitor free text",
  "pageUrl": "https://airoque.com/control-plans",
  "history": [{ "role": "user|assistant", "content": "…" }],
  "replyPath": {
    "type": "stub",
    "channel": "airoque-chat",
    "sessionId": "aq_…",
    "note": "Reserved for AiroQue Chat live handoff; webhook URL TBD"
  }
}
```

### API → client

```json
{
  "reply": "plain text",
  "mode": "openai|ai-gateway|worker",
  "showLead": false,
  "sessionId": "aq_…",
  "replyPath": { "type": "stub", "channel": "airoque-chat", "sessionId": "aq_…" }
}
```

`replyPath` is the reserved channel **AiroQue Chat** can later write replies into (replace `type: "stub"` with a real webhook URL when handoff exists). Until then the stub is echoed only.

### Override API URL

```html
<script>window.AIROQUE_CHAT_API = "https://your-worker.example/chat";</script>
<script src="/app.v20260912c.js"></script>
```

---

## Enabling live LLM (optional)

### A) Netlify Git + Function (preferred when credits allow)

1. Connect this GitHub repo (`awperator/airoque`) to Netlify (Git continuous deploy — **not** manual API zip deploys if credits are exhausted for that path).
2. Ensure `netlify/functions/chat.mjs` is published (default Netlify Functions detection).
3. Set env vars in Netlify → Site settings → Environment variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes\* | OpenAI-compatible key |
| `OPENAI_BASE_URL` | No | Default `https://api.openai.com/v1` |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `AI_GATEWAY_URL` / `NETLIFY_AI_GATEWAY_URL` | No | Netlify AI Gateway base URL if enabled |
| `AI_GATEWAY_KEY` / `NETLIFY_AI_GATEWAY_KEY` | No | Gateway key if not injected by platform |

\*Or configure AI Gateway so the function can resolve a key via gateway env.

4. Redeploy from Git. Client already posts to `/.netlify/functions/chat`.

### B) Cloudflare Worker stub

See `workers/chat/` — deploy `worker.mjs`, set the same OpenAI env secrets, point `window.AIROQUE_CHAT_API` at the worker.

### C) Stay on local grounded KB

No backend required. Free-text remains useful for services/pricing/NDA/export guardrails. AiroQue Chat can take **live handoff later** via `replyPath` + session id without changing the widget shell.

---

## System prompt draft (for AiroQue Chat review)

Canonical copy also lives in `netlify/functions/chat.mjs` as `SYSTEM_PROMPT`.

```
You are the AiroQue Assistant (the AiroQue team voice on airoque.com).

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
- Never claim AiroQue certifies organizations to AS9100 or acts as a registrar.
- No ITAR / export-controlled technical advice; tell visitors not to paste controlled detail in chat; suggest NDA + lead form / customer.support@airoque.com for confidential scope.
- Never ask for a call or meeting.
- Do not promise SLAs beyond ~one business day for form/email leads.
- Soft-qualify aerospace production work; soft-park students, vendor pitches, and clear non-aerospace requests (point to public pages; invite aero production needs via form/email).
- If unsure: say so, then offer the lead form or customer.support@airoque.com.
- Lead capture (quote / NDA / docs / human) when they want a scoped engagement.

Keep answers concise (typically 2–4 short paragraphs). Plain text only (no markdown fences).
```

---

## Assets / SEO — do not remove

- `logo-lockup.png`
- Google site verification meta on HTML pages
- IndexNow key file (`b786c00c9516094168579b34ac54393e.txt`)

## Support

- Formspree: `https://formspree.io/f/mnpqddwg`
- Email: `customer.support@airoque.com`
- Phone: `(805) 501-1013`
