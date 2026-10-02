import { createHash } from "node:crypto";

const ALGORITHMS = new Set(["sha256", "sha512", "sha1", "md5"]);

export function hashText(text, algorithm = "sha256") {
  if (typeof text !== "string") {
    throw new TypeError("text must be a string");
  }
  if (text.length > 100_000) {
    throw new RangeError("text must not exceed 100000 characters");
  }

  const normalized = String(algorithm || "sha256").toLowerCase();
  if (!ALGORITHMS.has(normalized)) {
    throw new RangeError("algorithm must be one of sha256, sha512, sha1, md5");
  }

  const digest = createHash(normalized).update(text, "utf8").digest();
  return {
    algorithm: normalized,
    input_bytes: Buffer.byteLength(text, "utf8"),
    hex: digest.toString("hex"),
    base64: digest.toString("base64"),
  };
}
