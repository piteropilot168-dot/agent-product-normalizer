# Payment discovery update

This branch improves machine-buyer discovery without changing wallets, prices or paid-route runtime logic.

- canonical Agent Card now publishes concrete paid skills with endpoint URLs and per-call prices
- x402 wire flow is explicit: PAYMENT-REQUIRED -> PAYMENT-SIGNATURE -> verify/settle -> PAYMENT-RESPONSE
- Base USDC, exact scheme, configured facilitator and pay-to address are machine-readable
- free samples remain available for Hash and Task Gate
- no payment, wallet, secret or external dependency changes
