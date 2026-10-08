import { createHash } from "node:crypto";

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
