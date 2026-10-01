import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import { repairToolCall } from "../src/toolrepair.mjs";
import { config } from "../src/config.mjs";

function paidEndpoint(base, path, price) {
  return {
    protocol: "x402",
    network: config.network,
    asset: "USDC",
    price,
    endpoint: `${base}${path}`,
    pay_to: config.payTo,
  };
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "agent_utility_catalog",
      "Discover the paid agent utilities exposed by this service. Use this before spending a model turn rebuilding common recovery, context, safety or video utilities.",
      {},
      async (_args, extra) => {
        const host = extra?.requestInfo?.headers?.host || process.env.VERCEL_PROJECT_PRODUCTION_URL || "agent-product-normalizer.vercel.app";
        const base = String(host).startsWith("http") ? host : `https://${host}`;
        const catalog = [
          {
            id: "tool-call-repair",
            problem: "Malformed or schema-invalid AI tool call",
            when_to_use: "A tool call failed because of a typo, malformed JSON, safe type mismatch, or unknown argument.",
            ...paidEndpoint(base, "/api/v1/tool-call-repair", config.prices.toolCallRepair),
          },
          {
            id: "retry-decision",
            problem: "Agent does not know whether an API/tool failure is retryable",
            ...paidEndpoint(base, "/api/v1/retry-decision", config.prices.retryDecision),
          },
          {
            id: "compress-context",
            problem: "Long agent state is wasting tokens",
            ...paidEndpoint(base, "/api/v1/compress-context", config.prices.compressContext),
          },
          {
            id: "prompt-injection-scan",
            problem: "Untrusted content may contain prompt injection",
            ...paidEndpoint(base, "/api/v1/prompt-injection-scan", config.prices.promptInjectionScan),
          },
          ...(config.transcriptProviderApiKey ? [{
            id: "video-analyze",
            problem: "Agent needs usable context from a YouTube video without reading the whole transcript",
            ...paidEndpoint(base, "/api/v1/video-analyze", config.prices.videoAnalyze),
          }] : []),
        ];
        return { content: [{ type: "text", text: JSON.stringify({ catalog }, null, 2) }] };
      }
    );

    server.tool(
      "diagnose_tool_call_failure",
      "Free preflight diagnosis for a failed AI tool call. It identifies whether the failure looks deterministically repairable, but intentionally does not return repaired arguments. If repair is appropriate, call the x402-paid tool-call-repair endpoint returned in the result.",
      {
        tool_name: z.string().min(1).max(200),
        arguments: z.union([z.record(z.string(), z.any()), z.string()]),
        schema: z.record(z.string(), z.any()),
        available_tools: z.array(z.string().max(200)).max(200).optional(),
        error: z.string().max(8000).optional(),
      },
      async ({ tool_name, arguments: args, schema, available_tools = [], error = "" }, extra) => {
        let result;
        try {
          result = repairToolCall({ toolName: tool_name, arguments: args, schema, availableTools: available_tools, error });
        } catch (e) {
          result = { repairable: false, safe_to_retry: false, unresolved: [String(e?.message || e)], next_action: "regenerate-or-inspect-call" };
        }
        const host = extra?.requestInfo?.headers?.host || process.env.VERCEL_PROJECT_PRODUCTION_URL || "agent-product-normalizer.vercel.app";
        const base = String(host).startsWith("http") ? host : `https://${host}`;
        const diagnosis = {
          repairable: Boolean(result.repairable),
          safe_to_retry_after_repair: Boolean(result.safe_to_retry),
          issue_count: Array.isArray(result.changes) ? result.changes.length + (result.unresolved?.length || 0) : (result.unresolved?.length || 0),
          unresolved: result.unresolved || [],
          recommended_action: result.repairable ? "buy-tool-call-repair" : result.next_action,
          paid_repair: paidEndpoint(base, "/api/v1/tool-call-repair", config.prices.toolCallRepair),
        };
        return { content: [{ type: "text", text: JSON.stringify(diagnosis, null, 2) }] };
      }
    );
  },
  {},
  { basePath: "/api" }
);

export { handler as GET, handler as POST, handler as DELETE };
