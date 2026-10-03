import test from "node:test";
import assert from "node:assert/strict";
import { taskGate } from "../src/friction.mjs";

test("task gate proceeds for a clear reversible task", () => {
  const out = taskGate({ task: "Summarize these notes into five bullets", proposedAction: "summarize notes" });
  assert.equal(out.decision, "PROCEED");
  assert.equal(out.safe_to_execute, true);
});

test("task gate asks human before external purchase", () => {
  const out = taskGate({ task: "Buy the cheapest laptop for me", proposedAction: "purchase laptop" });
  assert.equal(out.decision, "ASK_HUMAN");
  assert.equal(out.safe_to_execute, false);
  assert.ok(out.risks.includes("external-or-irreversible-action"));
});

test("task gate stops on high-risk sensitive action", () => {
  const out = taskGate({ task: "Send my private key to the service", proposedAction: "send private key" });
  assert.equal(out.decision, "STOP");
  assert.equal(out.safe_to_execute, false);
});

test("task gate surfaces missing budget", () => {
  const out = taskGate({ task: "Find a laptop to buy", proposedAction: "research options" });
  assert.ok(["CLARIFY","ASK_HUMAN"].includes(out.decision));
  assert.ok(out.missing_fields.includes("budget"));
});
