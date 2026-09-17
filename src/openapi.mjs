export function openApiDocument(baseUrl = "https://your-deployment.example") {
  const url = { type: "string", format: "uri", maxLength: 2048 };
  const responses = {
    "200": { description: "Successful paid response" },
    "400": { description: "Invalid request" },
    "402": { description: "x402 payment required" },
    "422": { description: "Could not process product page" },
    "500": { description: "Unexpected server error" },
  };

  const singleGet = (operationId, summary) => ({
    operationId,
    summary,
    parameters: [{ name: "url", in: "query", required: true, schema: url }],
    responses,
  });

  const singlePost = (operationId, summary) => ({
    operationId,
    summary,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["url"],
            properties: { url },
            additionalProperties: false,
          },
        },
      },
    },
    responses,
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "Agent Product Normalizer",
      version: "0.4.0",
      description: "Paid x402 commerce-data utilities for AI agents. USDC on Base. Every service supports browser-testable GET plus agent-friendly POST.",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/v1/normalize": {
        get: singleGet("normalizeProductPageByUrl", "Normalize one public product page"),
        post: singlePost("normalizeProductPage", "Normalize one public product page"),
      },
      "/api/v1/extract-offer": {
        get: singleGet("extractOfferByUrl", "Extract compact offer facts"),
        post: singlePost("extractOffer", "Extract compact offer facts"),
      },
      "/api/v1/validate": {
        get: singleGet("validateProductDataByUrl", "Score product-data quality"),
        post: singlePost("validateProductData", "Score product-data quality"),
      },
      "/api/v1/compare": {
        get: {
          operationId: "compareProductOffersByUrls",
          summary: "Compare 2 to 5 product pages. Repeat the url query parameter.",
          parameters: [{
            name: "url",
            in: "query",
            required: true,
            schema: { type: "array", minItems: 2, maxItems: 5, items: url },
            style: "form",
            explode: true,
          }],
          responses,
        },
        post: {
          operationId: "compareProductOffers",
          summary: "Compare 2 to 5 product pages",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["urls"],
                  properties: {
                    urls: { type: "array", minItems: 2, maxItems: 5, items: url },
                  },
                  additionalProperties: false,
                },
              },
            },
          },
          responses,
        },
      },
    },
  };
}
