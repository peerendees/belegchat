---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Perplexity API Integration

## Provider-Wahl (BOO-452)

Die Perplexity-Sonar-Modelle sind ueber **zwei gleichwertige Pfade** erreichbar — es reicht EINER der beiden Keys:

| Pfad | Key (Env-Variable) | Key-Praefix | Endpoint |
|------|--------------------|-------------|----------|
| **A — Perplexity direkt** | `PERPLEXITY_API_KEY` | `pplx-` | `api.perplexity.ai` |
| **B — via OpenRouter** | `OPENROUTER_API_KEY` | `sk-or-v1-` | `openrouter.ai/api/v1` |

Ohne beide Keys (Bootstrap-Antwort «kein Provider»): `/research` laeuft nur im **QUICK-Modus** (WebSearch); der DEEP-Tier ist nicht verfuegbar. Kein Hard-Gate — der Skill bleibt nutzbar.

---

## Pfad A: Perplexity direkt

### Endpoint
`POST https://api.perplexity.ai/chat/completions`

### Auth
`Authorization: Bearer ${PERPLEXITY_API_KEY}`

### Modelle

| Modell | Verwendung | Kosten ca. |
|--------|-----------|-----------|
| `sonar` | QUICK-Fallback (wenn WebSearch nicht reicht) | $1/1M Input, $1/1M Output |
| `sonar-deep-research` | DEEP-Tier (komplexe Multi-Aspekt-Recherchen) | $2/1M Input, $8/1M Output |

### Request-Format (OpenAI-kompatibel)

```javascript
const https = require('https');

function callPerplexity(query, model = 'sonar-deep-research') {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Research-Assistent. Liefere praezise, quellengestuetzte Antworten. Strukturiere nach Aspekten. Nenne immer die Quellen.'
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

### Response-Format

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Strukturierte Antwort mit Quellenverweisen [1][2]..."
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

### Wichtig
- `return_citations: true` liefert ein `citations[]` Array mit URLs
- Die Response referenziert Citations als `[1]`, `[2]` etc. im Text
- Timeout: 60s fuer sonar-deep-research (kann laenger brauchen als sonar)
- Rate Limit: Abhaengig vom Perplexity-Plan (Free: 5/min, Pro: 50/min)
- Keine npm-Dependencies noetig — reines `https` stdlib

---

## Pfad B: Perplexity-Sonar-Modelle via OpenRouter (BOO-452)

Wer bereits einen OpenRouter-Account hat, braucht keinen separaten Perplexity-Key: OpenRouter reicht die Sonar-Modelle unter dem `perplexity/`-Praefix durch.

### Endpoint
`POST https://openrouter.ai/api/v1/chat/completions`

### Auth
`Authorization: Bearer ${OPENROUTER_API_KEY}` — der Key beginnt mit `sk-or-v1-` (openrouter.ai/keys).

### Modell-Slugs + Kosten

| OpenRouter-Slug | Verwendung | Kosten (Modellseite) |
|-----------------|-----------|----------------------|
| `perplexity/sonar` | QUICK-Fallback | $1/1M Input, $1/1M Output |
| `perplexity/sonar-deep-research` | DEEP-Tier | $2/1M Input, $8/1M Output; zusaetzlich $5/1000 Searches + $3/1M Reasoning-Tokens |

### Request-Unterschiede zu Pfad A

Das Request-Format ist identisch OpenAI-kompatibel — es aendern sich nur:

- `hostname: 'openrouter.ai'`, `path: '/api/v1/chat/completions'`
- `model: 'perplexity/sonar-deep-research'` (Slug MIT `perplexity/`-Praefix)
- Optional-Header `HTTP-Referer` / `X-Title` (App-Attribution bei OpenRouter)
- Timeout grosszuegiger waehlen (120s) — der Umweg ueber OpenRouter kann laenger dauern als die direkte API

### Preishinweis

Die Token-Preise entsprechen der Perplexity-Preisliste (OpenRouter reicht Provider-Preise durch); `sonar-deep-research` berechnet zusaetzlich Search- und Reasoning-Gebuehren (Tabelle oben). Preise koennen sich aendern — vor groesseren Recherche-Laeufen die Modellseite pruefen.

### Quellenstand (verifiziert 2026-07-12)

- Base-URL + Auth-Header: https://openrouter.ai/docs/api-reference/overview
- Key-Praefix `sk-or-v1-`: https://openrouter.ai/docs/guides/overview/auth/management-api-keys
- Modell-Slugs + Preise: https://openrouter.ai/perplexity/sonar · https://openrouter.ai/perplexity/sonar-deep-research
