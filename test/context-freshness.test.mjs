import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { contextFreshness } from "../src/agentops.mjs";
import { createApp } from "../src/app.mjs";

const items = [
  { id: "weather", captured_at: "2026-10-03T15:00:00Z", ttl_seconds: 900, required: true },
  { id: "contract-terms", captured_at: "2026-10-01T10:00:00Z", ttl_seconds: 604800 },
  { id: "inventory", captured_at: "2026-10-03T15:50:00Z", ttl_seconds: 660 },
];

test("context freshness returns only stale and near-expiry refresh work", () => {
  const out = contextFreshness(items, { now: "2026-10-03T16:00:00Z", refreshAheadSeconds: 120 });
  assert.equal(out.decision, "REFRESH_REQUIRED");
  assert.deepEqual(out.stale, ["weather"]);
  assert.deepEqual(out.near_expiry, ["inventory"]);
  assert.deepEqual(out.fresh, ["contract-terms"]);
  assert.equal(out.stats.refresh_calls_avoided, 1);
  assert.equal(out.refresh_plan[0].priority, "required");
});

test("context freshness rejects duplicate ids", () => {
  assert.throws(() => contextFreshness([items[0], { ...items[0] }]), /duplicate id/);
});

test("context freshness route accepts POST and GET JSON", async (t) => {
  const app = createApp({ payments: false });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/context-freshness`;
  const post = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items, now: "2026-10-03T16:00:00Z", refresh_ahead_seconds: 120 }) });
  assert.equal(post.status, 200);
  assert.equal((await post.json()).decision, "REFRESH_REQUIRED");
  const params = new URLSearchParams({ items: JSON.stringify(items), now: "2026-10-03T16:00:00Z", refresh_ahead_seconds: "120" });
  const get = await fetch(`${url}?${params}`);
  assert.equal(get.status, 200);
  assert.deepEqual((await get.json()).stale, ["weather"]);
});
