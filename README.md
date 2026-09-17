# Agent Product Normalizer + Friction API v0.5

Machine-first x402 micro-utilities for AI agents.

Live production origin after deployment:
`https://agent-product-normalizer.vercel.app`

## Friction-killer endpoints

| Service | Path | Price |
|---|---|---:|
| Task Clarifier | `/api/v1/clarify` | $0.005 |
| Context Compressor | `/api/v1/compress-context` | $0.005 |
| Should I Ask The Human? | `/api/v1/should-ask-human` | $0.003 |
| Constraint Extractor | `/api/v1/extract-constraints` | $0.003 |
| Search Result Judge | `/api/v1/rank-results` | $0.005 |

These endpoints are designed to remove repetitive low-value reasoning steps from agent workflows: cleaning messy human intent, deciding whether clarification is necessary, compressing context for handoffs, extracting constraints and ranking search results.

## Commerce endpoints

| Service | Path | Price |
|---|---|---:|
| Product Normalizer | `/api/v1/normalize` | $0.01 |
| Offer Extractor | `/api/v1/extract-offer` | $0.01 |
| Product Validator | `/api/v1/validate` | $0.02 |
| Offer Comparator | `/api/v1/compare` | $0.05 |

All paid routes support GET and POST and use x402 with USDC on Base.

## Discovery

- `/catalog`
- `/openapi.json`
- `/llms.txt`
- `/.well-known/x402.json`
- `/.well-known/agent-card.json`
- `/.well-known/ai-plugin.json`
- `/skill.md`

## Browser settlement tests

- `/test-payment`
- `/test-extract-offer`
- `/test-validate`
- `/test-compare`
- `/test-clarify`
- `/test-compress-context`
- `/test-should-ask-human`
- `/test-extract-constraints`
- `/test-rank-results`

## Payment

```text
Protocol: x402
Network: Base
Network ID: eip155:8453
Asset: USDC
Pay-to: 0x74eCCC9bEC502d9Eb390bF15198A234447Dc59F8
```

## Security hardening in v0.5

The product-page fetcher now validates every redirect target before following it, rather than validating only the initial URL. This reduces SSRF risk from redirects to private/local network targets.

## Local development

Requires Node.js 22+.

```bash
npm install
npm start
```

Health check:

```http
GET /health
```

Expected version after deployment:

```json
{"ok":true,"version":"0.5.1"}
```
