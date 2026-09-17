const DEFAULT_PAY_TO = "0x74eCCC9bEC502d9Eb390bF15198A234447Dc59F8";

export const config = {
  payTo: process.env.PAY_TO_ADDRESS || DEFAULT_PAY_TO,
  network: process.env.X402_NETWORK || "eip155:8453",
  prices: {
    normalize: process.env.X402_PRICE_NORMALIZE || process.env.X402_PRICE || "$0.01",
    extractOffer: process.env.X402_PRICE_EXTRACT_OFFER || "$0.01",
    validate: process.env.X402_PRICE_VALIDATE || "$0.02",
    compare: process.env.X402_PRICE_COMPARE || "$0.05"
  },
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://facilitator.payai.network",
  fetchTimeoutMs: Number(process.env.FETCH_TIMEOUT_MS || 8000),
  maxResponseBytes: Number(process.env.MAX_RESPONSE_BYTES || 2_000_000),
  maxCompareUrls: Number(process.env.MAX_COMPARE_URLS || 5)
};

if (!/^0x[a-fA-F0-9]{40}$/.test(config.payTo)) {
  throw new Error("PAY_TO_ADDRESS must be a valid EVM address");
}
