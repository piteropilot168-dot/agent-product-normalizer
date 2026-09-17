AGENT PRODUCT NORMALIZER v0.4 — DISTRIBUTION BUILD

This release does NOT add another generic shopping endpoint.
It improves machine discoverability across multiple surfaces.

NEW FREE DISCOVERY SURFACES
/llms.txt
/.well-known/x402.json
/.well-known/agent-card.json
/.well-known/ai-plugin.json
/skill.md

EXISTING PAID SERVICES
normalize      $0.01
extract-offer  $0.01
validate       $0.02
compare        $0.05

PAYMENT
USDC on Base
payTo: 0x74eCCC9bEC502d9Eb390bF15198A234447Dc59F8

DEPLOY
1. Extract this ZIP.
2. Open PowerShell in the folder.
3. Run:
   npx.cmd vercel --prod
4. Choose the existing project:
   peter-8ddc / agent-product-normalizer
5. Check:
   https://agent-product-normalizer.vercel.app/health
   Expected version: 0.4.0

THEN CHECK THESE FREE URLs
https://agent-product-normalizer.vercel.app/llms.txt
https://agent-product-normalizer.vercel.app/.well-known/x402.json
https://agent-product-normalizer.vercel.app/.well-known/agent-card.json
https://agent-product-normalizer.vercel.app/skill.md
