# Optional Cloudflare Worker stub (`workers/chat`)

Use this only if Netlify Functions stay unavailable. Mirror the same JSON contract as `netlify/functions/chat.mjs`.

## Request (POST JSON)

```json
{
  "sessionId": "aq_…",
  "message": "visitor text",
  "pageUrl": "https://airoque.com/…",
  "history": [{ "role": "user|assistant", "content": "…" }],
  "replyPath": {
    "type": "stub",
    "channel": "airoque-chat",
    "sessionId": "aq_…",
    "note": "Reserved for AiroQue Chat live handoff; webhook URL TBD"
  }
}
```

## Response

```json
{
  "reply": "plain text",
  "mode": "worker",
  "showLead": false,
  "sessionId": "aq_…",
  "replyPath": { "type": "stub", "channel": "airoque-chat", "sessionId": "aq_…" }
}
```

## Wire-up

1. Deploy `worker.mjs` (same folder) on Cloudflare Workers.
2. Set secrets: `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`, `OPENAI_MODEL`).
3. On the site, before `app.*.js`, set:
   `window.AIROQUE_CHAT_API = "https://<your-worker>.workers.dev/";`
4. Keep CORS allowlist to `https://airoque.com` (+ localhost for tests).

Until a worker/function is live, the browser uses the **local grounded KB** and does not claim a live LLM.
