export const aiWorldState = {
  schema_version: "2026-10-13",
  product: "Agent402 AI World State",
  generated_at: "2026-10-13T09:55:00Z",
  as_of: "2026-10-13",
  freshness: {
    mode: "snapshot_plus_delta",
    baseline: "2026-10-07",
    next_refresh_rule: "Refresh only items whose source changed, expired, or gained a materially different implication.",
    no_energy_claim: true
  },
  purpose: "Pre-computed, source-linked AI ecosystem state so an agent can avoid repeating the same searches, release-note scans and synthesis work.",
  items: [
    {
      id: "openai-gpt6-rollout",
      date: "2026-10-07",
      category: "model-release",
      entity: "OpenAI",
      fact: "GPT-6 began rolling out globally in ChatGPT with Intelligent UI; OpenAI recommends the GPT-6 family for production API use while chat-latest remains a moving snapshot.",
      why_agent_cares: "Model-selection and capability assumptions changed; cached guidance based on GPT-5.6-era ChatGPT may now be stale.",
      source: "https://openai.com/products/release-notes/"
    },
    {
      id: "openai-ultrafast-gpt61-sol",
      date: "2026-10-08",
      category: "api-performance",
      entity: "OpenAI",
      fact: "OpenAI added Ultrafast service tier support for GPT-6.1 Sol in the Responses API.",
      why_agent_cares: "Latency-sensitive routing can now consider an explicit faster service tier rather than switching models solely for speed.",
      source: "https://openai.com/products/release-notes/"
    },
    {
      id: "anthropic-haiku55",
      date: "2026-10-07",
      category: "model-release",
      entity: "Anthropic",
      fact: "Anthropic released Claude Haiku 5.5 for high-volume, cost-sensitive work and states that it costs about 75% less on average than Haiku 4.5.",
      why_agent_cares: "Cheap subagent, summarization, classification and browser workloads have a materially different cost frontier.",
      source: "https://www.anthropic.com/claude-haiku-5-5"
    },
    {
      id: "gemini-flash-migrations",
      date: "2026-10-08",
      category: "deprecation",
      entity: "Google",
      fact: "Gemini 3.7 Flash was deprecated in favor of 3.8 Flash, Gemini 3.5 Flash in favor of 3.6 Flash, and an older Deep Research preview is scheduled to shut down on 2026-10-23.",
      why_agent_cares: "Hard-coded model IDs and Deep Research agent IDs may fail or silently route differently; migration work should be prioritized before the shutdown date.",
      source: "https://ai.google.dev/gemini-api/docs/changelog"
    },
    {
      id: "benchleader-daily-change-volume",
      date: "2026-10-12",
      category: "benchmark-drift",
      entity: "BenchLeader",
      fact: "BenchLeader reported 33 new or updated benchmark results across 23 data feeds on 2026-10-12, following several days with larger change volumes.",
      why_agent_cares: "Static benchmark tables age quickly; routing decisions should use freshness checks instead of assuming last week's ranking still holds.",
      source: "https://www.benchleader.com/blog"
    },
    {
      id: "china-model-safety-disclosure-gap",
      date: "2026-10-09",
      category: "safety-governance",
      entity: "China AI model ecosystem",
      fact: "A SemiAnalysis review reported by Reuters found public model-specific safety tests for 31 of 857 Chinese AI model releases reviewed through September 2026, or 3.6%.",
      why_agent_cares: "Absence of public safety evidence should not be confused with evidence of safety; procurement and routing systems may need explicit uncertainty flags.",
      source: "https://www.reuters.com/legal/litigation/china-ai-developers-publish-safety-tests-just-36-model-releases-report-finds-2026-10-09/"
    }
  ],
  compact_state: {
    changed_domains: ["frontier-models", "low-cost-models", "api-latency", "model-deprecations", "benchmark-freshness", "safety-disclosure"],
    immediate_actions: [
      "Review model IDs and migration deadlines before hard-coded calls fail.",
      "Re-evaluate cheap-agent routing where new low-cost models changed the economics.",
      "Treat benchmark-based routing as freshness-sensitive rather than static.",
      "Keep safety-evidence confidence separate from raw capability rankings."
    ]
  },
  provenance: {
    source_count: 5,
    methodology: "Primary release notes are preferred for product changes; reputable secondary reporting is used for cross-ecosystem analysis. Facts are paraphrased and linked to sources.",
    caveat: "This is a compact operational state, not an exhaustive news feed. Time-sensitive decisions should refresh the cited source before execution."
  }
};

export const aiWorldDelta = {
  schema_version: "2026-10-13",
  product: "Agent402 AI World Delta",
  from: "2026-10-07",
  to: "2026-10-13",
  update_strategy: "Transmit only changed fact objects plus action-impact changes; unchanged baseline state is omitted.",
  changed_ids: aiWorldState.items.map((item) => item.id),
  added: aiWorldState.items,
  modified: [],
  removed: [],
  unchanged_payload_omitted: true,
  consumer_instruction: "Apply added/modified/removed by id to the previous snapshot. Refresh a source only when its TTL or material-change signal requires it.",
  savings_model: {
    direct_claims_allowed: ["fewer repeated searches", "fewer source fetches", "smaller context payload", "lower latency from avoiding redundant work"],
    energy_claim: "not estimated without a defensible runtime energy model"
  }
};
