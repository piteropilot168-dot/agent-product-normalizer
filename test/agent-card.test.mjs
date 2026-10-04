import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/agent-card.mjs";

function makeResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("agent card publishes payment flow and priced skills", () => {
  const req = { headers: { host: "agent-product-normalizer.vercel.app", "x-forwarded-proto": "https" } };
  const res = makeResponse();

  handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.protocolVersion, "1.0");
  assert.equal(res.body.securitySchemes.x402.type, "x402");
  assert.equal(res.body.payment.requestHeader, "PAYMENT-SIGNATURE");
  assert.equal(res.body.payment.challengeHeader, "PAYMENT-REQUIRED");
  assert.equal(res.body.payment.network, "eip155:8453");
  assert.ok(res.body.payment.resources.length >= 8);

  const callValueGate = res.body.skills.find((skill) => skill.id === "call-value-gate");
  assert.ok(callValueGate);
  assert.equal(callValueGate.url, "https://agent-product-normalizer.vercel.app/api/v1/call-value-gate");
  assert.equal(callValueGate.pricing.currency, "USDC");
  assert.equal(callValueGate.pricing.scheme, "exact");
});
