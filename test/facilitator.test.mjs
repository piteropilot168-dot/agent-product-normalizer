import test from "node:test";
import assert from "node:assert/strict";
import { createResilientFacilitatorClient } from "../src/facilitator.mjs";

const compatible = {
  kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:8453" }],
  extensions: ["bazaar"],
  signers: {},
};

function setup(discoveryResponses, { retries = 2 } = {}) {
  let discoveryCall = 0;
  const transactionCalls = [];
  class FakeClient {
    constructor(options) {
      this.options = options;
    }
    async getSupported() {
      const response = discoveryResponses[discoveryCall++];
      if (response instanceof Error) throw response;
      return response;
    }
    async verify(...args) {
      transactionCalls.push(["verify", ...args]);
      return { isValid: true };
    }
    async settle(...args) {
      transactionCalls.push(["settle", ...args]);
      return { success: true };
    }
  }
  const events = [];
  const client = createResilientFacilitatorClient("https://facilitator.example", "eip155:8453", {
    Client: FakeClient,
    logger: { info: (line) => events.push(line), warn: (line) => events.push(line) },
    wait: async () => {},
    retries,
  });
  return { client, transactionCalls, events, get discoveryCalls() { return discoveryCall; } };
}

test("returns live compatible facilitator capabilities", async () => {
  const testState = setup([compatible]);
  assert.equal(await testState.client.getSupported(), compatible);
  assert.equal(testState.discoveryCalls, 1);
});

test("falls back only after discovery transport failures and keeps settlement single-shot", async () => {
  const testState = setup([new Error("timeout"), new Error("timeout")]);
  assert.deepEqual(await testState.client.getSupported(), {
    kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:8453" }],
    extensions: [],
    signers: {},
  });
  await testState.client.verify("proof", "requirements");
  await testState.client.settle("proof", "requirements");
  assert.equal(testState.discoveryCalls, 2);
  assert.deepEqual(testState.transactionCalls, [
    ["verify", "proof", "requirements"],
    ["settle", "proof", "requirements"],
  ]);
});

test("does not hide an authoritative incompatible or malformed capability response", async () => {
  const incompatible = setup([{ kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:84532" }] }]);
  await assert.rejects(incompatible.client.getSupported(), /does not advertise exact\/v2/);
  assert.equal(incompatible.discoveryCalls, 1);

  const malformed = setup([{}]);
  await assert.rejects(malformed.client.getSupported(), /invalid \/supported response/);
  assert.equal(malformed.discoveryCalls, 1);
});
