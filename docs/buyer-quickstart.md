# No-Progress Gate — buyer quickstart (free first)

A deterministic checkpoint for agents that are about to repeat the same paid tool call or model step without a meaningful change in results. It is **not** an LLM, a promise of cost savings, or a substitute for a local guardrail.

## 1. Try your own trace without a wallet

**Node.js 22+ (no dependencies, no wallet):** run [`examples/no-progress-gate-try.mjs`](../examples/no-progress-gate-try.mjs) from the repository root with `node examples/no-progress-gate-try.mjs`. The script sends a synthetic three-event trace to the free trial endpoint, prints the decision and never sends a payment signature. For your own **sanitized** 2–3 event trace, pipe a JSON object with a `history` array to the script using `--stdin`. Never include secrets, personal data, or customer records. The script was checked locally with a mock endpoint; that is not proof of a live payment or successful production call.

The free endpoint accepts **2–3 events** and uses default thresholds. The following example contains three identical, unsuccessful searches. The data are synthetic and contain no customer information.

```sh
curl --fail-with-body --silent --show-error \
  -X POST 'https://agent-product-normalizer.vercel.app/api/v1/no-progress-gate/try' \
  -H 'content-type: application/json' \
  --data '{
    "history": [
      {"tool":"web_search","args":{"query":"example API retry"},"result":{"hits":0},"status":"success","elapsed_ms":120,"cost_usd":0.014},
      {"tool":"web_search","args":{"query":"example API retry"},"result":{"hits":0},"status":"success","elapsed_ms":120,"cost_usd":0.014},
      {"tool":"web_search","args":{"query":"example API retry"},"result":{"hits":0},"status":"success","elapsed_ms":120,"cost_usd":0.014}
    ]
  }'
```

The free-try response wraps the actual decision inside `result`. Read **`result.decision`**, **`result.reason`**, **`result.next_action`** and **`result.trace`** (not top-level `decision` or `trace`). The top-level `next` describes the optional paid x402 route; it does **not** initiate payment. For repeated identical results, the expected signal is to stop retrying or reframe the request. This is a **free evaluation**, not a payment or a verified sale.

## 2. Wire the decision into an existing agent loop

1. Keep a short, sanitized history of recent tool calls and outcomes.
2. Before a **costly** retry, compare the expected cost of that retry with the gate price and with any available local guardrail.
3. On `STOP_RETRYING`, do not make the identical call again; change the query, source, or workflow. On `REFRAME`, change the strategy. On `ASK_HUMAN`, request the missing decision from a human. On `CONTINUE`, the gate has not identified a sufficient reason to stop; the caller still owns its budget and safety checks.
4. Measure actual avoided calls and costs. Do not count the same prevented call twice or treat a free trial as revenue.

**Example economics, not a savings claim:** if the next unnecessary call would cost $0.014 and the paid gate costs $0.003, preventing that one call would leave $0.011 in *direct modeled* savings before network overhead and other costs. If the call would cost only $0.001, buying the $0.003 gate to avoid it is uneconomic; use a local check.

## 3. Paid route for longer traces and configurable thresholds

`POST /api/v1/no-progress-gate` supports longer histories (up to 100 events) and configurable options described in [OpenAPI](https://agent-product-normalizer.vercel.app/openapi.json). The advertised price is **$0.003 USDC on Base per paid call**.

Without payment authorization, a POST to this route returns **HTTP 402** and an x402 v2 `Payment-Required` header containing the payment requirements. An x402-compatible client must explicitly authorize the payment and retry with `PAYMENT-SIGNATURE`. Do not send funds or construct a payment proof from this guide alone. A 402 response is **not** evidence of settlement.

The free route is constrained by design; it is not a free substitute for paid processing. Do not submit credentials, payment proofs, private customer data, or secrets in example traces.

## 4. Decide whether to integrate

This service makes sense when a buyer can measure a recurring retry-loop cost **materially higher than $0.003** and cannot solve the same problem locally for less. Before integrating, test on representative traces and compare the gate's decision with the agent's existing retry policy.

For a technical or paid-pilot question, [open an integration inquiry](https://github.com/piteropilot168-dot/agent-product-normalizer/issues/new?template=integration-request.yml) with the use case, approximate call volume, and constraints — **no private traces or credentials**. The inquiry itself is free and does not authorize a charge.

**Verification boundary:** this document describes the published API contract and source examples. It does not claim that a new external buyer, a payment, or an end-to-end settlement has occurred.
