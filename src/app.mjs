import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { createPaywall } from "@x402/paywall";
import { evmPaywall } from "@x402/paywall/evm";
import { config } from "./config.mjs";
import {
  compareBrowserDiscovery,
  compareDiscovery,
  clarifyBrowserDiscovery,
  clarifyDiscovery,
  compressContextBrowserDiscovery,
  compressContextDiscovery,
  shouldAskHumanBrowserDiscovery,
  shouldAskHumanDiscovery,
  extractConstraintsBrowserDiscovery,
  extractConstraintsDiscovery,
  rankResultsBrowserDiscovery,
  rankResultsDiscovery,
  extractOfferBrowserDiscovery,
  extractOfferDiscovery,
  normalizeBrowserDiscovery,
  normalizeDiscovery,
  validateBrowserDiscovery,
  validateDiscovery,
} from "./discovery.mjs";
import { normalizeProductPage } from "./normalize.mjs";
import { InputError, safeFetchHtml } from "./safe-fetch.mjs";
import { openApiDocument } from "./openapi.mjs";
import { clarifyTask, compressContext, shouldAskHuman, extractConstraints, rankResults } from "./friction.mjs";
import {
  compareOffers,
  extractOffer,
  requireUrl,
  requireUrls,
  validateNormalized,
} from "./services.mjs";

export function createApp({ payments = process.env.NODE_ENV !== "test", fetchPage = safeFetchHtml } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  const catalog = {
    name: "Agent Product Normalizer",
    version: "0.5.1",
    status: "ready",
    payment: { network: config.network, asset: "USDC", pay_to: config.payTo },
    services: [
      { id: "normalize", methods: ["GET", "POST"], path: "/api/v1/normalize", price: config.prices.normalize },
      { id: "extract-offer", methods: ["GET", "POST"], path: "/api/v1/extract-offer", price: config.prices.extractOffer },
      { id: "validate", methods: ["GET", "POST"], path: "/api/v1/validate", price: config.prices.validate },
      { id: "compare", methods: ["GET", "POST"], path: "/api/v1/compare", price: config.prices.compare },
      { id: "clarify", methods: ["GET", "POST"], path: "/api/v1/clarify", price: config.prices.clarify },
      { id: "compress-context", methods: ["GET", "POST"], path: "/api/v1/compress-context", price: config.prices.compressContext },
      { id: "should-ask-human", methods: ["GET", "POST"], path: "/api/v1/should-ask-human", price: config.prices.shouldAskHuman },
      { id: "extract-constraints", methods: ["GET", "POST"], path: "/api/v1/extract-constraints", price: config.prices.extractConstraints },
      { id: "rank-results", methods: ["GET", "POST"], path: "/api/v1/rank-results", price: config.prices.rankResults },
    ],
    docs: "/openapi.json",
    browser_tests: {
      normalize: "/test-payment",
      extract_offer: "/test-extract-offer",
      validate: "/test-validate",
      compare: "/test-compare",
      clarify: "/test-clarify",
      compress_context: "/test-compress-context",
      should_ask_human: "/test-should-ask-human",
      extract_constraints: "/test-extract-constraints",
      rank_results: "/test-rank-results",
    },
  };

  app.get("/", (_req, res) => res.json(catalog));
  app.get("/catalog", (_req, res) => res.json(catalog));
  app.get("/health", (_req, res) => res.json({ ok: true, version: "0.5.1" }));
  app.get("/openapi.json", (req, res) => res.json(openApiDocument(`${req.protocol}://${req.get("host")}`)));

  app.get("/llms.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.type("text/plain").send(`# Agent Product Normalizer

Machine-first x402 commerce utilities for AI agents.

Base URL: ${baseUrl}
Payment: USDC on Base (eip155:8453)
Pay-to: ${config.payTo}

Paid services:
- GET/POST /api/v1/normalize — ${config.prices.normalize} — normalize a public product page into agent-ready commerce JSON.
- GET/POST /api/v1/extract-offer — ${config.prices.extractOffer} — extract compact price, currency, availability and seller facts.
- GET/POST /api/v1/validate — ${config.prices.validate} — score whether product data is reliable enough for an agent.
- GET/POST /api/v1/compare — ${config.prices.compare} — compare 2-5 product pages and return the cheapest offer per currency.
- GET/POST /api/v1/clarify — ${config.prices.clarify} — turn a messy human request into an execution-ready task.
- GET/POST /api/v1/compress-context — ${config.prices.compressContext} — compress long agent context into compact operational state.
- GET/POST /api/v1/should-ask-human — ${config.prices.shouldAskHuman} — decide whether to ask the human or safely infer and continue.
- GET/POST /api/v1/extract-constraints — ${config.prices.extractConstraints} — split a request into hard constraints, preferences, exclusions, budgets and deadlines.
- GET/POST /api/v1/rank-results — ${config.prices.rankResults} — rank search results and flag duplicates, stale results and spam signals.

Discovery:
- ${baseUrl}/catalog
- ${baseUrl}/openapi.json
- ${baseUrl}/.well-known/x402.json
- ${baseUrl}/.well-known/agent-card.json
- ${baseUrl}/.well-known/ai-plugin.json

Human/browser tests:
- ${baseUrl}/test-payment
- ${baseUrl}/test-extract-offer
- ${baseUrl}/test-validate
- ${baseUrl}/test-compare
- ${baseUrl}/test-clarify
- ${baseUrl}/test-compress-context
- ${baseUrl}/test-should-ask-human
- ${baseUrl}/test-extract-constraints
- ${baseUrl}/test-rank-results

This service is already listed through x402 Bazaar discovery after successful settlement.
`);
  });

  app.get("/.well-known/x402.json", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      x402Version: 2,
      name: "Agent Product Normalizer",
      description: "Paid commerce-data utilities for autonomous agents.",
      network: config.network,
      asset: "USDC",
      payTo: config.payTo,
      facilitator: config.facilitatorUrl,
      docs: `${baseUrl}/openapi.json`,
      llms: `${baseUrl}/llms.txt`,
      resources: catalog.services.map((service) => ({
        id: service.id,
        methods: service.methods,
        resource: `${baseUrl}${service.path}`,
        price: service.price,
      })),
    });
  });

  app.get("/.well-known/agent-card.json", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      name: "Agent Product Normalizer",
      description: "x402-paid friction-killing utilities for AI agents plus commerce normalization, validation and offer comparison.",
      version: "0.5.1",
      url: baseUrl,
      capabilities: [
        "task-clarification",
        "context-compression",
        "ask-human-decision",
        "constraint-extraction",
        "search-result-ranking",
        "product-page-normalization",
        "offer-extraction",
        "product-data-validation",
        "offer-comparison",
        "x402-payments",
      ],
      payment: {
        protocol: "x402",
        network: config.network,
        asset: "USDC",
        payTo: config.payTo,
      },
      discovery: {
        catalog: `${baseUrl}/catalog`,
        openapi: `${baseUrl}/openapi.json`,
        x402: `${baseUrl}/.well-known/x402.json`,
        llms: `${baseUrl}/llms.txt`,
      },
      active: true,
    });
  });

  app.get("/.well-known/ai-plugin.json", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      schema_version: "v1",
      name_for_human: "Agent Product Normalizer",
      name_for_model: "agent_product_normalizer",
      description_for_human: "Paid micro-utilities that reduce agent friction plus commerce-data tools.",
      description_for_model: "Use this service to clarify messy human requests, compress context, decide whether to ask the human, extract constraints, rank search results, normalize product pages, extract offers, validate product data, or compare offers. Endpoints use x402 payments in USDC on Base.",
      auth: { type: "none" },
      api: {
        type: "openapi",
        url: `${baseUrl}/openapi.json`,
        is_user_authenticated: false,
      },
      logo_url: `${baseUrl}/favicon.ico`,
      contact_email: "noreply@example.com",
      legal_info_url: baseUrl,
    });
  });

  app.get("/skill.md", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.type("text/markdown").send(`# Agent Product Normalizer Skill

Use this service when you want to remove low-value agent reasoning steps or need reliable structured commerce facts.

## Choose a tool
- Clarify a messy human task: \`GET ${baseUrl}/api/v1/clarify?text=<TEXT>\`
- Compress long agent context: \`GET ${baseUrl}/api/v1/compress-context?context=<TEXT>\`
- Decide whether to ask the human: \`GET ${baseUrl}/api/v1/should-ask-human?task=<TEXT>\`
- Extract hard/soft constraints: \`GET ${baseUrl}/api/v1/extract-constraints?text=<TEXT>\`
- Rank search results: prefer \`POST ${baseUrl}/api/v1/rank-results\` with JSON results.
- Normalize one product: \`GET ${baseUrl}/api/v1/normalize?url=<URL>\`
- Extract compact offer facts: \`GET ${baseUrl}/api/v1/extract-offer?url=<URL>\`
- Validate whether a page is agent-usable: \`GET ${baseUrl}/api/v1/validate?url=<URL>\`
- Compare 2-5 offers: repeat the \`url\` query parameter on \`GET ${baseUrl}/api/v1/compare\`

All paid routes return HTTP 402 until the caller supplies a valid x402 payment.
Payment network: Base.
Asset: USDC.
`);
  });

  function demoHtml({ name, price, seller, sku }) {
    return `<!doctype html><html><head><title>${name}</title>
<link rel="canonical" href="https://agent-product-normalizer.vercel.app/demo-product">
<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description: "Stable public product fixture used to verify x402 commerce services.",
      image: "https://agent-product-normalizer.vercel.app/test-product.png",
      sku,
      brand: { "@type": "Brand", name: "AgentShelf" },
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: seller },
      },
    })}</script>
</head><body><h1>${name}</h1></body></html>`;
  }

  app.get("/demo-product", (_req, res) => res.type("html").send(
    demoHtml({ name: "Agent Test Product", price: "1.00", seller: "AgentShelf A", sku: "AGENT-TEST-001" })
  ));
  app.get("/demo-product-b", (_req, res) => res.type("html").send(
    demoHtml({ name: "Agent Test Product", price: "0.89", seller: "AgentShelf B", sku: "AGENT-TEST-001-B" })
  ));

  const absolute = (req, path) => `${req.protocol}://${req.get("host")}${path}`;

  app.get("/test-payment", (req, res) => {
    res.redirect(`/api/v1/normalize?url=${encodeURIComponent(absolute(req, "/demo-product"))}`);
  });
  app.get("/test-extract-offer", (req, res) => {
    res.redirect(`/api/v1/extract-offer?url=${encodeURIComponent(absolute(req, "/demo-product"))}`);
  });
  app.get("/test-validate", (req, res) => {
    res.redirect(`/api/v1/validate?url=${encodeURIComponent(absolute(req, "/demo-product"))}`);
  });
  app.get("/test-compare", (req, res) => {
    const a = encodeURIComponent(absolute(req, "/demo-product"));
    const b = encodeURIComponent(absolute(req, "/demo-product-b"));
    res.redirect(`/api/v1/compare?url=${a}&url=${b}`);
  });
  app.get("/test-clarify", (_req, res) => {
    res.redirect(`/api/v1/clarify?text=${encodeURIComponent("Find me a good black laptop under $1200, preferably light.")}`);
  });
  app.get("/test-compress-context", (_req, res) => {
    res.redirect(`/api/v1/compress-context?context=${encodeURIComponent("We need to ship Friday. Budget must stay under $500. Next, verify deployment. We are waiting on DNS.")}`);
  });
  app.get("/test-should-ask-human", (_req, res) => {
    res.redirect(`/api/v1/should-ask-human?task=${encodeURIComponent("Buy the cheapest one for me")}`);
  });
  app.get("/test-extract-constraints", (_req, res) => {
    res.redirect(`/api/v1/extract-constraints?text=${encodeURIComponent("Laptop must be under $1200, black if possible, no refurbished units.")}`);
  });
  app.get("/test-rank-results", (_req, res) => {
    const results = JSON.stringify([
      { title: "Solar inverter guide", url: "https://example.com/guide", snippet: "Compact solar inverter comparison" },
      { title: "Casino giveaway", url: "https://spam.example", snippet: "Best compact solar inverter coupon casino" },
    ]);
    res.redirect(`/api/v1/rank-results?query=${encodeURIComponent("best compact solar inverter")}&results=${encodeURIComponent(results)}`);
  });

  if (payments) {
    const browserPaywall = createPaywall()
      .withNetwork(evmPaywall)
      .withConfig({ appName: "Agent Product Normalizer", testnet: false })
      .build();

    const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
    const resourceServer = new x402ResourceServer(facilitator)
      .register(config.network, new ExactEvmScheme())
      .registerExtension(bazaarResourceServerExtension);

    const accepts = (price) => ({
      scheme: "exact",
      price,
      network: config.network,
      payTo: config.payTo,
      maxTimeoutSeconds: 120,
    });

    app.use(paymentMiddleware({
      "GET /api/v1/normalize": {
        accepts: accepts(config.prices.normalize),
        description: "Normalize a public product page into agent-ready commerce JSON",
        mimeType: "application/json",
        serviceName: "Agent Product Normalizer",
        tags: ["commerce", "product-data", "shopping", "price", "availability"],
        extensions: normalizeBrowserDiscovery,
      },
      "POST /api/v1/normalize": {
        accepts: accepts(config.prices.normalize),
        description: "Normalize a public product page into agent-ready commerce JSON",
        mimeType: "application/json",
        serviceName: "Agent Product Normalizer",
        tags: ["commerce", "product-data", "shopping", "price", "availability"],
        extensions: normalizeDiscovery,
      },
      "GET /api/v1/extract-offer": {
        accepts: accepts(config.prices.extractOffer),
        description: "Extract compact price, currency, availability and seller facts from a public product page",
        mimeType: "application/json",
        serviceName: "Agent Offer Extractor",
        tags: ["commerce", "price", "availability", "shopping"],
        extensions: extractOfferBrowserDiscovery,
      },
      "POST /api/v1/extract-offer": {
        accepts: accepts(config.prices.extractOffer),
        description: "Extract compact price, currency, availability and seller facts from a public product page",
        mimeType: "application/json",
        serviceName: "Agent Offer Extractor",
        tags: ["commerce", "price", "availability", "shopping"],
        extensions: extractOfferDiscovery,
      },
      "GET /api/v1/validate": {
        accepts: accepts(config.prices.validate),
        description: "Score whether a public product page contains enough reliable data for commerce agents",
        mimeType: "application/json",
        serviceName: "Agent Product Validator",
        tags: ["commerce", "validation", "quality", "product-data"],
        extensions: validateBrowserDiscovery,
      },
      "POST /api/v1/validate": {
        accepts: accepts(config.prices.validate),
        description: "Score whether a public product page contains enough reliable data for commerce agents",
        mimeType: "application/json",
        serviceName: "Agent Product Validator",
        tags: ["commerce", "validation", "quality", "product-data"],
        extensions: validateDiscovery,
      },
      "GET /api/v1/compare": {
        accepts: accepts(config.prices.compare),
        description: "Compare 2 to 5 public product pages and select the cheapest offer separately per currency",
        mimeType: "application/json",
        serviceName: "Agent Offer Comparator",
        tags: ["commerce", "comparison", "price", "shopping"],
        extensions: compareBrowserDiscovery,
      },
      "POST /api/v1/compare": {
        accepts: accepts(config.prices.compare),
        description: "Compare 2 to 5 public product pages and select the cheapest offer separately per currency",
        mimeType: "application/json",
        serviceName: "Agent Offer Comparator",
        tags: ["commerce", "comparison", "price", "shopping"],
        extensions: compareDiscovery,
      },
      "GET /api/v1/clarify": {
        accepts: accepts(config.prices.clarify),
        description: "Turn a messy human request into an execution-ready goal, constraints, ambiguity signals and one question only if needed",
        mimeType: "application/json",
        serviceName: "Agent Task Clarifier",
        tags: ["agents", "intent", "clarification", "workflow"],
        extensions: clarifyBrowserDiscovery,
      },
      "POST /api/v1/clarify": {
        accepts: accepts(config.prices.clarify),
        description: "Turn a messy human request into an execution-ready goal, constraints, ambiguity signals and one question only if needed",
        mimeType: "application/json",
        serviceName: "Agent Task Clarifier",
        tags: ["agents", "intent", "clarification", "workflow"],
        extensions: clarifyDiscovery,
      },
      "GET /api/v1/compress-context": {
        accepts: accepts(config.prices.compressContext),
        description: "Compress long notes or conversation context into compact operational state for agent handoffs",
        mimeType: "application/json",
        serviceName: "Agent Context Compressor",
        tags: ["agents", "context", "handoff", "tokens"],
        extensions: compressContextBrowserDiscovery,
      },
      "POST /api/v1/compress-context": {
        accepts: accepts(config.prices.compressContext),
        description: "Compress long notes or conversation context into compact operational state for agent handoffs",
        mimeType: "application/json",
        serviceName: "Agent Context Compressor",
        tags: ["agents", "context", "handoff", "tokens"],
        extensions: compressContextDiscovery,
      },
      "GET /api/v1/should-ask-human": {
        accepts: accepts(config.prices.shouldAskHuman),
        description: "Decide whether an agent should ask the human or safely infer and continue",
        mimeType: "application/json",
        serviceName: "Should I Ask The Human?",
        tags: ["agents", "autonomy", "clarification", "decision"],
        extensions: shouldAskHumanBrowserDiscovery,
      },
      "POST /api/v1/should-ask-human": {
        accepts: accepts(config.prices.shouldAskHuman),
        description: "Decide whether an agent should ask the human or safely infer and continue",
        mimeType: "application/json",
        serviceName: "Should I Ask The Human?",
        tags: ["agents", "autonomy", "clarification", "decision"],
        extensions: shouldAskHumanDiscovery,
      },
      "GET /api/v1/extract-constraints": {
        accepts: accepts(config.prices.extractConstraints),
        description: "Extract hard constraints, soft preferences, exclusions, budgets and deadlines from a human request",
        mimeType: "application/json",
        serviceName: "Agent Constraint Extractor",
        tags: ["agents", "constraints", "intent", "planning"],
        extensions: extractConstraintsBrowserDiscovery,
      },
      "POST /api/v1/extract-constraints": {
        accepts: accepts(config.prices.extractConstraints),
        description: "Extract hard constraints, soft preferences, exclusions, budgets and deadlines from a human request",
        mimeType: "application/json",
        serviceName: "Agent Constraint Extractor",
        tags: ["agents", "constraints", "intent", "planning"],
        extensions: extractConstraintsDiscovery,
      },
      "GET /api/v1/rank-results": {
        accepts: accepts(config.prices.rankResults),
        description: "Rank search results for a task and flag duplicate, stale and spam-like results",
        mimeType: "application/json",
        serviceName: "Agent Search Result Judge",
        tags: ["agents", "search", "ranking", "research"],
        extensions: rankResultsBrowserDiscovery,
      },
      "POST /api/v1/rank-results": {
        accepts: accepts(config.prices.rankResults),
        description: "Rank search results for a task and flag duplicate, stale and spam-like results",
        mimeType: "application/json",
        serviceName: "Agent Search Result Judge",
        tags: ["agents", "search", "ranking", "research"],
        extensions: rankResultsDiscovery,
      },
    }, resourceServer, {
      appName: "Agent Product Normalizer",
      testnet: false,
    }, browserPaywall));
  }

  const loadNormalized = async (url) => {
    const page = await fetchPage(url, {
      timeoutMs: config.fetchTimeoutMs,
      maxBytes: config.maxResponseBytes,
    });
    const result = normalizeProductPage(page);
    if (!result.product.name && !result.offer.price) {
      throw new InputError("page did not contain recognizable product data", 422, "NOT_A_PRODUCT_PAGE");
    }
    return result;
  };

  const getSingleUrl = (req) => requireUrl(req.method === "GET" ? req.query?.url : req.body?.url);

  const normalizeHandler = async (req, res, next) => {
    try {
      const url = getSingleUrl(req);
      res.set("cache-control", "no-store").json(await loadNormalized(url));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/normalize", normalizeHandler);
  app.post("/api/v1/normalize", normalizeHandler);

  const extractHandler = async (req, res, next) => {
    try {
      const url = getSingleUrl(req);
      res.set("cache-control", "no-store").json(extractOffer(await loadNormalized(url)));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/extract-offer", extractHandler);
  app.post("/api/v1/extract-offer", extractHandler);

  const validateHandler = async (req, res, next) => {
    try {
      const url = getSingleUrl(req);
      res.set("cache-control", "no-store").json(validateNormalized(await loadNormalized(url), url));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/validate", validateHandler);
  app.post("/api/v1/validate", validateHandler);

  const compareHandler = async (req, res, next) => {
    try {
      const rawUrls = req.method === "GET" ? req.query?.url : req.body?.urls;
      const urls = requireUrls(Array.isArray(rawUrls) ? rawUrls : [rawUrls].filter(Boolean), config.maxCompareUrls);
      const settled = await Promise.allSettled(urls.map(async (url) => ({
        url,
        result: await loadNormalized(url),
      })));

      const items = [];
      const failures = [];
      settled.forEach((entry, index) => {
        if (entry.status === "fulfilled") items.push(entry.value);
        else failures.push({ url: urls[index], error: entry.reason?.message || "failed" });
      });

      if (items.length < 2) {
        throw new InputError("fewer than 2 product pages could be normalized", 422, "INSUFFICIENT_COMPARABLE_OFFERS");
      }

      const out = compareOffers(items);
      if (failures.length) {
        out.warnings.push(`${failures.length} URL(s) failed and were excluded.`);
        out.failures = failures;
      }
      res.set("cache-control", "no-store").json(out);
    } catch (error) { next(error); }
  };
  app.get("/api/v1/compare", compareHandler);
  app.post("/api/v1/compare", compareHandler);

  const clarifyHandler = (req, res, next) => {
    try {
      const source = req.method === "GET" ? req.query?.text : req.body?.text;
      res.set("cache-control", "no-store").json(clarifyTask(source));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/clarify", clarifyHandler);
  app.post("/api/v1/clarify", clarifyHandler);

  const constraintsHandler = (req, res, next) => {
    try {
      const source = req.method === "GET" ? req.query?.text : req.body?.text;
      res.set("cache-control", "no-store").json(extractConstraints(source));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/extract-constraints", constraintsHandler);
  app.post("/api/v1/extract-constraints", constraintsHandler);

  const compressHandler = (req, res, next) => {
    try {
      const source = req.method === "GET" ? req.query : req.body;
      res.set("cache-control", "no-store").json(compressContext(source?.context, source?.max_items));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/compress-context", compressHandler);
  app.post("/api/v1/compress-context", compressHandler);

  const shouldAskHandler = (req, res, next) => {
    try {
      const source = req.method === "GET" ? req.query : req.body;
      res.set("cache-control", "no-store").json(shouldAskHuman({
        task: source?.task,
        knownContext: source?.known_context ?? "",
        proposedAssumption: source?.proposed_assumption ?? "",
      }));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/should-ask-human", shouldAskHandler);
  app.post("/api/v1/should-ask-human", shouldAskHandler);

  const rankHandler = (req, res, next) => {
    try {
      const source = req.method === "GET" ? req.query : req.body;
      let results = source?.results;
      if (req.method === "GET" && typeof results === "string") {
        try { results = JSON.parse(results); } catch { throw new InputError("results must be a valid JSON array"); }
      }
      res.set("cache-control", "no-store").json(rankResults(source?.query, results));
    } catch (error) { next(error); }
  };
  app.get("/api/v1/rank-results", rankHandler);
  app.post("/api/v1/rank-results", rankHandler);

  app.use((error, _req, res, _next) => {
    if (error instanceof InputError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof SyntaxError && error?.type === "entity.parse.failed") {
      return res.status(400).json({ error: { code: "INVALID_JSON", message: "request body must be valid JSON" } });
    }
    console.error(error);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "unexpected server error" } });
  });

  return app;
}

const app = createApp();
export default app;
