export function openApiDocument(baseUrl = "https://your-deployment.example") {
  const url = { type: "string", format: "uri", maxLength: 2048 };
  const responses = {
    "200": { description: "Successful paid response" },
    "400": { description: "Invalid request" },
    "402": { description: "x402 payment required" },
    "422": { description: "Could not process input" },
    "500": { description: "Unexpected server error" },
  };

  const singleGet = (operationId, summary) => ({ operationId, summary, parameters: [{ name: "url", in: "query", required: true, schema: url }], responses });
  const singlePost = (operationId, summary) => ({
    operationId, summary,
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url"], properties: { url }, additionalProperties: false } } } },
    responses,
  });
  const textGet = (operationId, summary, name, maxLength = 20_000) => ({ operationId, summary, parameters: [{ name, in: "query", required: true, schema: { type: "string", maxLength } }], responses });
  const textPost = (operationId, summary, name, maxLength = 20_000, extras = {}) => ({
    operationId, summary,
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: extras.required || [name], properties: { [name]: { type: "string", maxLength }, ...(extras.properties || {}) }, additionalProperties: false } } } },
    responses,
  });

  const resultItem = {
    type: "object",
    properties: {
      title: { type: "string", maxLength: 500 },
      url: { type: "string", maxLength: 2048 },
      snippet: { type: "string", maxLength: 4000 },
    },
    additionalProperties: true,
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Agent Product Normalizer + Friction API",
      version: "0.6.0",
      description: "Paid x402 micro-utilities for AI agents plus commerce-data utilities. USDC on Base. Every service supports GET plus agent-friendly POST.",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/v1/normalize": { get: singleGet("normalizeProductPageByUrl", "Normalize one public product page"), post: singlePost("normalizeProductPage", "Normalize one public product page") },
      "/api/v1/extract-offer": { get: singleGet("extractOfferByUrl", "Extract compact offer facts"), post: singlePost("extractOffer", "Extract compact offer facts") },
      "/api/v1/validate": { get: singleGet("validateProductDataByUrl", "Score product-data quality"), post: singlePost("validateProductData", "Score product-data quality") },
      "/api/v1/compare": {
        get: { operationId: "compareProductOffersByUrls", summary: "Compare 2 to 5 product pages", parameters: [{ name: "url", in: "query", required: true, schema: { type: "array", minItems: 2, maxItems: 5, items: url }, style: "form", explode: true }], responses },
        post: { operationId: "compareProductOffers", summary: "Compare 2 to 5 product pages", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["urls"], properties: { urls: { type: "array", minItems: 2, maxItems: 5, items: url } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/clarify": {
        get: textGet("clarifyHumanTaskByText", "Turn a messy human request into an execution-ready task", "text"),
        post: textPost("clarifyHumanTask", "Turn a messy human request into an execution-ready task", "text"),
      },
      "/api/v1/extract-constraints": {
        get: textGet("extractTaskConstraintsByText", "Extract hard constraints, preferences, exclusions, budgets and deadlines", "text"),
        post: textPost("extractTaskConstraints", "Extract hard constraints, preferences, exclusions, budgets and deadlines", "text"),
      },
      "/api/v1/compress-context": {
        get: { operationId: "compressAgentContextByText", summary: "Compress context into operational state", parameters: [{ name: "context", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }, { name: "max_items", in: "query", required: false, schema: { type: "integer", minimum: 3, maximum: 30, default: 12 } }], responses },
        post: textPost("compressAgentContext", "Compress context into operational state", "context", 20000, { properties: { max_items: { type: "integer", minimum: 3, maximum: 30, default: 12 } } }),
      },
      "/api/v1/should-ask-human": {
        get: { operationId: "shouldAskHumanByTask", summary: "Decide whether to ask the human or safely infer and continue", parameters: [{ name: "task", in: "query", required: true, schema: { type: "string", maxLength: 10000 } }, { name: "known_context", in: "query", required: false, schema: { type: "string", maxLength: 15000 } }, { name: "proposed_assumption", in: "query", required: false, schema: { type: "string", maxLength: 4000 } }], responses },
        post: { operationId: "shouldAskHuman", summary: "Decide whether to ask the human or safely infer and continue", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["task"], properties: { task: { type: "string", maxLength: 10000 }, known_context: { type: "string", maxLength: 15000 }, proposed_assumption: { type: "string", maxLength: 4000 } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/dedupe-facts": { get: textGet("dedupeFactsByText", "Deduplicate facts and near-duplicate notes", "text"), post: textPost("dedupeFacts", "Deduplicate facts and near-duplicate notes", "text") },
      "/api/v1/detect-conflicts": { get: textGet("detectConflictsByText", "Detect contradictory facts and numeric mismatches", "text"), post: textPost("detectConflicts", "Detect contradictory facts and numeric mismatches", "text") },
      "/api/v1/extract-actions": { get: textGet("extractActionsByText", "Extract concrete action items from text", "text"), post: textPost("extractActions", "Extract concrete action items from text", "text") },
      "/api/v1/make-search-query": { get: textGet("makeSearchQueryByTask", "Turn a verbose task into compact search queries", "task", 8000), post: textPost("makeSearchQuery", "Turn a verbose task into compact search queries", "task", 8000) },
      "/api/v1/missing-fields": {
        get: { operationId: "missingFieldsFromJson", summary: "Check required fields in a JSON object", parameters: [{ name: "input", in: "query", required: true, schema: { type: "string", maxLength: 12000 } }, { name: "required_fields", in: "query", required: true, schema: { type: "string", maxLength: 2000 } }], responses },
        post: { operationId: "missingFields", summary: "Check required fields in a JSON object", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["input","required_fields"], properties: { input: { type: "object", additionalProperties: true }, required_fields: { type: "array", minItems: 1, maxItems: 50, items: { type: "string" } } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/retry-decision": {
        get: { operationId: "retryDecisionByStatus", summary: "Decide whether/how to retry an API or tool failure", parameters: [{ name: "status", in: "query", required: true, schema: { type: "integer" } }, { name: "error", in: "query", required: false, schema: { type: "string", maxLength: 4000 } }, { name: "attempt", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 20 } }], responses },
        post: { operationId: "retryDecision", summary: "Decide whether/how to retry an API or tool failure", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "integer" }, error: { type: "string", maxLength: 4000 }, attempt: { type: "integer", minimum: 1, maximum: 20 } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/prompt-injection-scan": { get: textGet("promptInjectionScanByText", "Scan untrusted text for common prompt-injection patterns", "text"), post: textPost("promptInjectionScan", "Scan untrusted text for common prompt-injection patterns", "text") },
      "/api/v1/redact-secrets": { get: textGet("redactSecretsByText", "Redact common credentials and token patterns", "text"), post: textPost("redactSecrets", "Redact common credentials and token patterns", "text") },
      "/api/v1/handoff-diff": {
        get: { operationId: "handoffDiffByText", summary: "Report what changed between two agent states", parameters: [{ name: "before", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }, { name: "after", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }], responses },
        post: { operationId: "handoffDiff", summary: "Report what changed between two agent states", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["before","after"], properties: { before: { type: "string", maxLength: 20000 }, after: { type: "string", maxLength: 20000 } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/choose-next-step": {
        get: { operationId: "chooseNextStepByText", summary: "Rank candidate next actions against current state", parameters: [{ name: "state", in: "query", required: true, schema: { type: "string", maxLength: 12000 } }, { name: "actions", in: "query", required: true, schema: { type: "string", maxLength: 12000 } }], responses },
        post: { operationId: "chooseNextStep", summary: "Rank candidate next actions against current state", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["state","actions"], properties: { state: { type: "string", maxLength: 12000 }, actions: { type: "array", minItems: 1, maxItems: 30, items: { type: "string", maxLength: 1000 } } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/rank-results": {
        get: { operationId: "rankSearchResultsFromJson", summary: "Rank search results; GET accepts results as a JSON-array string", parameters: [{ name: "query", in: "query", required: true, schema: { type: "string", maxLength: 4000 } }, { name: "results", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }], responses },
        post: { operationId: "rankSearchResults", summary: "Rank search results and flag duplicates, stale results and spam signals", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["query", "results"], properties: { query: { type: "string", maxLength: 4000 }, results: { type: "array", minItems: 1, maxItems: 25, items: resultItem } }, additionalProperties: false } } } }, responses },
      },
    },
  };
}
