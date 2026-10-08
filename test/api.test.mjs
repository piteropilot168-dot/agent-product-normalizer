import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../src/app.mjs";

test("hash API returns deterministic output and rejects oversized UTF-8 input", async (t) => {
  const server = createServer(createApp({ payments: false }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/hash`;

  const sample = await fetch(`${url}/sample`);
  assert.equal(sample.status, 200);
  const sampleBody = await sample.json();
  assert.equal(sampleBody.free_sample, true);
  assert.equal(sampleBody.hex, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  assert.equal(sampleBody.next.path, "/api/v1/hash");

  const ok = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "hello world", algo: "sha256" }),
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("x-agent402-free-sample"), "/api/v1/hash/sample");
  assert.match(ok.headers.get("link"), /<\/api\/v1\/hash\/sample>; rel="preview"/);
  assert.equal((await ok.json()).hex, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");

  const longGet = await fetch(`${url}?text=${"a".repeat(1001)}`);
  assert.equal(longGet.status, 400);
  assert.match((await longGet.json()).error.message, /use POST/);

  const tooLarge = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "🙂".repeat(25_001), algo: "sha256" }),
  });
  assert.equal(tooLarge.status, 400);
  assert.match((await tooLarge.json()).error.message, /100000 UTF-8 bytes/);
});
