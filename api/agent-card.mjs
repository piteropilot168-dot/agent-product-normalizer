import { config } from "../src/config.mjs";

const money = (price) => String(price).replace(/^\$/, "");

export default function handler(req, res) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "agent-product-normalizer.vercel.app").split(",")[0].trim();
  const baseUrl = `${proto}://${host}`;

  const paidSkills = [
    ...(config.transcriptProviderApiKey ? [
      {
        id: "video-transcript",
        name: "YouTube Transcript Fetch",
        description: "Fetch timestamped YouTube transcript text for an agent that otherwise would need a separate transcript provider, browser workflow or manual video review. Best when the downstream agent needs the source text once and will do its own reasoning.",
        endpoint: `${baseUrl}/api/v1/video-transcript`,
        price: config.prices.videoTranscript,
        tags: ["youtube", "video", "transcript", "captions", "timestamped", "external-data", "agent-context"],
        examples: ["Fetch the transcript and timestamps for this YouTube URL so I can answer questions without watching the video."]
      },
      {
        id: "video-analyze",
        name: "YouTube-to-Agent Context Pack",
        description: "Fetch a YouTube transcript once and return a compact agent-ready pack with brief, timestamped key points, chapters, candidate claims, action items and optional evidence Q&A. Use it when avoiding repeated transcript fetches and long-context processing is worth more than the call price.",
        endpoint: `${baseUrl}/api/v1/video-analyze`,
        price: config.prices.videoAnalyze,
        tags: ["youtube", "video", "transcript", "context-compression", "key-points", "chapters", "claims", "qa", "external-data"],
        examples: ["Turn this 60-minute YouTube video into the compact evidence pack my agent needs to answer one question and continue the task."]
      }
    ] : []),
    {
      id: "extract-offer",
      name: "Live Product Offer Extractor",
      description: "Fetch a public product page and return compact price, currency, availability and seller facts so an agent does not need to spend a browser/model pass interpreting the page itself.",
      endpoint: `${baseUrl}/api/v1/extract-offer`,
      price: config.prices.extractOffer,
      tags: ["commerce", "shopping", "product-data", "price", "availability", "seller", "live-web", "external-data"],
      examples: ["Extract the current price, currency, availability and seller from this product URL."]
    },
    {
      id: "normalize",
      name: "Live Product Page Normalizer",
      description: "Fetch a public product page and normalize its commerce data into stable agent-ready JSON, reducing bespoke scraping and page-specific parsing work in shopping workflows.",
      endpoint: `${baseUrl}/api/v1/normalize`,
      price: config.prices.normalize,
      tags: ["commerce", "shopping", "product-data", "normalization", "live-web", "structured-data", "external-data"],
      examples: ["Normalize this merchant product page into a stable schema for downstream comparison."]
    },
    {
      id: "call-value-gate",
      name: "Agent Call Value Gate",
      description: "Decide whether the next model, tool or human call is worth its expected value, latency, failure risk and remaining budget before spending more. Use only when this decision is cheaper than the call it can prevent.",
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
      description: "Compress long operational notes into compact state for downstream agents and handoffs. Use when the saved downstream context/model cost is larger than this network call.",
      endpoint: `${baseUrl}/api/v1/compress-context`,
      price: config.prices.compressContext,
      freeSample: `${baseUrl}/api/v1/compress-context/sample`,
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
      description: "Fingerprint a rolling tool trace and return CONTINUE, REFRAME, STOP_RETRYING or ASK_HUMAN when repeated calls, unchanged results, failures or budgets show no progress. Use when one avoided tool/model call is worth more than this gate.",
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
    },
    {
      id: "hash",
      name: "Deterministic Text Hash",
      description: "Generate deterministic SHA-256 or SHA-512 digests for cache keys, checksums, deduplication and content fingerprints. Agents with local crypto should hash locally; this paid route is mainly for runtimes without that capability or those needing one stable remote interface.",
      endpoint: `${baseUrl}/api/v1/hash`,
      price: config.prices.hash,
      freeSample: `${baseUrl}/api/v1/hash/sample`,
      tags: ["hash", "sha256", "sha512", "checksum", "cache", "deduplication", "deterministic"],
      examples: ["Create a SHA-256 fingerprint for this payload when the agent runtime has no local crypto primitive."]
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
    description: "Pay-per-call capabilities for agents, led by external-data tasks that are costly to reproduce locally: YouTube transcript/context extraction and live commerce parsing, plus low-cost workflow gates when they can avoid a more expensive call.",
    version: "0.9.8",
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
      llms: `${baseUrl}/llms.txt`,
      answerBase: `${baseUrl}/.well-known/answer-base.json`
    },
    buyerRule: "Prefer skills that provide external data or avoid a downstream call costing materially more than this skill. Do not buy a remote deterministic utility when the same operation is already cheap and available locally.",
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
