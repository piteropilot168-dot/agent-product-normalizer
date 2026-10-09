import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../src/app.mjs";

async function withServer(t) {
  const server = createServer(createApp({ payments: false }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  return `http://127.0.0.1:${server.address().port}`;
}

test("homepage negotiates HTML and Markdown while preserving JSON default", async (t) => {
  const base = await withServer(t);
  const markdown = await fetch(`${base}/`, { headers: { accept: "text/markdown" } });
  assert.equal(markdown.status, 200);
  assert.match(markdown.headers.get("content-type"), /^text\/markdown/);
  assert.match(markdown.headers.get("vary"), /Accept/i);
  assert.match(await markdown.text(), /When to use this API/);

  const html = await fetch(`${base}/`, { headers: { accept: "text/html" } });
  assert.equal(html.status, 200);
  assert.match(html.headers.get("content-type"), /^text\/html/);
  assert.match(await html.text(), /<h1>Agent Product Normalizer<\/h1>/);

  const json = await fetch(`${base}/`);
  assert.equal(json.status, 200);
  assert.equal((await json.json()).name, "Agent Product Normalizer");
});

test("unknown routes return an agent-friendly Markdown 404", async (t) => {
  const base = await withServer(t);
  const response = await fetch(`${base}/missing-route`, { headers: { accept: "text/markdown" } });
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /^text\/markdown/);
  assert.match(response.headers.get("vary"), /Accept/i);
  assert.match(await response.text(), /llms\.txt/);
});
