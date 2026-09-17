import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

const urlProperty = {
  type: "string",
  format: "uri",
  description: "Public HTTP(S) product page URL",
  maxLength: 2048,
};

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

export const normalizeBrowserDiscovery = singleUrlGet(normalizedOutput);
export const normalizeDiscovery = singleUrlPost(normalizedOutput);

const extractOutput = {
  example: {
    source_url: "https://merchant.example/products/123",
    name: "Example product",
    price: "49.90",
    currency: "EUR",
    availability: "in_stock",
    seller: "Example merchant",
    confidence: 0.95,
  },
};
export const extractOfferBrowserDiscovery = singleUrlGet(extractOutput);
export const extractOfferDiscovery = singleUrlPost(extractOutput);

const validateOutput = {
  example: {
    url: "https://merchant.example/products/123",
    score: 92,
    grade: "A",
    usable_for_agents: true,
    issues: [],
  },
};
export const validateBrowserDiscovery = singleUrlGet(validateOutput);
export const validateDiscovery = singleUrlPost(validateOutput);

export const compareBrowserDiscovery = declareDiscoveryExtension({
  method: "GET",
  input: {
    url: [
      "https://merchant-a.example/products/123",
      "https://merchant-b.example/products/123",
    ],
  },
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: urlProperty,
        description: "Repeat the url query parameter 2 to 5 times",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
  output: {
    example: {
      count: 2,
      best_by_currency: {
        USD: {
          price: "1.00",
          seller: "AgentShelf A",
        },
      },
      warnings: [],
    },
  },
});

export const compareDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: {
    urls: [
      "https://merchant-a.example/products/123",
      "https://merchant-b.example/products/123",
    ],
  },
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: urlProperty,
      },
    },
    required: ["urls"],
    additionalProperties: false,
  },
  output: {
    example: {
      count: 2,
      best_by_currency: {
        USD: {
          price: "1.00",
          seller: "AgentShelf A",
        },
      },
      warnings: [],
    },
  },
});
