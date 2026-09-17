const DEFAULT_PAY_TO = "0x74eCCC9bEC502d9Eb390bF15198A234447Dc59F8";

export const config = {
  payTo: process.env.PAY_TO_ADDRESS || DEFAULT_PAY_TO,
  network: process.env.X402_NETWORK || "eip155:8453",
  prices: {
    normalize: process.env.X402_PRICE_NORMALIZE || process.env.X402_PRICE || "$0.01",
    extractOffer: process.env.X402_PRICE_EXTRACT_OFFER || "$0.01",
    validate: process.env.X402_PRICE_VALIDATE || "$0.02",
    compare: process.env.X402_PRICE_COMPARE || "$0.05",
    clarify: process.env.X402_PRICE_CLARIFY || "$0.005",
    compressContext: process.env.X402_PRICE_COMPRESS_CONTEXT || "$0.005",
    shouldAskHuman: process.env.X402_PRICE_SHOULD_ASK_HUMAN || "$0.003",
    extractConstraints: process.env.X402_PRICE_EXTRACT_CONSTRAINTS || "$0.003",
    rankResults: process.env.X402_PRICE_RANK_RESULTS || "$0.005",
    dedupeFacts: process.env.X402_PRICE_DEDUPE_FACTS || "$0.0015",
    detectConflicts: process.env.X402_PRICE_DETECT_CONFLICTS || "$0.002",
    extractActions: process.env.X402_PRICE_EXTRACT_ACTIONS || "$0.002",
    makeSearchQuery: process.env.X402_PRICE_MAKE_SEARCH_QUERY || "$0.0015",
    missingFields: process.env.X402_PRICE_MISSING_FIELDS || "$0.001",
    retryDecision: process.env.X402_PRICE_RETRY_DECISION || "$0.001",
    promptInjectionScan: process.env.X402_PRICE_PROMPT_INJECTION_SCAN || "$0.002",
    redactSecrets: process.env.X402_PRICE_REDACT_SECRETS || "$0.002",
    handoffDiff: process.env.X402_PRICE_HANDOFF_DIFF || "$0.002",
    chooseNextStep: process.env.X402_PRICE_CHOOSE_NEXT_STEP || "$0.002"
  },
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://facilitator.payai.network",
  fetchTimeoutMs: Number(process.env.FETCH_TIMEOUT_MS || 8000),
  maxResponseBytes: Number(process.env.MAX_RESPONSE_BYTES || 2_000_000),
  maxCompareUrls: Number(process.env.MAX_COMPARE_URLS || 5)
};

if (!/^0x[a-fA-F0-9]{40}$/.test(config.payTo)) {
  throw new Error("PAY_TO_ADDRESS must be a valid EVM address");
}
