export function openApiDocument(baseUrl = "https://your-deployment.example") {
  const url = { type: "string", format: "uri", maxLength: 2048 };
  const errorContent = {
    "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
  };
  const responses = {
    "200": { description: "Successful paid response" },
    "400": { description: "Invalid request", content: errorContent },
    "402": {
      description: "x402 payment required. Decode the base64 Payment-Required header to inspect accepted payment options.",
      headers: {
        "Payment-Required": {
          required: true,
          description: "Base64-encoded x402 v2 payment requirements.",
          schema: { type: "string", minLength: 1 },
        },
        Link: {
          description: "Optional free preview route, using rel=preview, when a sample exists.",
          schema: { type: "string" },
        },
        "X-Agent402-Free-Sample": {
          description: "Optional path to a free response-shape sample.",
          schema: { type: "string" },
        },
        "X-Agent402-Product": {
          required: true,
          description: "Stable product identifier for conversion and routing telemetry.",
          schema: { type: "string", minLength: 1 },
        },
        "X-Agent402-Price": {
          required: true,
          description: "Advertised per-call price for this product.",
          schema: { type: "string", pattern: "^\\$[0-9]+(?:\\.[0-9]+)?$" },
        },
      },
      content: { "application/json": { schema: { type: "object", maxProperties: 0 } } },
    },
    "422": { description: "Could not process input", content: errorContent },
    "500": { description: "Unexpected server error", content: errorContent },
  };
  const hashResponses = {
    ...responses,
    "200": {
      description: "Deterministic hash result",
      content: { "application/json": { schema: { $ref: "#/components/schemas/HashResult" } } },
    },
  };
  const noProgressResponses = {
    ...responses,
    "200": {
      description: "No-progress decision and compact trace diagnostics",
      content: { "application/json": { schema: { $ref: "#/components/schemas/NoProgressGateResult" } } },
    },
  };
  const taskGateResponses = {
    ...responses,
    "200": {
      description: "Task preflight decision",
      content: { "application/json": { schema: { $ref: "#/components/schemas/TaskGateResult" } } },
    },
  };
  const callValueResponses = {
    ...responses,
    "200": {
      description: "Expected-value decision and assessed call options",
      content: { "application/json": { schema: { $ref: "#/components/schemas/CallValueGateResult" } } },
    },
  };
  const typedResponses = (schema, description) => ({
    ...responses,
    "200": {
      description,
      content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } },
    },
  });
  const clarifyResponses = typedResponses("ClarifyTaskResult", "Execution-ready task clarification");
  const constraintResponses = typedResponses("ConstraintExtractionResult", "Extracted task constraints");
  const compressionResponses = typedResponses("ContextCompressionResult", "Compressed operational context");
  const dedupeResponses = typedResponses("DedupeFactsResult", "Deduplicated facts and duplicate mapping");
  const redactionResponses = typedResponses("SecretRedactionResult", "Redacted text and detected secret categories");
  const handoffDiffResponses = typedResponses("HandoffDiffResult", "Added and removed handoff facts");

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
      title: "Agent Product Normalizer + Video Intelligence API",
      version: "0.9.6",
      description: "Paid x402 microservices for autonomous agents: high-frequency hashing, video context extraction, workflow compression, safety helpers and commerce normalization. USDC on Base. Most services support both browser-friendly GET and agent-friendly POST; trace-heavy services may be POST-only.",
    },
    servers: [{ url: baseUrl }],
    components: {
      schemas: {
        ErrorEnvelope: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", minLength: 1, examples: ["INVALID_JSON"] },
                message: { type: "string", minLength: 1, examples: ["request body must be valid JSON"] },
                docs: { type: "string", format: "uri" },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        HashResult: {
          type: "object",
          required: ["algorithm", "input_bytes", "hex", "base64", "security_note"],
          properties: {
            algorithm: { type: "string", enum: ["sha256", "sha512", "sha1", "md5"] },
            input_bytes: { type: "integer", minimum: 0, maximum: 100000 },
            hex: { type: "string", pattern: "^[0-9a-f]+$" },
            base64: { type: "string", contentEncoding: "base64" },
            security_note: { type: ["string", "null"] },
          },
          additionalProperties: false,
        },
        ClarifyTaskResult: {
          type: "object",
          required: ["goal", "hard_constraints", "soft_preferences", "context_facts", "ambiguity_signals", "must_ask_user", "question_if_needed", "execution_hint"],
          properties: {
            goal: { type: "string" },
            hard_constraints: { type: "array", items: { type: "string" } },
            soft_preferences: { type: "array", items: { type: "string" } },
            context_facts: { type: "array", maxItems: 12, items: { type: "string" } },
            ambiguity_signals: { type: "array", uniqueItems: true, items: { type: "string", enum: ["vague-object", "subjective-criterion", "missing-budget", "missing-deadline"] } },
            must_ask_user: { type: "boolean" },
            question_if_needed: { type: ["string", "null"] },
            execution_hint: { type: "string", enum: ["ask-one-question-then-act", "proceed-with-best-effort"] },
          },
          additionalProperties: false,
        },
        ConstraintExtractionResult: {
          type: "object",
          required: ["hard_constraints", "soft_preferences", "exclusions", "budgets_or_prices", "deadlines", "detected_count"],
          properties: {
            hard_constraints: { type: "array", items: { type: "string" } },
            soft_preferences: { type: "array", items: { type: "string" } },
            exclusions: { type: "array", items: { type: "string" } },
            budgets_or_prices: { type: "array", items: { type: "string" } },
            deadlines: { type: "array", items: { type: "string" } },
            detected_count: { type: "integer", minimum: 0 },
          },
          additionalProperties: false,
        },
        ContextCompressionStats: {
          type: "object",
          required: ["input_chars", "output_chars", "items"],
          properties: {
            input_chars: { type: "integer", minimum: 0, maximum: 20000 },
            output_chars: { type: "integer", minimum: 0 },
            items: { type: "integer", minimum: 0, maximum: 30 },
          },
          additionalProperties: false,
        },
        ContextCompressionResult: {
          type: "object",
          required: ["objective", "compact_state", "decisions", "constraints", "blockers", "next_actions", "stats"],
          properties: {
            objective: { type: "string" },
            compact_state: { type: "array", maxItems: 30, items: { type: "string" } },
            decisions: { type: "array", maxItems: 30, items: { type: "string" } },
            constraints: { type: "array", maxItems: 30, items: { type: "string" } },
            blockers: { type: "array", maxItems: 30, items: { type: "string" } },
            next_actions: { type: "array", maxItems: 30, items: { type: "string" } },
            stats: { $ref: "#/components/schemas/ContextCompressionStats" },
          },
          additionalProperties: false,
        },
        DuplicateFact: {
          type: "object",
          required: ["index", "text", "duplicate_of", "similarity"],
          properties: {
            index: { type: "integer", minimum: 0, maximum: 59 },
            text: { type: "string" },
            duplicate_of: { type: "integer", minimum: 0, maximum: 59 },
            similarity: { type: "number", minimum: 0, maximum: 1 },
          },
          additionalProperties: false,
        },
        DedupeFactsResult: {
          type: "object",
          required: ["input_count", "unique_count", "unique_facts", "duplicates"],
          properties: {
            input_count: { type: "integer", minimum: 1, maximum: 60 },
            unique_count: { type: "integer", minimum: 1, maximum: 60 },
            unique_facts: { type: "array", minItems: 1, maxItems: 60, items: { type: "string" } },
            duplicates: { type: "array", maxItems: 59, items: { $ref: "#/components/schemas/DuplicateFact" } },
          },
          additionalProperties: false,
        },
        SecretRedactionResult: {
          type: "object",
          required: ["redacted_text", "redaction_count", "types", "changed"],
          properties: {
            redacted_text: { type: "string", maxLength: 30000 },
            redaction_count: { type: "integer", minimum: 0 },
            types: { type: "array", uniqueItems: true, items: { type: "string", enum: ["evm-private-key", "jwt", "generic-api-key", "aws-access-key", "github-token"] } },
            changed: { type: "boolean" },
          },
          additionalProperties: false,
        },
        HandoffDiffResult: {
          type: "object",
          required: ["before_count", "after_count", "added", "removed", "changed"],
          properties: {
            before_count: { type: "integer", minimum: 1, maximum: 60 },
            after_count: { type: "integer", minimum: 1, maximum: 60 },
            added: { type: "array", maxItems: 60, items: { type: "string" } },
            removed: { type: "array", maxItems: 60, items: { type: "string" } },
            changed: { type: "boolean" },
          },
          additionalProperties: false,
        },
        TaskGateResult: {
          type: "object",
          required: ["decision", "goal", "missing_fields", "risks", "hard_constraints", "safe_to_execute", "next_action"],
          properties: {
            decision: { type: "string", enum: ["PROCEED", "CLARIFY", "ASK_HUMAN", "STOP"] },
            goal: { type: "string" },
            missing_fields: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            hard_constraints: { type: "array", items: { type: "string" } },
            safe_to_execute: { type: "boolean" },
            next_action: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
        FreeTaskGateSample: {
          type: "object",
          required: ["free_sample", "decision", "goal", "missing_fields", "risks", "hard_constraints", "safe_to_execute", "next_action", "next"],
          properties: {
            free_sample: { type: "boolean", const: true },
            decision: { type: "string", enum: ["PROCEED", "CLARIFY", "ASK_HUMAN", "STOP"] },
            goal: { type: "string" },
            missing_fields: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            hard_constraints: { type: "array", items: { type: "string" } },
            safe_to_execute: { type: "boolean" },
            next_action: { type: "string", minLength: 1 },
            next: { type: "object", additionalProperties: true },
          },
          additionalProperties: false,
        },
        CallAssessment: {
          type: "object",
          required: ["id", "cost_usd", "latency_ms", "success_probability", "expected_gross_value_usd", "latency_cost_usd", "expected_net_value_usd", "roi", "within_budget"],
          properties: {
            id: { type: "string", minLength: 1, maxLength: 200 },
            cost_usd: { type: "number", minimum: 0 },
            latency_ms: { type: "number", minimum: 0 },
            success_probability: { type: "number", minimum: 0, maximum: 1 },
            expected_gross_value_usd: { type: "number" },
            latency_cost_usd: { type: "number", minimum: 0 },
            expected_net_value_usd: { type: "number" },
            roi: { type: ["number", "null"] },
            within_budget: { type: "boolean" },
          },
          additionalProperties: false,
        },
        CallValueGateResult: {
          type: "object",
          required: ["decision", "selected_call_id", "expected_net_value_usd", "budget_after_usd", "proposed_call", "alternatives", "assumptions", "next_action"],
          properties: {
            decision: { type: "string", enum: ["EXECUTE", "USE_ALTERNATIVE", "SKIP", "ASK_HUMAN"] },
            selected_call_id: { type: ["string", "null"] },
            expected_net_value_usd: { type: ["number", "null"] },
            budget_after_usd: { type: "number", minimum: 0 },
            proposed_call: { $ref: "#/components/schemas/CallAssessment" },
            alternatives: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/CallAssessment" } },
            assumptions: {
              type: "object",
              required: ["latency_cost_per_second_usd", "min_expected_net_value_usd"],
              properties: {
                latency_cost_per_second_usd: { type: "number", minimum: 0 },
                min_expected_net_value_usd: { type: "number", minimum: 0 },
              },
              additionalProperties: false,
            },
            next_action: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
        FreeCallValueGateSample: {
          type: "object",
          required: ["free_sample", "input", "decision", "selected_call_id", "expected_net_value_usd", "budget_after_usd", "proposed_call", "alternatives", "assumptions", "next_action", "next"],
          properties: {
            free_sample: { type: "boolean", const: true },
            input: { type: "object", additionalProperties: true },
            decision: { type: "string", enum: ["EXECUTE", "USE_ALTERNATIVE", "SKIP", "ASK_HUMAN"] },
            selected_call_id: { type: ["string", "null"] },
            expected_net_value_usd: { type: ["number", "null"] },
            budget_after_usd: { type: "number", minimum: 0 },
            proposed_call: { $ref: "#/components/schemas/CallAssessment" },
            alternatives: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/CallAssessment" } },
            assumptions: {
              type: "object",
              required: ["latency_cost_per_second_usd", "min_expected_net_value_usd"],
              properties: {
                latency_cost_per_second_usd: { type: "number", minimum: 0 },
                min_expected_net_value_usd: { type: "number", minimum: 0 },
              },
              additionalProperties: false,
            },
            next_action: { type: "string", minLength: 1 },
            next: { type: "object", additionalProperties: true },
          },
          additionalProperties: false,
        },
        NoProgressTrace: {
          type: "object",
          required: ["event_count", "unique_call_count", "unique_result_count", "exact_call_repeats", "unchanged_result_repeats", "repeated_failures", "last_call_fingerprint", "last_result_fingerprint"],
          properties: {
            event_count: { type: "integer", minimum: 2, maximum: 100 },
            unique_call_count: { type: "integer", minimum: 1, maximum: 100 },
            unique_result_count: { type: "integer", minimum: 1, maximum: 100 },
            exact_call_repeats: { type: "integer", minimum: 1, maximum: 100 },
            unchanged_result_repeats: { type: "integer", minimum: 1, maximum: 100 },
            repeated_failures: { type: "integer", minimum: 0, maximum: 100 },
            last_call_fingerprint: { type: "string", pattern: "^[0-9a-f]{16}$" },
            last_result_fingerprint: { type: "string", pattern: "^[0-9a-f]{16}$" },
          },
          additionalProperties: false,
        },
        NoProgressBudget: {
          type: "object",
          required: ["exceeded", "call_limit", "elapsed_limit_ms", "cost_limit_usd", "observed_elapsed_ms", "observed_cost_usd"],
          properties: {
            exceeded: { type: "boolean" },
            call_limit: { type: "number", exclusiveMinimum: 0, maximum: 1000 },
            elapsed_limit_ms: { type: ["number", "null"], exclusiveMinimum: 0, maximum: 86400000 },
            cost_limit_usd: { type: ["number", "null"], exclusiveMinimum: 0, maximum: 1000000 },
            observed_elapsed_ms: { type: "number", minimum: 0 },
            observed_cost_usd: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
        NoProgressGateResult: {
          type: "object",
          required: ["decision", "progress_score", "reason", "next_action", "calls_avoided_estimate", "trace", "budget"],
          properties: {
            decision: { type: "string", enum: ["CONTINUE", "REFRAME", "STOP_RETRYING", "ASK_HUMAN"] },
            progress_score: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", minLength: 1 },
            next_action: { type: "string", minLength: 1 },
            calls_avoided_estimate: { type: "integer", minimum: 0, maximum: 10 },
            trace: { $ref: "#/components/schemas/NoProgressTrace" },
            budget: { $ref: "#/components/schemas/NoProgressBudget" },
          },
          additionalProperties: false,
        },
        FreeNoProgressGateSample: {
          type: "object",
          required: ["free_sample", "input", "decision", "progress_score", "reason", "next_action", "calls_avoided_estimate", "trace", "budget", "next"],
          properties: {
            free_sample: { type: "boolean", const: true },
            input: { type: "object", additionalProperties: true },
            decision: { type: "string", enum: ["CONTINUE", "REFRAME", "STOP_RETRYING", "ASK_HUMAN"] },
            progress_score: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", minLength: 1 },
            next_action: { type: "string", minLength: 1 },
            calls_avoided_estimate: { type: "integer", minimum: 0, maximum: 10 },
            trace: { $ref: "#/components/schemas/NoProgressTrace" },
            budget: { $ref: "#/components/schemas/NoProgressBudget" },
            next: { type: "object", additionalProperties: true },
          },
          additionalProperties: false,
        },
      },
    },
    paths: {
      "/api/v1/hash": {
        get: {
          operationId: "hashTextByQuery",
          summary: "Hash text with SHA-256, SHA-512, SHA-1 or MD5",
          description: "Returns deterministic hex and base64 digests. Maximum input 100000 UTF-8 bytes. SHA-1 and MD5 are legacy only and are not suitable for security or collision-resistant IDs. Query strings may be logged; use POST and do not submit secrets.",
          parameters: [
            { name: "text", in: "query", required: true, schema: { type: "string", maxLength: 1000, description: "Short public text only; use POST for larger inputs." } },
            { name: "algo", in: "query", required: false, schema: { type: "string", enum: ["sha256","sha512","sha1","md5"], default: "sha256" } }
          ],
          responses: hashResponses,
        },
        post: {
          operationId: "hashText",
          summary: "Hash text with SHA-256, SHA-512, SHA-1 or MD5",
          description: "Returns deterministic hex and base64 digests. Maximum input 100000 UTF-8 bytes. SHA-1 and MD5 are legacy only and are not suitable for security or collision-resistant IDs.",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object",
            required: ["text"],
            properties: {
              text: { type: "string", maxLength: 100000, description: "Maximum 100000 UTF-8 bytes." },
              algo: { type: "string", enum: ["sha256","sha512","sha1","md5"], default: "sha256" }
            },
            additionalProperties: false
          } } } },
          responses: hashResponses,
        },
      },
      "/api/v1/hash/sample": {
        get: {
          operationId: "getFreeHashSample",
          summary: "Get a free fixed hash example without payment",
          description: "Returns the SHA-256 digest of the fixed public example “hello world”. Use this to inspect the response shape before paying to hash your own text.",
          responses: {
            "200": {
              description: "Free fixed sample; no payment required.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/HashResult" }, example: {
                free_sample: true,
                input: "hello world",
                algorithm: "sha256",
                input_bytes: 11,
                hex: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                base64: "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=",
                security_note: null,
                next: { method: "POST", path: "/api/v1/hash", payment: "x402" }
              } } }
            }
          }
        }
      },
      "/api/v1/normalize": { get: singleGet("normalizeProductPageByUrl", "Normalize one public product page"), post: singlePost("normalizeProductPage", "Normalize one public product page") },
      "/api/v1/extract-offer": { get: singleGet("extractOfferByUrl", "Extract compact offer facts"), post: singlePost("extractOffer", "Extract compact offer facts") },
      "/api/v1/validate": { get: singleGet("validateProductDataByUrl", "Score product-data quality"), post: singlePost("validateProductData", "Score product-data quality") },
      "/api/v1/compare": {
        get: { operationId: "compareProductOffersByUrls", summary: "Compare 2 to 5 product pages", parameters: [{ name: "url", in: "query", required: true, schema: { type: "array", minItems: 2, maxItems: 5, items: url }, style: "form", explode: true }], responses },
        post: { operationId: "compareProductOffers", summary: "Compare 2 to 5 product pages", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["urls"], properties: { urls: { type: "array", minItems: 2, maxItems: 5, items: url } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/clarify": {
        get: { ...textGet("clarifyHumanTaskByText", "Turn a messy human request into an execution-ready task", "text"), responses: clarifyResponses },
        post: { ...textPost("clarifyHumanTask", "Turn a messy human request into an execution-ready task", "text"), responses: clarifyResponses },
      },
      "/api/v1/task-gate/sample": {
        get: {
          operationId: "getFreeTaskGateSample",
          summary: "Get a free fixed Task Gate preflight example",
          description: "Returns a deterministic Task Gate response so agents can inspect the output schema before paying.",
          responses: {
            "200": {
              description: "Free fixed sample; no payment required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FreeTaskGateSample" },
                  example: {
                    free_sample: true,
                    decision: "PROCEED",
                    goal: "Summarize these notes into five bullets",
                    missing_fields: [],
                    risks: [],
                    hard_constraints: [],
                    safe_to_execute: true,
                    next_action: "summarize notes",
                    next: {
                      method: "POST",
                      path: "/api/v1/task-gate",
                      payment: "x402",
                      price: "$0.004"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/task-gate": {
        get: { operationId: "taskGateByTask", summary: "Gate an agent action: PROCEED, CLARIFY, ASK_HUMAN or STOP", parameters: [
          { name: "task", in: "query", required: true, schema: { type: "string", maxLength: 10000 } },
          { name: "known_context", in: "query", required: false, schema: { type: "string", maxLength: 15000 } },
          { name: "proposed_action", in: "query", required: false, schema: { type: "string", maxLength: 4000 } }
        ], responses: taskGateResponses },
        post: { operationId: "taskGate", summary: "Gate an agent action: PROCEED, CLARIFY, ASK_HUMAN or STOP", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["task"], properties: {
          task: { type: "string", maxLength: 10000 },
          known_context: { type: "string", maxLength: 15000 },
          proposed_action: { type: "string", maxLength: 4000 }
        }, additionalProperties: false } } } }, responses: taskGateResponses },
      },
      "/api/v1/context-freshness": {
        get: { operationId: "contextFreshnessFromJson", summary: "Find stale context and create a minimal refresh plan", description: "Avoid re-fetching an agent's entire context. Classifies timestamped context items as fresh, near expiry or stale and returns only the items that need refresh.", parameters: [
          { name: "items", in: "query", required: true, schema: { type: "string", maxLength: 40000, description: "JSON array of items with id, captured_at and ttl_seconds" } },
          { name: "now", in: "query", required: false, schema: { type: "string", format: "date-time" } },
          { name: "refresh_ahead_seconds", in: "query", required: false, schema: { type: "integer", minimum: 0, maximum: 86400, default: 120 } }
        ], responses },
        post: { operationId: "contextFreshness", summary: "Find stale context and create a minimal refresh plan", description: "Avoid re-fetching an agent's entire context. Classifies timestamped context items as fresh, near expiry or stale and returns only the items that need refresh.", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["items"], properties: {
          items: { type: "array", minItems: 1, maxItems: 100, items: { type: "object", required: ["id","captured_at","ttl_seconds"], properties: { id: { type: "string", minLength: 1, maxLength: 200 }, captured_at: { type: "string", format: "date-time" }, ttl_seconds: { type: "integer", minimum: 1, maximum: 31536000 }, required: { type: "boolean", default: false } }, additionalProperties: false } },
          now: { type: "string", format: "date-time" },
          refresh_ahead_seconds: { type: "integer", minimum: 0, maximum: 86400, default: 120 }
        }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/call-value-gate": {
        get: { operationId: "callValueGateFromJson", summary: "Decide whether the next agent call is worth its cost", description: "Compare expected net value, success probability, latency cost, alternatives and remaining budget before an agent makes a model, tool or human call.", parameters: [{ name: "input", in: "query", required: true, schema: { type: "string", maxLength: 40000, description: "JSON object with the proposed call, budget and alternatives" } }], responses: callValueResponses },
        post: { operationId: "callValueGate", summary: "Decide whether the next agent call is worth its cost", description: "Compare expected net value, success probability, latency cost, alternatives and remaining budget before an agent makes a model, tool or human call.", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["cost_usd","success_probability","value_if_success_usd","remaining_budget_usd"], properties: {
          id: { type: "string", maxLength: 200 }, cost_usd: { type: "number", minimum: 0 }, latency_ms: { type: "number", minimum: 0 }, success_probability: { type: "number", minimum: 0, maximum: 1 }, value_if_success_usd: { type: "number", minimum: 0 }, loss_if_failure_usd: { type: "number", minimum: 0 }, remaining_budget_usd: { type: "number", minimum: 0 }, latency_cost_per_second_usd: { type: "number", minimum: 0 }, min_expected_net_value_usd: { type: "number", minimum: 0 }, required: { type: "boolean", default: false }, alternatives: { type: "array", maxItems: 20, items: { type: "object", required: ["id","cost_usd","success_probability","value_if_success_usd"], properties: { id: { type: "string", maxLength: 200 }, cost_usd: { type: "number", minimum: 0 }, latency_ms: { type: "number", minimum: 0 }, success_probability: { type: "number", minimum: 0, maximum: 1 }, value_if_success_usd: { type: "number", minimum: 0 }, loss_if_failure_usd: { type: "number", minimum: 0 } }, additionalProperties: false } }
        }, additionalProperties: false } } } }, responses: callValueResponses },
      },
      "/api/v1/call-value-gate/sample": {
        get: {
          operationId: "getFreeCallValueGateSample",
          summary: "Get a free fixed call-value decision",
          description: "Returns a deterministic EXECUTE example so agents can inspect the output schema before paying.",
          responses: {
            "200": {
              description: "Free fixed sample; no payment required.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/FreeCallValueGateSample" } } },
            },
          },
        },
      },
      "/api/v1/extract-constraints": {
        get: { ...textGet("extractTaskConstraintsByText", "Extract hard constraints, preferences, exclusions, budgets and deadlines", "text"), responses: constraintResponses },
        post: { ...textPost("extractTaskConstraints", "Extract hard constraints, preferences, exclusions, budgets and deadlines", "text"), responses: constraintResponses },
      },
      "/api/v1/compress-context": {
        get: { operationId: "compressAgentContextByText", summary: "Compress context into operational state", parameters: [{ name: "context", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }, { name: "max_items", in: "query", required: false, schema: { type: "integer", minimum: 3, maximum: 30, default: 12 } }], responses: compressionResponses },
        post: { ...textPost("compressAgentContext", "Compress context into operational state", "context", 20000, { properties: { max_items: { type: "integer", minimum: 3, maximum: 30, default: 12 } } }), responses: compressionResponses },
      },
      "/api/v1/should-ask-human": {
        get: { operationId: "shouldAskHumanByTask", summary: "Decide whether to ask the human or safely infer and continue", parameters: [{ name: "task", in: "query", required: true, schema: { type: "string", maxLength: 10000 } }, { name: "known_context", in: "query", required: false, schema: { type: "string", maxLength: 15000 } }, { name: "proposed_assumption", in: "query", required: false, schema: { type: "string", maxLength: 4000 } }], responses },
        post: { operationId: "shouldAskHuman", summary: "Decide whether to ask the human or safely infer and continue", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["task"], properties: { task: { type: "string", maxLength: 10000 }, known_context: { type: "string", maxLength: 15000 }, proposed_assumption: { type: "string", maxLength: 4000 } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/dedupe-facts": {
        get: { ...textGet("dedupeFactsByText", "Deduplicate facts and near-duplicate notes", "text"), responses: dedupeResponses },
        post: { ...textPost("dedupeFacts", "Deduplicate facts and near-duplicate notes", "text"), responses: dedupeResponses },
      },
      "/api/v1/detect-conflicts": { get: textGet("detectConflictsByText", "Detect contradictory facts and numeric mismatches", "text"), post: textPost("detectConflicts", "Detect contradictory facts and numeric mismatches", "text") },
      "/api/v1/extract-actions": { get: textGet("extractActionsByText", "Extract concrete action items from text", "text"), post: textPost("extractActions", "Extract concrete action items from text", "text") },
      "/api/v1/make-search-query": { get: textGet("makeSearchQueryByTask", "Turn a verbose task into compact search queries", "task", 8000), post: textPost("makeSearchQuery", "Turn a verbose task into compact search queries", "task", 8000) },
      "/api/v1/missing-fields": {
        get: { operationId: "missingFieldsFromJson", summary: "Check required fields in a JSON object", parameters: [{ name: "input", in: "query", required: true, schema: { type: "string", maxLength: 12000 } }, { name: "required_fields", in: "query", required: true, schema: { type: "string", maxLength: 2000 } }], responses },
        post: { operationId: "missingFields", summary: "Check required fields in a JSON object", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["input","required_fields"], properties: { input: { type: "object", additionalProperties: true }, required_fields: { type: "array", minItems: 1, maxItems: 50, items: { type: "string" } } }, additionalProperties: false } } } }, responses },
      },


      "/api/v1/no-progress-gate/sample": {
        get: {
          operationId: "getFreeNoProgressGateSample",
          summary: "Get a free fixed no-progress trace decision",
          description: "Returns a deterministic STOP_RETRYING example for three identical calls with unchanged results. No caller data or payment is required.",
          responses: {
            "200": {
              description: "Free fixed sample; no payment required.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/FreeNoProgressGateSample" }, example: {
                free_sample: true,
                input: { history: [{ tool: "web_search", args: { query: "agent loop" }, result: { hits: 0 }, status: "success", elapsed_ms: 120, cost_usd: 0.002 }], exact_repeat_limit: 3, unchanged_result_limit: 3 },
                decision: "STOP_RETRYING",
                progress_score: 0,
                reason: "same-call-keeps-returning-the-same-result",
                next_action: "stop-repeating-identical-call",
                calls_avoided_estimate: 10,
                trace: { event_count: 3, unique_call_count: 1, unique_result_count: 1, exact_call_repeats: 3, unchanged_result_repeats: 3, repeated_failures: 0 },
                next: { method: "POST", path: "/api/v1/no-progress-gate", payment: "x402", price: "$0.003" }
              } } }
            }
          }
        }
      },
      "/api/v1/no-progress-gate": {
        post: {
          operationId: "noProgressGate",
          summary: "Stop repeated tool loops when calls, results, failures, or budgets show no progress",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["history"],
            properties: {
              history: { type: "array", minItems: 2, maxItems: 100, items: { type: "object", properties: { tool: { type: "string", minLength: 1, maxLength: 200 }, name: { type: "string", minLength: 1, maxLength: 200 }, args: {}, input: {}, result: {}, output: {}, error: {}, status: { type: "string", enum: ["success", "ok", "error", "failed", "failure"] }, elapsed_ms: { type: "number", minimum: 0 }, cost_usd: { type: "number", minimum: 0 } }, additionalProperties: false } },
              exact_repeat_limit: { type: "integer", minimum: 1, maximum: 20, default: 3 },
              unchanged_result_limit: { type: "integer", minimum: 1, maximum: 20, default: 3 },
              failure_limit: { type: "integer", minimum: 1, maximum: 20, default: 3 },
              max_calls: { type: "integer", minimum: 1, maximum: 1000, default: 12 },
              max_elapsed_ms: { type: "number", exclusiveMinimum: 0, maximum: 86400000 },
              max_cost_usd: { type: "number", exclusiveMinimum: 0, maximum: 1000000 },
              allow_human_escalation: { type: "boolean", default: false }
            }, additionalProperties: false
          } } } },
          responses: noProgressResponses
        }
      },
      "/api/v1/retry-decision": {
        get: { operationId: "retryDecisionByStatus", summary: "Decide whether/how to retry an API or tool failure", parameters: [{ name: "status", in: "query", required: true, schema: { type: "integer" } }, { name: "error", in: "query", required: false, schema: { type: "string", maxLength: 4000 } }, { name: "attempt", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 20 } }], responses },
        post: { operationId: "retryDecision", summary: "Decide whether/how to retry an API or tool failure", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "integer" }, error: { type: "string", maxLength: 4000 }, attempt: { type: "integer", minimum: 1, maximum: 20 } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/prompt-injection-scan": { get: textGet("promptInjectionScanByText", "Scan untrusted text for common prompt-injection patterns", "text"), post: textPost("promptInjectionScan", "Scan untrusted text for common prompt-injection patterns", "text") },
      "/api/v1/redact-secrets": {
        get: { ...textGet("redactSecretsByText", "Redact common credentials and token patterns", "text"), responses: redactionResponses },
        post: { ...textPost("redactSecrets", "Redact common credentials and token patterns", "text"), responses: redactionResponses },
      },
      "/api/v1/handoff-diff": {
        get: { operationId: "handoffDiffByText", summary: "Report what changed between two agent states", parameters: [{ name: "before", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }, { name: "after", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }], responses: handoffDiffResponses },
        post: { operationId: "handoffDiff", summary: "Report what changed between two agent states", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["before","after"], properties: { before: { type: "string", maxLength: 20000 }, after: { type: "string", maxLength: 20000 } }, additionalProperties: false } } } }, responses: handoffDiffResponses },
      },
      "/api/v1/choose-next-step": {
        get: { operationId: "chooseNextStepByText", summary: "Rank candidate next actions against current state", parameters: [{ name: "state", in: "query", required: true, schema: { type: "string", maxLength: 12000 } }, { name: "actions", in: "query", required: true, schema: { type: "string", maxLength: 12000 } }], responses },
        post: { operationId: "chooseNextStep", summary: "Rank candidate next actions against current state", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["state","actions"], properties: { state: { type: "string", maxLength: 12000 }, actions: { type: "array", minItems: 1, maxItems: 30, items: { type: "string", maxLength: 1000 } } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/video-transcript": { get: singleGet("fetchVideoTranscriptByUrl", "Extract YouTube transcript, captions and timestamped video-to-text segments"), post: singlePost("fetchVideoTranscript", "Extract YouTube transcript, captions and timestamped video-to-text segments") },
      "/api/v1/video-brief": { get: textGet("videoBriefByTranscript", "Create compact brief from transcript", "transcript", 120000), post: textPost("videoBrief", "Create compact brief from transcript", "transcript", 120000) },
      "/api/v1/video-key-points": { get: textGet("videoKeyPointsByTranscript", "Extract key points from transcript", "transcript", 120000), post: textPost("videoKeyPoints", "Extract key points from transcript", "transcript", 120000, { properties: { limit: { type: "integer", minimum: 3, maximum: 20 } } }) },
      "/api/v1/video-answer-question": { get: { operationId:"videoAnswerQuestionGet",summary:"Answer question using transcript evidence",parameters:[{name:"transcript",in:"query",required:true,schema:{type:"string",maxLength:120000}},{name:"question",in:"query",required:true,schema:{type:"string",maxLength:4000}}],responses }, post: textPost("videoAnswerQuestion","Answer question using transcript evidence","transcript",120000,{required:["transcript","question"],properties:{question:{type:"string",maxLength:4000}}}) },
      "/api/v1/video-chapters": { get: textGet("videoChaptersGet", "Create topic chapters from transcript", "transcript", 120000), post: textPost("videoChapters", "Create topic chapters from transcript", "transcript", 120000, { properties: { target: { type: "integer", minimum: 3, maximum: 20 } } }) },
      "/api/v1/video-claims": { get: textGet("videoClaimsGet", "Extract claims to verify from transcript", "transcript", 120000), post: textPost("videoClaims", "Extract claims to verify from transcript", "transcript", 120000) },
      "/api/v1/video-action-items": { get: textGet("videoActionItemsGet", "Extract action items from transcript", "transcript", 120000), post: textPost("videoActionItems", "Extract action items from transcript", "transcript", 120000) },
      "/api/v1/video-analyze": {
        get: { operationId: "videoAnalyzeByUrl", summary: "Extract YouTube video context, transcript highlights and technical tutorial commands with timestamps", description: "Turn a public YouTube URL into agent-ready video context: transcript highlights, timestamped key points, chapters, technical commands from tutorials, action items, candidate claims, compact context pack and optional evidence Q&A. Useful for summarize YouTube, video-to-context, transcript analysis and command extraction.", parameters: [{ name: "url", in: "query", required: true, schema: url }, { name: "lang", in: "query", required: false, schema: { type: "string", maxLength: 20 } }, { name: "question", in: "query", required: false, schema: { type: "string", maxLength: 4000 } }], responses },
        post: { operationId: "videoAnalyze", summary: "Extract YouTube video context, transcript highlights and technical tutorial commands with timestamps", description: "Turn a public YouTube URL into agent-ready video context: transcript highlights, timestamped key points, chapters, technical commands from tutorials, action items, candidate claims, compact context pack and optional evidence Q&A. Useful for summarize YouTube, video-to-context, transcript analysis and command extraction.", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url"], properties: { url, lang: { type: "string", maxLength: 20 }, question: { type: "string", maxLength: 4000 }, key_point_limit: { type: "integer", minimum: 3, maximum: 20 }, chapter_target: { type: "integer", minimum: 3, maximum: 20 } }, additionalProperties: false } } } }, responses },
      },
      "/api/v1/rank-results": {
        get: { operationId: "rankSearchResultsFromJson", summary: "Rank search results; GET accepts results as a JSON-array string", parameters: [{ name: "query", in: "query", required: true, schema: { type: "string", maxLength: 4000 } }, { name: "results", in: "query", required: true, schema: { type: "string", maxLength: 20000 } }], responses },
        post: { operationId: "rankSearchResults", summary: "Rank search results and flag duplicates, stale results and spam signals", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["query", "results"], properties: { query: { type: "string", maxLength: 4000 }, results: { type: "array", minItems: 1, maxItems: 25, items: resultItem } }, additionalProperties: false } } } }, responses },
      },
    },
  };
}
