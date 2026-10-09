import { createHash, randomBytes } from "node:crypto";

const ALGORITHMS = new Set(["sha256", "sha512", "sha1", "md5"]);
const MAX_INPUT_BYTES = 100_000;

const CRAWLER_USER_AGENT = /bot\b|crawler|spider|slurp|facebookexternalhit|headless|uptimerobot|vercel-screenshot|google-inspection/i;
const AGENT_USER_AGENT = /x402|\bmcp\b|agent|langchain|autogen|openai|anthropic|claude|python-requests|httpx|aiohttp|curl|wget|node-fetch|undici|go-http-client/i;
const BROWSER_USER_AGENT = /mozilla\//i;

export function classifyCaller(userAgent = "") {
  const value = typeof userAgent === "string" ? userAgent.trim() : "";
  if (!value) return "unknown";
  if (CRAWLER_USER_AGENT.test(value)) return "crawler";
  if (AGENT_USER_AGENT.test(value)) return "agent";
  if (BROWSER_USER_AGENT.test(value)) return "browser";
  return "unknown";
}

export function classifyX402Traffic({ hasPaymentProof = false, inputPresent = false, catalogSweep = false, integrationProbe = false } = {}) {
  if (hasPaymentProof) return "payment_attempt";
  if (catalogSweep) return "catalog_sweep";
  if (integrationProbe) return "integration_probe";
  return inputPresent ? "priced_intent" : "discovery_probe";
}

export function createCatalogSweepDetector({ windowMs = 15_000, minDistinctPaths = 6, maxClients = 500 } = {}) {
  const salt = randomBytes(16);
  const clients = new Map();

  const digest = (value) => createHash("sha256")
    .update(salt)
    .update(String(value))
    .digest("hex")
    .slice(0, 24);

  return {
    observe({ callerKey = "", path = "", method = "", hasPaymentProof = false, now = Date.now() } = {}) {
      const empty = { isSweep: false, newlyDetected: false, distinctPaths: 0, pairedInputProbe: false };
      if (hasPaymentProof || !callerKey || !path) return empty;
      const cutoff = now - windowMs;
      const key = digest(callerKey);
      const state = clients.get(key) || { paths: new Map(), methods: new Map(), updatedAt: now, sweepActive: false };

      for (const [seenPath, seenAt] of state.paths) {
        if (seenAt < cutoff) {
          state.paths.delete(seenPath);
          state.methods.delete(seenPath);
        }
      }
      if (state.paths.size < minDistinctPaths) state.sweepActive = false;

      method = String(method).toUpperCase();
      const seenMethods = state.methods.get(path) || new Map();
      const pairedInputProbe = method === "POST" && seenMethods.has("GET");
      if (method) seenMethods.set(method, now);
      state.methods.set(path, seenMethods);
      state.paths.set(path, now);
      state.updatedAt = now;
      const isSweep = state.paths.size >= minDistinctPaths;
      const newlyDetected = isSweep && !state.sweepActive;
      state.sweepActive = isSweep;
      clients.set(key, state);

      if (clients.size > maxClients) {
        for (const [clientKey, clientState] of clients) {
          if (clientState.updatedAt < cutoff) clients.delete(clientKey);
        }
      }

      return { isSweep, newlyDetected, distinctPaths: state.paths.size, pairedInputProbe };
    },
  };
}

export function hashText(text, algorithm = "sha256") {
  if (typeof text !== "string") {
    throw new TypeError("text must be a string");
  }
  const inputBytes = Buffer.byteLength(text, "utf8");
  if (inputBytes > MAX_INPUT_BYTES) {
    throw new RangeError(`text must not exceed ${MAX_INPUT_BYTES} UTF-8 bytes`);
  }

  const normalized = String(algorithm || "sha256").toLowerCase();
  if (!ALGORITHMS.has(normalized)) {
    throw new RangeError("algorithm must be one of sha256, sha512, sha1, md5");
  }

  const digest = createHash(normalized).update(text, "utf8").digest();
  return {
    algorithm: normalized,
    input_bytes: inputBytes,
    hex: digest.toString("hex"),
    base64: digest.toString("base64"),
    security_note: ["sha1", "md5"].includes(normalized)
      ? "Legacy digest; do not use for security or collision-resistant identifiers."
      : null,
  };
}
