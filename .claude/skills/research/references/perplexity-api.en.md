---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Perplexity API integration

## Provider choice (BOO-452)

The Perplexity Sonar models are reachable via **two equivalent paths** — ONE of the two keys is enough:

| Path | Key (env variable) | Key prefix | Endpoint |
|------|--------------------|------------|----------|
| **A — Perplexity direct** | `PERPLEXITY_API_KEY` | `pplx-` | `api.perplexity.ai` |
| **B — via OpenRouter** | `OPENROUTER_API_KEY` | `sk-or-v1-` | `openrouter.ai/api/v1` |

Without either key (bootstrap answer "no provider"): `/research` runs in **QUICK mode only** (WebSearch); the DEEP tier is unavailable. No hard gate — the skill remains usable.

---

## Path A: Perplexity direct

### Endpoint
`POST https://api.perplexity.ai/chat/completions`

### Auth
`Authorization: Bearer ${PERPLEXITY_API_KEY}`

### Models

| Model | Usage | Cost approx. |
|-------|-------|--------------|
| `sonar` | QUICK fallback (when WebSearch is not enough) | $1/1M input, $1/1M output |
| `sonar-deep-research` | DEEP tier (complex multi-aspect research) | $2/1M input, $8/1M output |

### Request format (OpenAI-compatible)

```javascript
const https = require('https');

function callPerplexity(query, model = 'sonar-deep-research') {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a research assistant. Deliver precise, source-backed answers. Structure by aspect. Always cite sources.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    max_tokens: 4096,
    return_citations: true
  });

  const options = {
    hostname: 'api.perplexity.ai',
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    timeout: 60000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Perplexity API ${res.statusCode}: ${data}`));
        }
        const json = JSON.parse(data);
        resolve({
          content: json.choices?.[0]?.message?.content || '',
          citations: json.citations || []
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Perplexity timeout (60s)')); });
    req.write(body);
    req.end();
  });
}
```

### Response format

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Structured answer with source references [1][2]..."
    }
  }],
  "citations": [
    "https://example.com/source1",
    "https://example.com/source2"
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 800
  }
}
```

### Important
- `return_citations: true` returns a `citations[]` array with URLs
- The response references citations as `[1]`, `[2]` etc. in the text
- Timeout: 60s for sonar-deep-research (can take longer than sonar)
- Rate limit: depends on the Perplexity plan (Free: 5/min, Pro: 50/min)
- No npm dependencies needed — pure `https` stdlib

---

## Path B: Perplexity Sonar models via OpenRouter (BOO-452)

If you already have an OpenRouter account, no separate Perplexity key is needed: OpenRouter passes the Sonar models through under the `perplexity/` prefix.

### Endpoint
`POST https://openrouter.ai/api/v1/chat/completions`

### Auth
`Authorization: Bearer ${OPENROUTER_API_KEY}` — the key starts with `sk-or-v1-` (openrouter.ai/keys).

### Model slugs + cost

| OpenRouter slug | Usage | Cost (model page) |
|-----------------|-------|-------------------|
| `perplexity/sonar` | QUICK fallback | $1/1M input, $1/1M output |
| `perplexity/sonar-deep-research` | DEEP tier | $2/1M input, $8/1M output; plus $5/1000 searches + $3/1M reasoning tokens |

### Request differences vs. path A

The request format is identically OpenAI-compatible — only these change:

- `hostname: 'openrouter.ai'`, `path: '/api/v1/chat/completions'`
- `model: 'perplexity/sonar-deep-research'` (slug WITH the `perplexity/` prefix)
- Optional headers `HTTP-Referer` / `X-Title` (app attribution on OpenRouter)
- Choose a more generous timeout (120s) — the detour via OpenRouter can take longer than the direct API

### Pricing note

Token prices match the Perplexity price list (OpenRouter passes provider prices through); `sonar-deep-research` additionally charges search and reasoning fees (table above). Prices can change — check the model page before large research runs.

### Source status (verified 2026-07-12)

- Base URL + auth header: https://openrouter.ai/docs/api-reference/overview
- Key prefix `sk-or-v1-`: https://openrouter.ai/docs/guides/overview/auth/management-api-keys
- Model slugs + prices: https://openrouter.ai/perplexity/sonar · https://openrouter.ai/perplexity/sonar-deep-research
