import { InputError } from "./safe-fetch.mjs";

const MAX_TEXT = 20_000;
const MAX_RESULTS = 25;

function text(value, name = "text", max = MAX_TEXT) {
  if (typeof value !== "string" || !value.trim()) {
    throw new InputError(`${name} is required and must be a non-empty string`);
  }
  if (value.length > max) throw new InputError(`${name} must be at most ${max} characters`);
  return value.trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(v => String(v).trim()).filter(Boolean))];
}

function sentences(value) {
  return value
    .replace(/\r/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

const MONEY = /(?:[$€£]|\b(?:USD|EUR|GBP|PLN|USDC)\b)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:[$€£]|\b(?:USD|EUR|GBP|PLN|USDC)\b)/gi;
const DEADLINE = /\b(?:today|tomorrow|tonight|this (?:morning|afternoon|evening|week|month)|next (?:week|month)|by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|do\s+\d{1,2}[.:]\d{2}|dzisiaj|dziś|jutro|wieczorem|rano|w tym tygodniu|do\s+(?:poniedziałku|wtorku|środy|czwartku|piątku|soboty|niedzieli))\b/gi;
const MUST_WORDS = /\b(must|need(?:s)? to|have to|required|only|exactly|maximum|minimum|no more than|at least|koniecznie|musi|muszą|tylko|maksymalnie|minimum|co najmniej|nie więcej niż|bez)\b/i;
const SOFT_WORDS = /\b(prefer|preferably|ideally|nice to have|would like|if possible|raczej|najlepiej|chętnie|mile widziane|jeśli się da|może być)\b/i;
const QUESTION_WORDS = /\b(which|what|when|where|who|how much|how many|czy|który|która|które|jaki|jaka|jakie|kiedy|gdzie|ile)\b/i;

function inferGoal(raw) {
  const first = sentences(raw)[0] || raw;
  return first.replace(/^(please|pls|proszę|hej|hi|hello)[,:\s-]*/i, "").slice(0, 300);
}

function classifySentence(s) {
  if (MUST_WORDS.test(s)) return "hard";
  if (SOFT_WORDS.test(s)) return "soft";
  return null;
}

function extractNumbers(raw) {
  const clean = (v) => String(v).replace(/[,.!?;:]+$/g, "").trim();
  const money = unique((raw.match(MONEY) || []).map(clean));
  const deadlines = unique((raw.match(DEADLINE) || []).map(clean));
  return { money, deadlines };
}

export function clarifyTask(rawInput) {
  const input = text(rawInput, "text");
  const parts = sentences(input);
  const hard = [];
  const soft = [];
  const facts = [];
  for (const s of parts) {
    const kind = classifySentence(s);
    if (kind === "hard") hard.push(s);
    else if (kind === "soft") soft.push(s);
    else facts.push(s);
  }
  const { money, deadlines } = extractNumbers(input);
  const ambiguitySignals = [];
  if (/\b(something|anything|somehow|whatever|coś|jakieś|jakoś|cokolwiek)\b/i.test(input)) ambiguitySignals.push("vague-object");
  if (/\b(cheap|fast|good|best|nice|better|tani|szybki|dobry|najlepszy|ładny|lepszy)\b/i.test(input)) ambiguitySignals.push("subjective-criterion");
  if (!money.length && /\b(buy|purchase|price|budget|kupić|kup|cena|budżet)\b/i.test(input)) ambiguitySignals.push("missing-budget");
  if (!deadlines.length && /\b(urgent|quickly|asap|pilne|szybko|jak najszybciej)\b/i.test(input)) ambiguitySignals.push("missing-deadline");

  const mustAsk = ambiguitySignals.includes("missing-budget") || ambiguitySignals.includes("missing-deadline");
  let question = null;
  if (ambiguitySignals.includes("missing-budget")) question = "What is the maximum budget?";
  else if (ambiguitySignals.includes("missing-deadline")) question = "What is the latest acceptable deadline?";

  return {
    goal: inferGoal(input),
    hard_constraints: unique([...hard, ...money.map(v => `budget_or_price: ${v}`), ...deadlines.map(v => `time: ${v}`)]),
    soft_preferences: unique(soft),
    context_facts: unique(facts).slice(0, 12),
    ambiguity_signals: unique(ambiguitySignals),
    must_ask_user: mustAsk,
    question_if_needed: question,
    execution_hint: mustAsk ? "ask-one-question-then-act" : "proceed-with-best-effort",
  };
}

export function extractConstraints(rawInput) {
  const input = text(rawInput, "text");
  const parts = sentences(input);
  const hard = [];
  const soft = [];
  const exclusions = [];
  for (const s of parts) {
    if (/\b(no |not |without |exclude|avoid|bez |nie |wyklucz|unikaj)\b/i.test(s)) exclusions.push(s);
    const kind = classifySentence(s);
    if (kind === "hard") hard.push(s);
    if (kind === "soft") soft.push(s);
  }
  const { money, deadlines } = extractNumbers(input);
  return {
    hard_constraints: unique(hard),
    soft_preferences: unique(soft),
    exclusions: unique(exclusions),
    budgets_or_prices: money,
    deadlines,
    detected_count: unique([...hard, ...soft, ...exclusions, ...money, ...deadlines]).length,
  };
}

export function shouldAskHuman({ task, knownContext = "", proposedAssumption = "" }) {
  const t = text(task, "task", 10_000);
  const context = typeof knownContext === "string" ? knownContext.slice(0, 15_000) : "";
  const assumption = typeof proposedAssumption === "string" ? proposedAssumption.slice(0, 4_000) : "";
  const combined = `${t}\n${context}\n${assumption}`;
  const reasons = [];
  let risk = 0;

  if (/\b(send|submit|publish|post|buy|purchase|pay|transfer|delete|cancel|book|reserve|sign|accept|wysłać|wyślij|opublikuj|kup|zapłać|przelej|usuń|anuluj|zarezerwuj|podpisz|zaakceptuj)\b/i.test(t)) {
    reasons.push("external-or-irreversible-action"); risk += 3;
  }
  if (/\b(password|seed phrase|private key|ssn|pesel|credit card|hasło|klucz prywatny|fraza seed|karta kredytowa)\b/i.test(combined)) {
    reasons.push("sensitive-data"); risk += 4;
  }
  if (/\b(legal|medical|diagnos|prescription|lawsuit|court|tax|prawny|medycz|diagnoz|recept|sąd|podatek)\b/i.test(t)) {
    reasons.push("high-stakes-domain"); risk += 2;
  }
  if (/\b(exact|exactly|must|only|koniecznie|dokładnie|tylko)\b/i.test(t) && !assumption) {
    reasons.push("strict-constraint-without-explicit-assumption"); risk += 1;
  }
  if (/\b(something|somewhere|somehow|whatever|coś|gdzieś|jakoś|cokolwiek)\b/i.test(t)) {
    reasons.push("material-ambiguity"); risk += 1;
  }
  if (QUESTION_WORDS.test(t) && /\b(or|albo|lub)\b/i.test(t) && !context) {
    reasons.push("unresolved-choice"); risk += 1;
  }

  const ask = risk >= 3;
  const question = ask
    ? (reasons.includes("external-or-irreversible-action")
      ? "Confirm the exact action and target before execution."
      : "Provide the missing high-impact detail before proceeding.")
    : null;

  return {
    ask_user: ask,
    safe_to_infer: !ask,
    risk: risk >= 5 ? "high" : risk >= 3 ? "medium" : "low",
    reasons: unique(reasons),
    question_if_needed: question,
    recommended_mode: ask ? "clarify-before-action" : "proceed-best-effort",
  };
}

function scoreSentence(s) {
  let score = 1;
  if (/\b(decided|agreed|confirmed|must|deadline|price|budget|next|todo|action|owner|status|blocked|decision|ustalono|potwierdz|musi|termin|cena|budżet|następ|zadanie|status|blokad)\b/i.test(s)) score += 3;
  if (/\d/.test(s)) score += 1;
  if (s.length > 240) score -= 1;
  return score;
}

export function compressContext(rawInput, maxItems = 12) {
  const input = text(rawInput, "context");
  const limit = Number.isFinite(Number(maxItems)) ? Math.max(3, Math.min(30, Number(maxItems))) : 12;
  const ranked = sentences(input)
    .map((s, i) => ({ s, i, score: scoreSentence(s) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .sort((a, b) => a.i - b.i)
    .map(x => x.s);

  const decisions = ranked.filter(s => /\b(decided|agreed|confirmed|ustalono|uzgodniono|potwierdzono)\b/i.test(s));
  const nextActions = ranked.filter(s => /\b(next|todo|action|need to|will|should|następ|trzeba|należy|zrobić|wykonać)\b/i.test(s));
  const constraints = ranked.filter(s => MUST_WORDS.test(s));
  const blockers = ranked.filter(s => /\b(blocked|waiting|depends|cannot|can't|problem|issue|zablok|czeka|zależy|nie może|problem)\b/i.test(s));

  return {
    objective: inferGoal(input),
    compact_state: ranked,
    decisions: unique(decisions),
    constraints: unique(constraints),
    blockers: unique(blockers),
    next_actions: unique(nextActions),
    stats: {
      input_chars: input.length,
      output_chars: ranked.join(" ").length,
      items: ranked.length,
    },
  };
}

function tokenize(s) {
  return new Set(String(s || "").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []);
}

function overlapScore(queryTokens, value) {
  const tokens = tokenize(value);
  if (!queryTokens.size || !tokens.size) return 0;
  let hit = 0;
  for (const token of queryTokens) if (tokens.has(token)) hit += 1;
  return hit / queryTokens.size;
}

export function rankResults(queryRaw, resultsRaw) {
  const query = text(queryRaw, "query", 4_000);
  if (!Array.isArray(resultsRaw) || resultsRaw.length < 1 || resultsRaw.length > MAX_RESULTS) {
    throw new InputError(`results must contain between 1 and ${MAX_RESULTS} items`);
  }
  const q = tokenize(query);
  const seenUrls = new Set();
  const ranked = resultsRaw.map((r, index) => {
    if (!r || typeof r !== "object") throw new InputError("each result must be an object");
    const title = typeof r.title === "string" ? r.title.slice(0, 500) : "";
    const snippet = typeof r.snippet === "string" ? r.snippet.slice(0, 4_000) : "";
    const url = typeof r.url === "string" ? r.url.slice(0, 2048) : "";
    const duplicate = Boolean(url && seenUrls.has(url));
    if (url) seenUrls.add(url);
    let score = (overlapScore(q, title) * 0.65) + (overlapScore(q, snippet) * 0.30) + (overlapScore(q, url) * 0.05);
    const stale = /\b(201[0-9]|202[0-3])\b/.test(`${title} ${snippet}`);
    const spam = /\b(coupon|casino|betting|download now|miracle|giveaway|kupon|kasyno|zakłady)\b/i.test(`${title} ${snippet}`);
    if (duplicate) score -= 0.35;
    if (stale) score -= 0.08;
    if (spam) score -= 0.35;
    return {
      index,
      title: title || null,
      url: url || null,
      relevance: Math.max(0, Math.min(1, Number(score.toFixed(3)))),
      duplicate,
      stale_signal: stale,
      spam_signal: spam,
    };
  }).sort((a, b) => b.relevance - a.relevance || a.index - b.index);

  return {
    query,
    count: ranked.length,
    ranked,
    best_index: ranked[0]?.index ?? null,
    best_url: ranked[0]?.url ?? null,
  };
}

export function requireFrictionPayload(req, keys) {
  const src = req.method === "GET" ? req.query : req.body;
  const out = {};
  for (const key of keys) out[key] = src?.[key];
  return out;
}
