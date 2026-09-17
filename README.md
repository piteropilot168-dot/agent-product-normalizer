# Agent Product Normalizer

Machine-first x402 commerce utilities for AI agents.

**Live API:** https://agent-product-normalizer.vercel.app

## Services

| Service | Method | Path | Price |
|---|---|---|---:|
| Normalize product page | GET / POST | `/api/v1/normalize` | $0.01 |
| Extract compact offer | GET / POST | `/api/v1/extract-offer` | $0.01 |
| Validate product data | GET / POST | `/api/v1/validate` | $0.02 |
| Compare 2–5 offers | GET / POST | `/api/v1/compare` | $0.05 |

Payments use **x402**, **USDC**, **Base (eip155:8453)**.

## Discovery

- `https://agent-product-normalizer.vercel.app/catalog`
- `https://agent-product-normalizer.vercel.app/openapi.json`
- `https://agent-product-normalizer.vercel.app/llms.txt`
- `https://agent-product-normalizer.vercel.app/.well-known/x402.json`
- `https://agent-product-normalizer.vercel.app/.well-known/agent-card.json`
- `https://agent-product-normalizer.vercel.app/skill.md`

## Example: normalize one product

```http
GET /api/v1/normalize?url=https%3A%2F%2Fexample.com%2Fproduct
Host: agent-product-normalizer.vercel.app
```

The first unpaid call returns **HTTP 402** with payment requirements. An x402-capable agent can satisfy the payment and retry automatically.

## Example response

```json
{
  "schema_version": "2026-09-01",
  "product": {
    "name": "Example product",
    "brand": "Example brand"
  },
  "offer": {
    "price": "49.90",
    "currency": "EUR",
    "availability": "in_stock"
  },
  "quality": {
    "confidence": 0.95,
    "grade": "high",
    "primary_source": "json_ld",
    "warnings": []
  }
}
```

## Example: compare offers

```http
GET /api/v1/compare?url=https%3A%2F%2Fmerchant-a.example%2Fp%2F123&url=https%3A%2F%2Fmerchant-b.example%2Fp%2F123
Host: agent-product-normalizer.vercel.app
```

## Payment

```text
Protocol: x402
Network: Base
Network ID: eip155:8453
Asset: USDC
Pay-to: 0x74eCCC9bEC502d9Eb390bF15198A234447Dc59F8
```

## Browser test routes

These routes are intended only for manual testing with a browser wallet:

- `/test-payment`
- `/test-extract-offer`
- `/test-validate`
- `/test-compare`

## Local development

Requires Node.js 22+.

```bash
npm install
npm start
```

Default local port: `3000`.

## Health

```http
GET /health
```

Current production version:

```json
{"ok":true,"version":"0.4.0"}
```

## Why this exists

Commerce agents repeatedly need the same low-level work: parse inconsistent product pages, extract a trustworthy offer, assess data quality, and compare multiple sellers. This API exposes those tasks as small, pay-per-request primitives that agents can call without API keys or subscriptions.
