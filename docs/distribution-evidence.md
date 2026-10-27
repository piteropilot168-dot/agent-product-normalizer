# Agent402 distribution evidence (verified actions)

## 2026-10-27 — Agent402.tools public seller index: independently verified

- **Correct seller:** `https://agent-product-normalizer.vercel.app` (not the unrelated `agent402.dev` origin mistakenly used by an earlier one-time workflow).
- **Free registration:** [GitHub Actions run 40498031668](https://github.com/piteropilot168-dot/agent-product-normalizer/actions/runs/40498031668), API HTTP 200, `listed:true`, correct origin, `toolCount:72`, `routable:true`, `health:1`. No payment or credential used.
- **Independent public index verification:** [GitHub Actions run 40498092749](https://github.com/piteropilot168-dot/agent-product-normalizer/actions/runs/40498092749), `GET https://agent402.tools/api/index?seller=agent-product-normalizer.vercel.app` HTTP 200. Exact origin, `payTosByNetwork["eip155:8453"]` containing `0xe17C055B4CBA106B3b86EA3c41F5f9C0558194E3`, `toolCount:72` (`paidToolCount:63`), `routable:true`, `health:1`, and indexed `/api/v1/no-progress-gate`, `/api/v1/task-gate`, `/api/v1/compress-context`.
- The initial directory attempt on `agent402.dev` indexed **someone else's** seller/payee and is not Agent Product Normalizer evidence. It was corrected. The one-time registration workflow was removed after success.
- **Commercial status:** indexed and discoverable, **not** evidence of buyer demand, routing eligibility for any individual tool, settlement, customer or revenue. Prior on-chain crawler settlement remains recorded only once in the separate ledger.

This file records external discovery actions, not revenue or customer conversions.

## 2026-10-27 — x402mpp discovery queue

- Product: existing Agent Product Normalizer, **GET** `https://agent-product-normalizer.vercel.app/api/v1/task-gate`.
- Submission API: `POST https://api.x402mpp.sh/submit` (free public discovery queue).
- API result: **HTTP 202**, `{"status":"queued","id":"sub-6fe2b77c53c6a109c2be9a46","url":"https://agent-product-normalizer.vercel.app/api/v1/task-gate"}`.
- Evidence: [GitHub Actions run 40434538777](https://github.com/piteropilot168-dot/agent-product-normalizer/actions/runs/40434538777), step “Queue existing paid endpoint for free x402 v2 discovery”.
- Status: **queued only**; NOT indexed, buyer intent, organic lead, paid call, or revenue. Recheck the directory before claiming listing. Do not resubmit without a new reason.
- No wallet signature, transfer, secret, or paid listing was used.

## Baseline / next priorities

1. Preserve standard x402 v2 and the configured payee `0xe17C055B4CBA106B3b86EA3c41F5f9C0558194E3`; user wallet control remains unverified.
2. Seek genuine inbound integration requests and organic payments; exclude crawlers, synthetic probes, and self-generated sample traffic.
3. Verify every new on-chain USDC Transfer by transaction hash **and log index** before recording settlement. Existing crawler settlement `0xef5dfdb54bc81e62393b47c794ebb424e5e723979460d0eb9b772c0ec9842fa9` is already recorded in [verified-settlements.md](verified-settlements.md); never double count it.
4. Do not retry x402dash (incompatible v1 body parser) or Agent Bazaar (Cloudflare) unchanged.
5. Favor distribution and qualified paid pilots over building more API prototypes.

The 2026-10-27 01:45 UTC production log window contained no new `x402_settle_success` or `payment_attempt_complete` events. A read-only free sample check by this operator in that window was logged as `sample_engagement`; it is **not** buyer interest.
