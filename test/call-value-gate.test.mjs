import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { callValueGate } from "../src/agentops.mjs";
import { createApp } from "../src/app.mjs";

const proposed = { id: "remote-search", cost_usd: 0.02, latency_ms: 1500, success_probability: 0.65, value_if_success_usd: 0.1, loss_if_failure_usd: 0.01, remaining_budget_usd: 0.05, latency_cost_per_second_usd: 0.002 };

test("call value gate executes a positive-value affordable call", () => {
  const out = callValueGate(proposed);
  assert.equal(out.decision, "EXECUTE");
  assert.equal(out.selected_call_id, "remote-search");
  assert.equal(out.expected_net_value_usd, 0.0385);
  assert.equal(out.budget_after_usd, 0.027);
});

test("call value gate selects a better alternative and skips negative value", () => {
  const alternate = callValueGate({ ...proposed, alternatives: [{ id: "cache", cost_usd: 0, success_probability: 0.8, value_if_success_usd: 0.08 }] });
  assert.equal(alternate.decision, "USE_ALTERNATIVE");
  assert.equal(alternate.selected_call_id, "cache");
  assert.equal(callValueGate({ ...proposed, value_if_success_usd: 0.01 }).decision, "SKIP");
});

test("required over-budget calls ask for human approval", () => {
  const out = callValueGate({ ...proposed, remaining_budget_usd: 0.01, required: true });
  assert.equal(out.decision, "ASK_HUMAN");
});

test("call value gate route accepts POST and GET JSON", async (t) => {
  const app = createApp({ payments: false });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/call-value-gate`;
  const post = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(proposed) });
  assert.equal(post.status, 200);
  assert.equal((await post.json()).decision, "EXECUTE");
  const get = await fetch(`${url}?input=${encodeURIComponent(JSON.stringify(proposed))}`);
  assert.equal(get.status, 200);
  assert.equal((await get.json()).selected_call_id, "remote-search");
});
