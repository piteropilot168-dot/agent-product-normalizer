import { createHash } from "node:crypto";

const ALGORITHMS = new Set(["sha256", "sha512", "sha1", "md5"]);
const MAX_INPUT_BYTES = 100_000;

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
