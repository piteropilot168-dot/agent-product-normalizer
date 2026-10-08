import test from "node:test";
import assert from "node:assert/strict";
import * as discovery from "../src/discovery.mjs";

function collectSchemaKeywords(value, result = { formats: [], patterns: [] }, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return result;
  seen.add(value);

  if (typeof value.format === "string") result.formats.push(value.format);
  if (typeof value.pattern === "string") result.patterns.push(value.pattern);

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    collectSchemaKeywords(child, result, seen);
  }
  return result;
}

test("Bazaar discovery schemas avoid unsupported formats while retaining validation", () => {
  const keywords = collectSchemaKeywords(Object.values(discovery));

  assert.deepEqual(keywords.formats, []);
  assert.ok(keywords.patterns.some((pattern) => pattern.startsWith("^https?")));
  assert.ok(keywords.patterns.some((pattern) => pattern.includes("[0-9]{4}") && pattern.includes("(?:Z|[+-]")));
});
