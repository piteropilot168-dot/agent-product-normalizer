# Agent Product Normalizer + Agent Friction API v0.6

Machine-first x402 micro-utilities for autonomous agents. Live: `https://agent-product-normalizer.vercel.app`

## Agent friction utilities

| Tool | Path | Price |
|---|---|---:|
| Task Clarifier | `/api/v1/clarify` | $0.005 |
| Context Compressor | `/api/v1/compress-context` | $0.005 |
| Should I Ask The Human? | `/api/v1/should-ask-human` | $0.003 |
| Constraint Extractor | `/api/v1/extract-constraints` | $0.003 |
| Search Result Judge | `/api/v1/rank-results` | $0.005 |
| Fact Deduplicator | `/api/v1/dedupe-facts` | $0.0015 |
| Conflict Detector | `/api/v1/detect-conflicts` | $0.002 |
| Action Extractor | `/api/v1/extract-actions` | $0.002 |
| Search Query Builder | `/api/v1/make-search-query` | $0.0015 |
| Missing Field Checker | `/api/v1/missing-fields` | $0.001 |
| Retry Decision | `/api/v1/retry-decision` | $0.001 |
| Prompt Injection Scanner | `/api/v1/prompt-injection-scan` | $0.002 |
| Secret Redactor | `/api/v1/redact-secrets` | $0.002 |
| Handoff Diff | `/api/v1/handoff-diff` | $0.002 |
| Next Step Selector | `/api/v1/choose-next-step` | $0.002 |

## Commerce utilities

| Tool | Path | Price |
|---|---|---:|
| Product Normalizer | `/api/v1/normalize` | $0.01 |
| Offer Extractor | `/api/v1/extract-offer` | $0.01 |
| Product Validator | `/api/v1/validate` | $0.02 |
| Offer Comparator | `/api/v1/compare` | $0.05 |

All paid routes support GET and POST, use x402, settle USDC on Base, and pay directly to the configured wallet.

## Discovery

`/catalog` · `/openapi.json` · `/llms.txt` · `/.well-known/x402.json` · `/.well-known/agent-card.json` · `/.well-known/ai-plugin.json` · `/skill.md`

## Why v0.6

The new tools target repeated agent overhead rather than expensive model inference: duplicate context, conflicting facts, action extraction, verbose search requests, missing tool inputs, retry handling, prompt-injection triage, secret redaction and handoff deltas. They are intentionally small and cheap so a router can use them as infrastructure primitives.

## Local

```bash
npm install
npm start
npm run check
```

Health: `GET /health` → `{"ok":true,"version":"0.6.0"}`
