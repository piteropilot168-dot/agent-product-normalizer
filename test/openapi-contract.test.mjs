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
