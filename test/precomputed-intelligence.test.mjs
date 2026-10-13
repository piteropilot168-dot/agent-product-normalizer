import test from "node:test";
import assert from "node:assert/strict";
import { aiWorldState, aiWorldDelta } from "../src/precomputed-intelligence.mjs";

test("AI World State has stable source-linked fact records", () => {
  assert.equal(aiWorldState.schema_version, "2026-10-13");
  assert.ok(aiWorldState.items.length >= 5);
  const ids = new Set();
  for (const item of aiWorldState.items) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(item.id));
    ids.add(item.id);
    assert.match(item.date, /^2026-\d{2}-\d{2}$/);
    assert.ok(item.fact.length > 20);
    assert.ok(item.why_agent_cares.length > 20);
    assert.match(item.source, /^https:\/\//);
  }
  assert.equal(aiWorldState.provenance.source_count, new Set(aiWorldState.items.map((item) => item.source)).size);
});

test("AI World Delta can patch a prior snapshot by id", () => {
  assert.equal(aiWorldDelta.unchanged_payload_omitted, true);
  assert.deepEqual(aiWorldDelta.changed_ids, aiWorldState.items.map((item) => item.id));
  assert.deepEqual(aiWorldDelta.added, aiWorldState.items);
  assert.deepEqual(aiWorldDelta.modified, []);
  assert.deepEqual(aiWorldDelta.removed, []);
  assert.match(aiWorldDelta.savings_model.energy_claim, /not estimated/i);
});
