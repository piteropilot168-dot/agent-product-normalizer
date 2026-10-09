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

  const taskGate = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/task-gate?task=check`);
  assert.equal(taskGate.status, 200);
  assert.equal(taskGate.headers.get("x-agent402-free-sample"), "/api/v1/task-gate/sample");
  assert.match(taskGate.headers.get("link"), /<\/api\/v1\/task-gate\/sample>; rel="preview"/);

  const callValue = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/call-value-gate/sample`);
  assert.equal(callValue.status, 200);
  const callValueBody = await callValue.json();
  assert.equal(callValueBody.free_sample, true);
  assert.equal(callValueBody.decision, "EXECUTE");
  assert.equal(callValueBody.next.path, "/api/v1/call-value-gate");
});

test("public discovery and free samples do not initialize the payment middleware", async (t) => {
  let paymentInitializations = 0;
  const app = createApp({
    payments: true,
    paymentMiddlewareFactory: () => {
      paymentInitializations += 1;
      return (_req, _res, next) => next();
    },
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;

  for (const path of ["/openapi.json", "/llms.txt", "/sitemap.xml", "/robots.txt", "/api/v1/hash/sample", "/api/v1/task-gate/sample", "/api/v1/call-value-gate/sample", "/api/v1/no-progress-gate/sample"]) {
    assert.equal((await fetch(`${base}${path}`)).status, 200);
  }
  assert.equal(paymentInitializations, 0);

  const paidLike = await fetch(`${base}/api/v1/hash?text=hello`);
  assert.equal(paidLike.status, 200);
  assert.equal(paidLike.headers.get("x-agent402-product"), "hash");
  assert.equal(paidLike.headers.get("x-agent402-price"), "$0.0008");
  assert.equal(paidLike.headers.get("x-agent402-free-sample"), "/api/v1/hash/sample");
  assert.equal(paymentInitializations, 1);
});

test("sitemap and robots expose canonical discovery URLs", async (t) => {
  const server = createServer(createApp({ payments: false }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;

  const sitemap = await fetch(`${base}/sitemap.xml`);
  assert.match(sitemap.headers.get("content-type"), /application\/xml/);
  const xml = await sitemap.text();
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /\/openapi\.json<\/loc>/);
  assert.match(xml, /\/api\/v1\/call-value-gate\/sample<\/loc>/);

  const robots = await fetch(`${base}/robots.txt`);
  assert.match(robots.headers.get("content-type"), /text\/plain/);
  assert.match(await robots.text(), /Sitemap: http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml/);
});
