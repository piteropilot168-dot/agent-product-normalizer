import test from "node:test";
import assert from "node:assert/strict";
import { classifyCaller, hashText } from "../src/utility.mjs";

test("caller classification separates crawlers, agents, browsers and unknown clients", () => {
  assert.equal(classifyCaller("Googlebot/2.1"), "crawler");
  assert.equal(classifyCaller("python-requests/2.32"), "agent");
  assert.equal(classifyCaller("Mozilla/5.0 Chrome/130"), "browser");
  assert.equal(classifyCaller("custom-client/1.0"), "unknown");
  assert.equal(classifyCaller(), "unknown");
});

test("SHA-256 output is stable and includes both common encodings", () => {
  assert.deepEqual(hashText("hello world"), {
    algorithm: "sha256",
    input_bytes: 11,
    hex: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    base64: "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=",
    security_note: null,
  });
});

test("byte count uses UTF-8 bytes and enforces the advertised cap", () => {
  assert.equal(hashText("🙂".repeat(25_000)).input_bytes, 100_000);
  assert.throws(() => hashText("🙂".repeat(25_001)), /100000 UTF-8 bytes/);
});

test("legacy algorithms are explicitly marked and unsupported algorithms fail", () => {
  assert.match(hashText("hello", "md5").security_note, /Legacy digest/);
  assert.match(hashText("hello", "sha1").security_note, /Legacy digest/);
  assert.equal(hashText("hello", "sha512").security_note, null);
  assert.throws(() => hashText("hello", "sha3"), /algorithm must be one of/);
});

test("input must be text", () => {
  assert.throws(() => hashText(Buffer.from("hello")), /text must be a string/);
});
