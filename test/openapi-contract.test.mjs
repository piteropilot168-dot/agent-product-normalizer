import test from "node:test";
import assert from "node:assert/strict";
import { openApiDocument } from "../src/openapi.mjs";

test("OpenAPI exposes a typed error envelope for machine callers", () => {
  const document = openApiDocument("https://example.test");
  const schema = document.components.schemas.ErrorEnvelope;
  assert.deepEqual(schema.required, ["error"]);
  assert.deepEqual(schema.properties.error.required, ["code", "message"]);

  for (const status of ["400", "422", "500"]) {
    const response = document.paths["/api/v1/clarify"].post.responses[status];
    assert.equal(response.content["application/json"].schema.$ref, "#/components/schemas/ErrorEnvelope");
  }
});

test("Hash API publishes its success contract and x402 payment headers", () => {
  const document = openApiDocument("https://example.test");
  const responses = document.paths["/api/v1/hash"].post.responses;
  assert.equal(responses["200"].content["application/json"].schema.$ref, "#/components/schemas/HashResult");
  assert.equal(responses["402"].headers["Payment-Required"].required, true);
  assert.equal(responses["402"].content["application/json"].schema.maxProperties, 0);
});

test("No-Progress Gate publishes the paid and free-sample result contracts", () => {
  const document = openApiDocument("https://example.test");
  const paid = document.paths["/api/v1/no-progress-gate"].post.responses["200"];
  const sample = document.paths["/api/v1/no-progress-gate/sample"].get.responses["200"];
  assert.equal(paid.content["application/json"].schema.$ref, "#/components/schemas/NoProgressGateResult");
  assert.equal(sample.content["application/json"].schema.$ref, "#/components/schemas/FreeNoProgressGateSample");
  assert.deepEqual(document.components.schemas.NoProgressGateResult.properties.decision.enum, ["CONTINUE", "REFRAME", "STOP_RETRYING", "ASK_HUMAN"]);
  assert.equal(document.components.schemas.NoProgressTrace.properties.last_call_fingerprint.pattern, "^[0-9a-f]{16}$");
});

test("Task Gate publishes one exact contract for paid and free-sample decisions", () => {
  const document = openApiDocument("https://example.test");
  const paid = document.paths["/api/v1/task-gate"].post.responses["200"];
  const sample = document.paths["/api/v1/task-gate/sample"].get.responses["200"];
  assert.equal(paid.content["application/json"].schema.$ref, "#/components/schemas/TaskGateResult");
  assert.equal(sample.content["application/json"].schema.$ref, "#/components/schemas/FreeTaskGateSample");
  assert.deepEqual(document.components.schemas.TaskGateResult.properties.decision.enum, ["PROCEED", "CLARIFY", "ASK_HUMAN", "STOP"]);
  assert.equal(document.components.schemas.TaskGateResult.additionalProperties, false);
});

test("Call Value Gate publishes its decision and assessed-option contract", () => {
  const document = openApiDocument("https://example.test");
  for (const method of ["get", "post"]) {
    const response = document.paths["/api/v1/call-value-gate"][method].responses["200"];
    assert.equal(response.content["application/json"].schema.$ref, "#/components/schemas/CallValueGateResult");
  }
  assert.deepEqual(document.components.schemas.CallValueGateResult.properties.decision.enum, ["EXECUTE", "USE_ALTERNATIVE", "SKIP", "ASK_HUMAN"]);
  assert.equal(document.components.schemas.CallAssessment.properties.within_budget.type, "boolean");
  const sample = document.paths["/api/v1/call-value-gate/sample"].get.responses["200"];
  assert.equal(sample.content["application/json"].schema.$ref, "#/components/schemas/FreeCallValueGateSample");
});

test("Core workflow tools publish exact response contracts for GET and POST", () => {
  const document = openApiDocument("https://example.test");
  const expected = {
    "/api/v1/clarify": "ClarifyTaskResult",
    "/api/v1/extract-constraints": "ConstraintExtractionResult",
    "/api/v1/compress-context": "ContextCompressionResult",
  };

  for (const [path, schema] of Object.entries(expected)) {
    for (const method of ["get", "post"]) {
      const response = document.paths[path][method].responses["200"];
      assert.equal(response.content["application/json"].schema.$ref, `#/components/schemas/${schema}`);
    }
    assert.equal(document.components.schemas[schema].additionalProperties, false);
  }

  assert.equal(document.components.schemas.ClarifyTaskResult.properties.must_ask_user.type, "boolean");
  assert.equal(document.components.schemas.ConstraintExtractionResult.properties.detected_count.minimum, 0);
  assert.equal(document.components.schemas.ContextCompressionResult.properties.stats.$ref, "#/components/schemas/ContextCompressionStats");
});
