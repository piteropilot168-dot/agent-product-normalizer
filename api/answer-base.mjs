const packs = [
  {
    id: "ai-world-state",
    title: "AI World State",
    question_patterns: [
      "What materially changed in AI this week?",
      "Which model/API changes should an agent care about now?",
      "What changed since my last AI ecosystem snapshot?"
    ],
    answer_url: "/.well-known/ai-world-state.json",
    delta_url: "/.well-known/ai-world-delta.json",
    freshness: { mode: "snapshot_plus_delta", max_age_hours: 24 },
    evidence_policy: "Primary release notes first; reputable secondary reporting only when cross-ecosystem synthesis needs it.",
    estimated_baseline: { searches: "5-12", source_fetches: "5-15", synthesis_prompts: "1-4" },
    estimated_optimized: { searches: 0, source_fetches: "0-2 when stale", synthesis_prompts: "0-1" },
    expected_savings: "Avoids repeated cross-vendor release-note search and resynthesis when the cached state is fresh.",
    when_not_to_use: "Do not use as sole evidence for a high-stakes or time-sensitive decision after freshness expires; refresh cited sources first.",
    status: "live"
  },
  {
    id: "ai-api-deprecation-watch",
    title: "AI API Deprecation Watch",
    question_patterns: [
      "Which AI model IDs or APIs are about to break?",
      "What migrations should I do before a provider shutdown?",
      "Which AI endpoints changed or were deprecated?"
    ],
    answer_url: "/.well-known/ai-world-state.json",
    delta_url: "/.well-known/ai-world-delta.json",
    freshness: { mode: "filtered_delta", max_age_hours: 24 },
    evidence_policy: "Provider changelogs and official migration/deprecation notices only for breaking-change claims.",
    estimated_baseline: { searches: "3-8", source_fetches: "3-10", synthesis_prompts: "1-3" },
    estimated_optimized: { searches: 0, source_fetches: "0-1 when stale", synthesis_prompts: 0 },
    expected_savings: "Turns a multi-provider changelog scan into one filtered patch operation.",
    when_not_to_use: "Do not infer compatibility from absence of a change notice; verify the target SDK/provider before production migration.",
    status: "seed"
  },
  {
    id: "model-routing-change-pack",
    title: "Model Routing Change Pack",
    question_patterns: [
      "Did the cheapest sensible model for this workload change?",
      "Should I reroute high-volume agent tasks to a newer model?",
      "What model changes affect cost or latency routing?"
    ],
    answer_url: "/.well-known/ai-world-state.json",
    delta_url: "/.well-known/ai-world-delta.json",
    freshness: { mode: "filtered_delta", max_age_hours: 24 },
    evidence_policy: "Provider pricing/performance notices plus clearly labeled external benchmark evidence when needed.",
    estimated_baseline: { searches: "4-10", source_fetches: "4-12", synthesis_prompts: "2-5" },
    estimated_optimized: { searches: 0, source_fetches: "0-2 when stale", synthesis_prompts: "0-1" },
    expected_savings: "Avoids repeated provider-by-provider model routing research when only a small set of variables changed.",
    when_not_to_use: "Do not treat general benchmark changes as proof for a specific workload without workload-specific validation.",
    status: "seed"
  },
  {
    id: "video-evidence-pack",
    title: "Video Evidence Pack",
    question_patterns: [
      "What does this long YouTube video actually say?",
      "Give me timestamped evidence without watching the whole video.",
      "Extract claims, actions and key points from this video."
    ],
    answer_url: "/api/v1/video-analyze",
    delta_url: null,
    freshness: { mode: "source_fingerprint", max_age_hours: null },
    evidence_policy: "Derived from the supplied source transcript; preserve timestamps and source fingerprint.",
    estimated_baseline: { searches: "0-2", source_fetches: "1 transcript/video", synthesis_prompts: "2-8" },
    estimated_optimized: { searches: 0, source_fetches: 1, synthesis_prompts: "0-1" },
    expected_savings: "Replaces full-video review plus repeated transcript prompts with one structured evidence pack.",
    when_not_to_use: "Do not treat candidate claims as independently verified facts; verify external claims separately when needed.",
    status: "live"
  }
];

export default function handler(req, res) {
  const now = new Date().toISOString();
  res.setHeader("cache-control", "public, max-age=300");
  res.status(200).json({
    schema_version: "2026-10-14",
    product: "Agent402 Answer Base",
    generated_at: now,
    purpose: "Machine-readable registry of precomputed or compressed answer packs chosen for repeat demand and lower search/tool/context cost.",
    selection_rule: "Keep a pack only when it has repeat demand, a stable schema, a defensible freshness rule, and a plausible savings multiple versus solving the same job from scratch.",
    update_rule: "Refresh by fingerprint and delta. Do not recompute unchanged evidence. Retire packs with weak demand or poor conversion.",
    packs
  });
}
