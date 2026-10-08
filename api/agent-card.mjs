import { config } from "../src/config.mjs";

const money = (price) => String(price).replace(/^\$/, "");

export default function handler(req, res) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "agent-product-normalizer.vercel.app").split(",")[0].trim();
  const baseUrl = `${proto}://${host}`;

  const paidSkills = [
    {
      id: "call-value-gate",
      name: "Agent Call Value Gate",
      description: "Decide whether the next model, tool or human call is worth its expected value, latency, failure risk and remaining budget before spending more.",
      endpoint: `${baseUrl}/api/v1/call-value-gate`,
      price: config.prices.callValueGate,
      tags: ["agents", "expected-value", "budget", "tool-call", "model-routing", "cost-control", "roi"],
      examples: ["Should this agent spend $0.02 on another search call with a $0.05 remaining budget?"]
    },
    {
      id: "context-freshness",
      name: "Agent Context Freshness Gate",
      description: "Classify context as fresh, near-expiry or stale and return the minimum refresh plan to avoid redundant fetches, calls and context tokens.",
      endpoint: `${baseUrl}/api/v1/context-freshness`,
      price: config.prices.contextFreshness,
      tags: ["agents", "context", "freshness", "ttl", "cache", "stale-context", "tool-calls"],
      examples: ["Which context items actually need refreshing before the next agent step?"]
    },
    {
      id: "task-gate",
      name: "Agent Task Gate",
      description: "Preflight an autonomous action and return PROCEED, CLARIFY, ASK_HUMAN or STOP with missing fields, risks, constraints and the next action.",
      endpoint: `${baseUrl}/api/v1/task-gate`,
      price: config.prices.taskGate,
      freeSample: `${baseUrl}/api/v1/task-gate/sample`,
      tags: ["agents", "preflight", "decision", "autonomy", "safety", "workflow"],
      examples: ["Can this autonomous action proceed safely with the information currently available?"]
    },
    {
      id: "hash",
      name: "Deterministic Text Hash",
      description: "Generate deterministic SHA-256 or SHA-512 digests for cache keys, checksums, deduplication and content fingerprints. SHA-1 and MD5 are legacy-only.",
      endpoint: `${baseUrl}/api/v1/hash`,
      price: config.prices.hash,
      freeSample: `${baseUrl}/api/v1/hash/sample`,
      tags: ["hash", "sha256", "sha512", "checksum", "cache", "deduplication", "deterministic"],
      examples: ["Create a SHA-256 fingerprint for this payload."]
    },
    {
      id: "prompt-injection-scan",
      name: "Prompt Injection Scan",
      description: "Scan untrusted retrieved text for common prompt-injection signals before an agent places it into working context.",
      endpoint: `${baseUrl}/api/v1/prompt-injection-scan`,
      price: config.prices.promptInjectionScan,
      tags: ["agents", "security", "prompt-injection", "retrieval", "safety"],
      examples: ["Check this retrieved page text for prompt-injection indicators."]
    },
    {
      id: "redact-secrets",
      name: "Secret Redactor",
      description: "Redact common credentials and secret-like strings before agent handoff, storage or logging.",
      endpoint: `${baseUrl}/api/v1/redact-secrets`,
      price: config.prices.redactSecrets,
      tags: ["agents", "security", "redaction", "secrets", "logging"],
      examples: ["Remove credential-like values from these logs before handing them to another agent."]
    },
    {
      id: "compress-context",
      name: "Agent Context Compressor",
      description: "Compress long operational notes into compact state for downstream agents and handoffs.",
      endpoint: `${baseUrl}/api/v1/compress-context`,
      price: config.prices.compressContext,
      tags: ["agents", "context", "compression", "handoff", "tokens"],
      examples: ["Compress these project notes into only the state needed for the next agent."]
    },
    {
      id: "dedupe-facts",
      name: "Agent Fact Deduplicator",
      description: "Remove duplicate and near-duplicate facts before downstream model or agent consumption.",
      endpoint: `${baseUrl}/api/v1/dedupe-facts`,
      price: config.prices.dedupeFacts,
      tags: ["agents", "dedupe", "facts", "context", "tokens"],
      examples: ["Deduplicate these collected facts before synthesis."]
    },
    {
      id: "retry-decision",
      name: "Agent Retry Decision",
      description: "Make a deterministic retry decision from status, error and attempt count so agents avoid wasteful retry loops.",
      endpoint: `${baseUrl}/api/v1/retry-decision`,
      price: config.prices.retryDecision,
      tags: ["agents", "retry", "failure", "loop-breaker", "cost-control"],
      examples: ["Should the agent retry this 429 response on attempt 2?"]
    },
    {
      id: "no-progress-gate",
      name: "Agent No-Progress Gate",
      description: "Fingerprint a rolling tool trace and return CONTINUE, REFRAME, STOP_RETRYING or ASK_HUMAN when repeated calls, unchanged results, failures or budgets show no progress.",
      endpoint: `${baseUrl}/api/v1/no-progress-gate`,
      price: config.prices.noProgressGate,
      freeSample: `${baseUrl}/api/v1/no-progress-gate/sample`,
      tags: ["agents", "loop-breaker", "tool-calls", "progress", "budget", "cost-control", "deterministic"],
      examples: ["Should the agent make another tool call after three identical calls returned the same result?"]
    },
    {
      id: "missing-fields",
      name: "Required Field Check",
      description: "Check whether a tool-call payload contains the required fields before spending a remote call.",
      endpoint: `${baseUrl}/api/v1/missing-fields`,
      price: config.prices.missingFields,
      tags: ["agents", "tool-call", "validation", "preflight", "schema"],
      examples: ["Check this payload for missing required tool parameters before execution."]
    }
  ].map((skill) => ({
    ...skill,
    url: skill.endpoint,
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    pricing: {
      amount: money(skill.price),
      currency: "USDC",
      network: config.network,
      scheme: "exact"
    }
  }));

  res.setHeader("cache-control", "public, max-age=300");
  res.status(200).json({
    name: "Agent Product Normalizer",
    description: "Low-cost deterministic x402 utilities that reduce agent tool calls, context waste, retries, unsafe actions and unnecessary model spend.",
    version: "0.9.1",
    protocolVersion: "1.0",
    url: baseUrl,
    provider: {
      organization: "Agent Product Normalizer",
      url: baseUrl
    },
    documentationUrl: `${baseUrl}/skill.md`,
    supportedProtocols: ["x402", "http"],
    supportedInterfaces: [
      {
        url: `${baseUrl}/catalog`,
        protocolBinding: "HTTP+JSON",
        protocolVersion: "1.0"
      }
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: true,
      x402: true
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    securitySchemes: {
      x402: {
        type: "x402",
        description: "HTTP 402 payment challenge. Pay exact USDC on Base and retry the identical request with the PAYMENT-SIGNATURE header. No signup or API key."
      }
    },
    securityRequirements: [{ x402: [] }],
    discovery: {
      catalog: `${baseUrl}/catalog`,
      x402: `${baseUrl}/.well-known/x402`,
      openapi: `${baseUrl}/openapi.json`,
      llms: `${baseUrl}/llms.txt`
    },
    payment: {
      protocol: "x402",
      version: 2,
      scheme: "exact",
      network: config.network,
      asset: "USDC",
      payTo: config.payTo,
      facilitator: config.facilitatorUrl,
      requestHeader: "PAYMENT-SIGNATURE",
      challengeHeader: "PAYMENT-REQUIRED",
      responseHeader: "PAYMENT-RESPONSE",
      flow: [
        "request resource",
        "receive HTTP 402 with PAYMENT-REQUIRED",
        "authorize the exact requirement",
        "retry identical request with PAYMENT-SIGNATURE",
        "server verifies and settles through facilitator",
        "receive result and PAYMENT-RESPONSE"
      ],
      resources: paidSkills.map(({ id, name, endpoint, price, pricing, freeSample }) => ({
        id,
        name,
        endpoint,
        price,
        pricing,
        ...(freeSample ? { freeSample } : {})
      }))
    },
    skills: paidSkills,
    note: "This is an x402 HTTP API, not a conversational JSON-RPC agent. Paid routes return HTTP 402 first; x402 payment is the authentication and settlement mechanism."
  });
}
