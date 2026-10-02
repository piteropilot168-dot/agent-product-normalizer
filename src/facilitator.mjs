const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createResilientFacilitatorClient(primaryUrl, network, {
  Client,
  logger = console,
  wait = sleep,
  retries = 2,
  discoveryTimeoutMs = 6_000,
  transactionTimeoutMs = 90_000,
} = {}) {
  if (typeof Client !== "function") {
    throw new TypeError("Client must be a facilitator client constructor");
  }

  const transactionClient = new Client({ url: primaryUrl, timeoutMs: transactionTimeoutMs });
  const discoveryClient = new Client({ url: primaryUrl, timeoutMs: discoveryTimeoutMs });

  return {
    async getSupported() {
      let lastError;

      for (let attempt = 1; attempt <= retries; attempt += 1) {
        let supported;
        try {
          supported = await discoveryClient.getSupported();
        } catch (error) {
          lastError = error;
          logger.warn(JSON.stringify({
            event: "x402_facilitator_discovery_failure",
            facilitator: primaryUrl,
            network,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          }));
          if (attempt < retries) await wait(250 * attempt);
          continue;
        }

        // A valid response is authoritative. Do not turn a bad facilitator
        // configuration or malformed response into a plausible 402 challenge.
        if (!Array.isArray(supported?.kinds)) {
          throw new Error("Configured facilitator returned an invalid /supported response");
        }
        const compatible = supported.kinds.some((kind) =>
          kind?.x402Version === 2 && kind?.scheme === "exact" && kind?.network === network,
        );
        if (!compatible) {
          throw new Error(`Configured facilitator does not advertise exact/v2 for ${network}`);
        }

        logger.info(JSON.stringify({
          event: "x402_facilitator_ready",
          facilitator: primaryUrl,
          network,
          attempt,
          capabilitySource: "live",
        }));
        return supported;
      }

      // Payment requirements for this registered exact scheme are deterministic.
      // Keep discovery outages from breaking 402 responses, but verification and
      // settlement still go to the one configured facilitator.
      logger.warn(JSON.stringify({
        event: "x402_facilitator_capability_fallback",
        facilitator: primaryUrl,
        network,
        error: lastError instanceof Error ? lastError.message : String(lastError),
      }));
      return {
        kinds: [{ x402Version: 2, scheme: "exact", network }],
        extensions: [],
        signers: {},
      };
    },

    verify(paymentPayload, paymentRequirements) {
      return transactionClient.verify(paymentPayload, paymentRequirements);
    },

    settle(paymentPayload, paymentRequirements) {
      // Do not retry after timeout: the facilitator may have completed settlement
      // even if its response did not reach us.
      return transactionClient.settle(paymentPayload, paymentRequirements);
    },
  };
}
