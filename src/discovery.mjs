import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

const urlProperty = {
  type: "string",
  format: "uri",
  description: "Public HTTP(S) product page URL",
  maxLength: 2048,
};

const textProperty = (description, maxLength = 20_000) => ({ type: "string", description, maxLength });

const normalizedOutput = {
  example: {
    schema_version: "2026-09-01",
    product: { name: "Example product", brand: "Example brand" },
    offer: { price: "49.90", currency: "EUR", availability: "in_stock" },
    quality: { confidence: 0.95, grade: "high", primary_source: "json_ld", warnings: [] },
  },
};

function singleUrlGet(output) {
  return declareDiscoveryExtension({
    method: "GET",
    input: { url: "https://merchant.example/products/123" },
    inputSchema: {
      type: "object",
      properties: { url: urlProperty },
      required: ["url"],
      additionalProperties: false,
    },
    output,
  });
}

function singleUrlPost(output) {
  return declareDiscoveryExtension({
    method: "POST",
    bodyType: "json",
    input: { url: "https://merchant.example/products/123" },
    inputSchema: {
      type: "object",
      properties: { url: urlProperty },
      required: ["url"],
      additionalProperties: false,
    },
    output,
  });
}

function textGet(name, description, exampleInput, output) {
  return declareDiscoveryExtension({
    method: "GET",
    input: { [name]: exampleInput },
    inputSchema: {
      type: "object",
      properties: { [name]: textProperty(description) },
      required: [name],
      additionalProperties: true,
    },
    output,
  });
}

function textPost(name, description, exampleInput, output, extra = {}) {
  return declareDiscoveryExtension({
    method: "POST",
    bodyType: "json",
    input: { [name]: exampleInput, ...extra.input },
    inputSchema: {
      type: "object",
      properties: { [name]: textProperty(description), ...extra.properties },
      required: extra.required || [name],
      additionalProperties: false,
    },
    output,
  });
}

export const normalizeBrowserDiscovery = singleUrlGet(normalizedOutput);
export const normalizeDiscovery = singleUrlPost(normalizedOutput);

const extractOutput = { example: { source_url: "https://merchant.example/products/123", name: "Example product", price: "49.90", currency: "EUR", availability: "in_stock", seller: "Example merchant", confidence: 0.95 } };
export const extractOfferBrowserDiscovery = singleUrlGet(extractOutput);
export const extractOfferDiscovery = singleUrlPost(extractOutput);

const validateOutput = { example: { url: "https://merchant.example/products/123", score: 92, grade: "A", usable_for_agents: true, issues: [] } };
export const validateBrowserDiscovery = singleUrlGet(validateOutput);
export const validateDiscovery = singleUrlPost(validateOutput);

export const compareBrowserDiscovery = declareDiscoveryExtension({
  method: "GET",
  input: { url: ["https://merchant-a.example/products/123", "https://merchant-b.example/products/123"] },
  inputSchema: {
    type: "object",
    properties: { url: { type: "array", minItems: 2, maxItems: 5, items: urlProperty, description: "Repeat the url query parameter 2 to 5 times" } },
    required: ["url"],
    additionalProperties: false,
  },
  output: { example: { count: 2, best_by_currency: { USD: { price: "1.00", seller: "AgentShelf A" } }, warnings: [] } },
});

export const compareDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: { urls: ["https://merchant-a.example/products/123", "https://merchant-b.example/products/123"] },
  inputSchema: {
    type: "object",
    properties: { urls: { type: "array", minItems: 2, maxItems: 5, items: urlProperty } },
    required: ["urls"],
    additionalProperties: false,
  },
  output: { example: { count: 2, best_by_currency: { USD: { price: "1.00", seller: "AgentShelf A" } }, warnings: [] } },
});

const clarifyOutput = { example: { goal: "Find a black laptop under $1200", hard_constraints: ["budget_or_price: $1200"], soft_preferences: ["prefer black"], ambiguity_signals: [], must_ask_user: false, execution_hint: "proceed-with-best-effort" } };
export const clarifyBrowserDiscovery = textGet("text", "Messy human task or request", "Find me a good black laptop under $1200, preferably light.", clarifyOutput);
export const clarifyDiscovery = textPost("text", "Messy human task or request", "Find me a good black laptop under $1200, preferably light.", clarifyOutput);

const constraintsOutput = { example: { hard_constraints: ["must be under $1200"], soft_preferences: ["prefer black"], exclusions: ["no refurbished units"], budgets_or_prices: ["$1200"], deadlines: [], detected_count: 3 } };
export const extractConstraintsBrowserDiscovery = textGet("text", "Human request containing hard/soft constraints", "Laptop under $1200, black if possible, no refurbished units.", constraintsOutput);
export const extractConstraintsDiscovery = textPost("text", "Human request containing hard/soft constraints", "Laptop under $1200, black if possible, no refurbished units.", constraintsOutput);

const compressOutput = { example: { objective: "Ship release", compact_state: ["Release must be live Friday."], decisions: [], constraints: ["Release must be live Friday."], blockers: [], next_actions: [], stats: { input_chars: 1200, output_chars: 240, items: 6 } } };
export const compressContextBrowserDiscovery = textGet("context", "Long agent conversation, notes, or handoff context", "We need to ship Friday. Budget is fixed. Next, verify deployment.", compressOutput);
export const compressContextDiscovery = textPost("context", "Long agent conversation, notes, or handoff context", "We need to ship Friday. Budget is fixed. Next, verify deployment.", compressOutput, {
  input: { max_items: 12 },
  properties: { max_items: { type: "integer", minimum: 3, maximum: 30, default: 12 } },
});

const askOutput = { example: { ask_user: true, safe_to_infer: false, risk: "medium", reasons: ["external-or-irreversible-action"], question_if_needed: "Confirm the exact action and target before execution.", recommended_mode: "clarify-before-action" } };
export const shouldAskHumanBrowserDiscovery = declareDiscoveryExtension({
  method: "GET",
  input: { task: "Buy the cheapest one for me" },
  inputSchema: {
    type: "object",
    properties: {
      task: textProperty("Task the agent is about to execute", 10_000),
      known_context: textProperty("Relevant known context", 15_000),
      proposed_assumption: textProperty("Assumption the agent wants to make", 4_000),
    },
    required: ["task"],
    additionalProperties: false,
  },
  output: askOutput,
});
export const shouldAskHumanDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: { task: "Buy the cheapest one for me", known_context: "", proposed_assumption: "" },
  inputSchema: {
    type: "object",
    properties: {
      task: textProperty("Task the agent is about to execute", 10_000),
      known_context: textProperty("Relevant known context", 15_000),
      proposed_assumption: textProperty("Assumption the agent wants to make", 4_000),
    },
    required: ["task"],
    additionalProperties: false,
  },
  output: askOutput,
});

const rankOutput = { example: { query: "best compact solar inverter", count: 3, ranked: [{ index: 1, title: "Solar inverter guide", url: "https://example.com/guide", relevance: 0.83, duplicate: false, stale_signal: false, spam_signal: false }], best_index: 1, best_url: "https://example.com/guide" } };
export const rankResultsBrowserDiscovery = declareDiscoveryExtension({
  method: "GET",
  input: { query: "best compact solar inverter", results: "[{\"title\":\"Solar inverter guide\",\"url\":\"https://example.com/guide\",\"snippet\":\"Compact inverter comparison\"}]" },
  inputSchema: {
    type: "object",
    properties: { query: textProperty("Search task/query", 4_000), results: { type: "string", description: "JSON array of search results", maxLength: 20_000 } },
    required: ["query", "results"],
    additionalProperties: false,
  },
  output: rankOutput,
});
export const rankResultsDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: { query: "best compact solar inverter", results: [{ title: "Solar inverter guide", url: "https://example.com/guide", snippet: "Compact inverter comparison" }] },
  inputSchema: {
    type: "object",
    properties: {
      query: textProperty("Search task/query", 4_000),
      results: { type: "array", minItems: 1, maxItems: 25, items: { type: "object", properties: { title: { type: "string", maxLength: 500 }, url: { type: "string", maxLength: 2048 }, snippet: { type: "string", maxLength: 4_000 } }, additionalProperties: true } },
    },
    required: ["query", "results"],
    additionalProperties: false,
  },
  output: rankOutput,
});
