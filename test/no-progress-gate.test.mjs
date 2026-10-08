import test from "node:test";
import assert from "node:assert/strict";
import { noProgressGate } from "../src/agentops.mjs";

test("no-progress gate stops identical calls returning identical results", () => {
  const history = Array.from({ length: 3 }, () => ({
    tool: "web_search",
    args: { query: "agent loop" },
    result: { hits: 0 },
    status: "success",
    elapsed_ms: 120,
    cost_usd: 0.002,
  }));
  const result = noProgressGate({ history, max_calls: 12 });
  assert.equal(result.decision, "STOP_RETRYING");
  assert.equal(result.reason, "same-call-keeps-returning-the-same-result");
  assert.equal(result.trace.exact_call_repeats, 3);
  assert.equal(result.trace.unchanged_result_repeats, 3);
  assert.equal(result.budget.observed_cost_usd, 0.006);
});

test("no-progress gate continues when results change", () => {
  const result = noProgressGate({
    history: [
      { tool: "search", args: { page: 1 }, result: { ids: [1, 2] }, status: "success" },
      { tool: "search", args: { page: 2 }, result: { ids: [3, 4] }, status: "success" },
      { tool: "fetch", args: { id: 3 }, result: { title: "new evidence" }, status: "success" },
    ],
  });
  assert.equal(result.decision, "CONTINUE");
  assert.equal(result.calls_avoided_estimate, 0);
  assert.ok(result.progress_score > 0.5);
});

test("no-progress gate escalates after a configured budget", () => {
  const result = noProgressGate({
    history: [
      { tool: "search", args: { page: 1 }, result: { ids: [1] }, elapsed_ms: 700 },
      { tool: "search", args: { page: 2 }, result: { ids: [2] }, elapsed_ms: 700 },
    ],
    max_elapsed_ms: 1000,
    allow_human_escalation: true,
  });
  assert.equal(result.decision, "ASK_HUMAN");
  assert.equal(result.budget.exceeded, true);
});

test("no-progress fingerprints ignore object key order", () => {
  const result = noProgressGate({
    history: [
      { tool: "lookup", args: { a: 1, b: 2 }, result: { x: 1, y: 2 } },
      { tool: "lookup", args: { b: 2, a: 1 }, result: { y: 2, x: 1 } },
      { tool: "lookup", args: { a: 1, b: 2 }, result: { x: 1, y: 2 } },
    ],
  });
  assert.equal(result.decision, "STOP_RETRYING");
  assert.equal(result.trace.unique_call_count, 1);
  assert.equal(result.trace.unique_result_count, 1);
});
