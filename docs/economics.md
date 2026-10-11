# Agent402 unit economics

Agent402 gates are intended to be cheaper than the waste they prevent. The useful comparison is not endpoint price versus zero; it is endpoint price versus the expected cost of the unnecessary model/tool/retry work that would happen without the gate.

## Decision rule

Use a gate when:

`expected avoided compute + tool fees + latency value + retry risk > gate price`

For a fixed-price gate, the minimum break-even avoided cost is simply its x402 price. A buyer should skip the gate when its own expected avoided cost is lower.

## No-Progress Gate — $0.003

The gate is most valuable in loops where the next action would repeat a tool call, re-run inference, re-read context, or trigger another paid search/API call without materially changing the result.

Illustrative 2026 token-only examples for a single 1,000-input / 500-output-token model call:

| Model/tier | Approx call cost | Gross savings if 1 call is avoided | Savings / $0.003 gate | Break-even avoided calls |
|---|---:|---:|---:|---:|
| GPT-5.6 Luna | $0.0008 | $0.0008 | 0.27x | 4 |
| Gemini paid tier at $1 input / $6 output per 1M | $0.0040 | $0.0040 | 1.33x | 1 |
| GPT-5.6 Terra | $0.0080 | $0.0080 | 2.67x | 1 |
| GPT-5.6 Sol | $0.0140 | $0.0140 | 4.67x | 1 |
| Claude Opus 4.8 | $0.0175 | $0.0175 | 5.83x | 1 |

These examples exclude tool/API charges, search fees, network latency, human waiting time, and downstream retries. When those exist, the break-even point is reached sooner.

The gate already accepts `cost_usd` and `elapsed_ms` per history event. Integrators should populate those fields with their real economics so the decision can be tied to observed spend rather than generic token assumptions.

## High-value waste patterns

The strongest economic targets are situations where one deterministic check can prevent an expensive probabilistic action:

1. **Retry loops** — repeated failed or unchanged tool calls. Prevented cost includes another model turn plus tool/API/network cost.
2. **Stale-context refreshes** — re-fetching data that is still fresh. Prevented cost includes retrieval, parsing, and model tokens used to re-ingest it.
3. **Low-value tool calls** — actions whose probability-weighted value is below their compute, tool, and latency cost.
4. **Missing-field failures** — expensive model/tool execution started before mandatory inputs exist.
5. **Prompt-injection handling** — avoiding compromised downstream tool execution and unnecessary recovery work.
6. **Context bloat** — repeatedly sending redundant facts or long source material that can be compacted deterministically first.

## Product principle

Agent402 should not sell "another API call". It should sell a cheaper decision that prevents a more expensive call.

A gate is economically compelling when its expected savings multiple is comfortably above 1x. Product positioning should therefore prefer workloads where the median prevented action costs several times the gate price, and pricing should be revisited when real traffic shows the opposite.

## Measurement

For each paid product, track only privacy-safe aggregates:

`402 -> free sample/try -> PAYMENT-SIGNATURE -> verify -> settle`

For gates that prevent work, additionally measure when supplied by the caller:

- observed average cost per avoided call,
- estimated calls avoided,
- observed elapsed time avoided,
- gate price,
- gross avoided cost,
- net savings after gate price,
- savings multiple (`gross avoided cost / gate price`).

Do not claim energy savings from token savings without a defensible energy model. Token, request, latency, and direct-dollar savings can be measured directly; energy should be treated as a derived estimate only when the runtime/provider supplies credible power or energy data.

## Pricing discipline

Do not optimize for endpoint count. Keep or raise a price only where measured avoided cost supports it. Reprice, narrow, bundle, or retire products whose buyers cannot plausibly recover the price through avoided compute/tool/latency cost.
