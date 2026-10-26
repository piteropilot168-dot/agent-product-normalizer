# Agent402 — verified settlement ledger

This file records independently verified x402 settlement evidence. It is not a customer list, an earnings forecast, a bank statement, or proof that the owner controls the receiving wallet.

## 2026-10-26 — Base USDC settlement (confirmed on-chain)

- **Resource:** `GET https://agent-product-normalizer.vercel.app/api/v1/compress-context`
- **Production event:** 2026-10-26 21:18 CET; Vercel runtime emitted `x402_verify_success`, `x402_settle_success`, and HTTP 200.
- **Transaction:** [Base transaction 0xef5dfdb54bc81e62393b47c794ebb424e5e723979460d0eb9b772c0ec9842fa9](https://basescan.org/tx/0xef5dfdb54bc81e62393b47c794ebb424e5e723979460d0eb9b772c0ec9842fa9)
- **Independent read-only verification:** [GitHub Actions run 40398165756](https://github.com/piteropilot168-dot/agent-product-normalizer/actions/runs/40398165756), completed **success** 2026-10-26 20:43 UTC. The job queried Base JSON-RPC, checked chain ID 8453, successful receipt, canonical USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, ERC-20 Transfer log, exact amount 5000 atomic units (0.005 USDC), and destination `0xe17C055B4CBA106B3b86EA3c41F5f9C0558194E3`. Receipt block 53128283; 749 confirmations at verification.
- **Attribution:** runtime classified caller as **crawler**. This is **not** evidence of an organic buyer, an acquired customer, or repeat purchase.
- **Custody:** control of destination wallet by the user is **not verified**. Do not conflate successful transfer to the nominated public address with confirmed user-accessible funds.
- **Status:** **0.005 USDC gross on-chain settlement verified**; **0 confirmed organic paid customers**; **0 PLN confirmed accessible to user**.
- **Discovery:** PayAI facilitator `GET /discovery/resources?payTo=...` returned one indexed x402 v2 resource (`compress-context`, amount 5000 atomic units), lastUpdated `2026-10-26T20:18:31.276Z`. This is catalog presence, not a second sale.

## Accounting and evidence rules

Only count an amount as on-chain settled when the transaction receipt succeeded and an ERC-20 USDC Transfer log matches the intended recipient and amount. Deduplicate by transaction hash and matching log index. Never infer sales from HTTP 402, Vercel READY, catalog entries, crawler probes, facilitator logs alone, or raw wallet balances. Count organic customers separately only with independent customer-intent evidence. Keep verified on-chain settlement, organic customer count, and user-accessible PLN revenue as separate metrics. Never initiate a payment merely to create a metric.
