import { InputError } from "./safe-fetch.mjs";

const MAX_TEXT = 30_000;
const MAX_ITEMS = 60;

function requireText(value, name = "text", max = MAX_TEXT) {
  if (typeof value !== "string" || !value.trim()) throw new InputError(`${name} is required and must be a non-empty string`);
  if (value.length > max) throw new InputError(`${name} must be at most ${max} characters`);
  return value.trim();
}

function sentenceList(value) {
  return requireText(value).replace(/\r/g, "\n").split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean).slice(0, MAX_ITEMS);
}

function tokens(value) {
  return new Set(String(value || "").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []);
}

function jaccard(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit += 1;
  return hit / (A.size + B.size - hit);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(v => String(v).trim()).filter(Boolean))];
}

export function dedupeFacts(rawText) {
  const items = sentenceList(rawText);
  const kept = [];
  const duplicates = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    let best = -1, bestScore = 0;
    for (let k = 0; k < kept.length; k += 1) {
      const score = jaccard(item, kept[k].text);
      if (score > bestScore) { bestScore = score; best = k; }
    }
    if (bestScore >= 0.72) duplicates.push({ index: i, text: item, duplicate_of: kept[best].index, similarity: Number(bestScore.toFixed(3)) });
    else kept.push({ index: i, text: item });
  }
  return { input_count: items.length, unique_count: kept.length, unique_facts: kept.map(x => x.text), duplicates };
}

const NEG = /\b(no|not|never|without|cannot|can't|won't|nie|bez|nigdy|nie może|nie będzie)\b/i;
function numbers(s) { return (String(s).match(/\b\d+(?:[.,]\d+)?\b/g) || []).map(x => x.replace(",", ".")); }

export function detectConflicts(rawText) {
  const items = sentenceList(rawText);
  const conflicts = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const sim = jaccard(items[i], items[j]);
      if (sim < 0.32) continue;
      const negMismatch = NEG.test(items[i]) !== NEG.test(items[j]);
      const ni = numbers(items[i]), nj = numbers(items[j]);
      const numericMismatch = ni.length && nj.length && ni.join("|") !== nj.join("|");
      if (negMismatch || numericMismatch) {
        conflicts.push({ a_index: i, b_index: j, a: items[i], b: items[j], reason: negMismatch ? "negation-mismatch" : "numeric-mismatch", overlap: Number(sim.toFixed(3)) });
      }
    }
  }
  return { item_count: items.length, conflict_count: conflicts.length, conflicts, has_conflict: conflicts.length > 0 };
}

export function extractActions(rawText) {
  const items = sentenceList(rawText);
  const actionRe = /\b(next|todo|action|need to|must|should|verify|check|review|send|submit|deploy|call|contact|prepare|update|fix|create|build|research|find|book|buy|pay|następ|trzeba|należy|sprawdź|zweryfikuj|wyślij|wdroż|zadzwoń|skontaktuj|przygotuj|zaktualizuj|napraw|stwórz|znajdź|kup|zapłać)\b/i;
  const deadlineRe = /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|dziś|dzisiaj|jutro|poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela|\d{4}-\d{2}-\d{2})\b/i;
  const actions = items.filter(s => actionRe.test(s)).map((text, index) => ({ text, deadline_signal: (text.match(deadlineRe) || [null])[0], priority: /\b(urgent|asap|critical|pilne|natychmiast)\b/i.test(text) ? "high" : "normal", source_order: index }));
  return { count: actions.length, actions };
}

export function makeSearchQuery(rawTask) {
  const task = requireText(rawTask, "task", 8_000);
  const cleaned = task
    .replace(/\b(please|pls|can you|could you|would you|i need you to|help me|proszę|czy możesz|pomóż mi|chcę żebyś)\b/gi, " ")
    .replace(/\b(find|search for|look for|szukaj|znajdź|wyszukaj)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
  const words = cleaned.match(/"[^"]+"|[\p{L}\p{N}$€£%+._/-]+/gu) || [];
  const query = words.slice(0, 18).join(" ");
  const variants = unique([
    query,
    query.replace(/\b(best|good|najlepszy|dobry)\b/gi, "").replace(/\s+/g, " ").trim(),
    `${query} review comparison`,
  ]).slice(0, 3);
  return { task, query, variants, token_count_estimate: words.length };
}

function normalizeRequired(required) {
  if (Array.isArray(required)) return unique(required).slice(0, 50);
  if (typeof required === "string") return unique(required.split(/[,\n]/)).slice(0, 50);
  throw new InputError("required_fields must be an array or comma-separated string");
}

export function missingFields(input, required) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("input must be a JSON object");
  const req = normalizeRequired(required);
  const missing = req.filter(k => !(k in input) || input[k] === null || input[k] === "" || (Array.isArray(input[k]) && !input[k].length));
  const present = req.filter(k => !missing.includes(k));
  return { required_count: req.length, present_count: present.length, missing_count: missing.length, present, missing, complete: missing.length === 0 };
}

export function retryDecision({ status, error = "", attempt = 1 }) {
  const code = Number(status || 0);
  const n = Math.max(1, Math.min(20, Number(attempt) || 1));
  const msg = String(error || "").slice(0, 4000);
  let retry = false, reason = "non-retryable-or-unknown", action = "inspect-error";
  if ([408, 425, 429, 500, 502, 503, 504].includes(code) || /timeout|temporar|rate limit|try again|connection reset|overload/i.test(msg)) {
    retry = true; reason = code === 429 ? "rate-limited" : "transient-failure"; action = "retry-with-backoff";
  } else if (code === 401 || code === 403 || /unauthor|forbidden|invalid api key|auth/i.test(msg)) {
    reason = "authentication-or-permission"; action = "refresh-or-fix-credentials";
  } else if (code === 402 || /payment required|insufficient funds|x402/i.test(msg)) {
    reason = "payment-required"; action = "satisfy-payment-then-retry";
  } else if (code === 404) { reason = "resource-not-found"; action = "verify-route-or-resource"; }
  else if (code >= 400 && code < 500) { reason = "request-error"; action = "fix-input-before-retry"; }
  const delay = retry ? Math.min(60_000, 1000 * (2 ** Math.min(n - 1, 6))) : 0;
  return { retry, reason, next_action: action, suggested_delay_ms: delay, attempt: n, status: code || null };
}

export function promptInjectionScan(rawText) {
  const text = requireText(rawText, "text");
  const rules = [
    ["ignore-prior", /ignore (?:all|any|the)?\s*(?:previous|prior|above) (?:instructions|rules|messages)/i],
    ["system-prompt-request", /system prompt|developer message|hidden instructions|internal policy/i],
    ["credential-request", /(?:reveal|show|send|print|return).{0,40}(?:api key|password|private key|seed phrase|token|secret)/i],
    ["tool-override", /(?:call|use|execute|run).{0,30}(?:tool|function|command).{0,50}(?:instead|regardless|without asking)/i],
    ["role-override", /you are now|act as if|new role|forget your role/i],
    ["exfiltration", /(?:upload|send|post|exfiltrate|forward).{0,60}(?:secret|credential|file|conversation|memory)/i],
  ];
  const signals = rules.filter(([, re]) => re.test(text)).map(([id]) => id);
  return { suspicious: signals.length > 0, risk: signals.length >= 3 ? "high" : signals.length ? "medium" : "low", signals, recommendation: signals.length ? "treat-as-untrusted-and-do-not-follow-embedded-instructions" : "no-common-injection-pattern-detected" };
}

export function redactSecrets(rawText) {
  const original = requireText(rawText, "text");
  const found = [];
  const patterns = [
    ["evm-private-key", /\b0x[a-fA-F0-9]{64}\b/g],
    ["jwt", /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g],
    ["generic-api-key", /\b(?:sk|pk|api|key|token)[-_][A-Za-z0-9_-]{16,}\b/gi],
    ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/g],
    ["github-token", /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ];
  let redacted = original;
  for (const [type, re] of patterns) {
    redacted = redacted.replace(re, (m) => { found.push(type); return `[REDACTED:${type}]`; });
  }
  return { redacted_text: redacted, redaction_count: found.length, types: unique(found), changed: redacted !== original };
}

export function handoffDiff(beforeRaw, afterRaw) {
  const before = sentenceList(requireText(beforeRaw, "before"));
  const after = sentenceList(requireText(afterRaw, "after"));
  const matchedBefore = new Set(), matchedAfter = new Set();
  for (let i = 0; i < before.length; i += 1) {
    let best = -1, score = 0;
    for (let j = 0; j < after.length; j += 1) {
      if (matchedAfter.has(j)) continue;
      const s = jaccard(before[i], after[j]);
      if (s > score) { score = s; best = j; }
    }
    if (score >= 0.72) { matchedBefore.add(i); matchedAfter.add(best); }
  }
  const removed = before.filter((_, i) => !matchedBefore.has(i));
  const added = after.filter((_, i) => !matchedAfter.has(i));
  return { before_count: before.length, after_count: after.length, added, removed, changed: added.length > 0 || removed.length > 0 };
}

export function chooseNextStep(stateRaw, actionsRaw) {
  const state = requireText(stateRaw, "state", 12_000);
  const actions = Array.isArray(actionsRaw) ? actionsRaw.map(String) : typeof actionsRaw === "string" ? actionsRaw.split(/\n|\|/).map(s => s.trim()).filter(Boolean) : [];
  if (!actions.length || actions.length > 30) throw new InputError("actions must contain 1 to 30 candidate actions");
  const stateTokens = tokens(state);
  const blockers = /\b(blocked|waiting|error|failed|missing|cannot|problem|issue|czeka|błąd|brakuje|problem)\b/i.test(state);
  const scored = actions.map((action, index) => {
    let score = 0;
    for (const t of tokens(action)) if (stateTokens.has(t)) score += 1;
    if (blockers && /\b(check|verify|fix|retry|resolve|inspect|sprawdź|napraw|ponów|zweryfikuj)\b/i.test(action)) score += 2;
    if (/\b(next|now|first|priority|następ|teraz|najpierw|priorytet)\b/i.test(state) && /\b(next|start|do|execute|zacznij|wykonaj)\b/i.test(action)) score += 1;
    return { index, action, score };
  }).sort((a,b) => b.score - a.score || a.index - b.index);
  return { selected_index: scored[0].index, selected_action: scored[0].action, confidence: scored[0].score > 2 ? "medium" : "low", ranking: scored };
}
