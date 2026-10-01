import { InputError } from "./safe-fetch.mjs";

const MAX_SCHEMA_CHARS = 30_000;
const MAX_ERROR_CHARS = 8_000;
const MAX_TOOL_NAME = 200;

function requireObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError(`${name} must be a JSON object`);
  }
  return value;
}

function normalizeToolName(value) {
  if (typeof value !== "string" || !value.trim()) throw new InputError("tool_name is required");
  if (value.length > MAX_TOOL_NAME) throw new InputError(`tool_name must be at most ${MAX_TOOL_NAME} characters`);
  return value.trim();
}

function canonicalName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function levenshtein(a, b) {
  const A = String(a), B = String(b);
  const prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i += 1) {
    let left = i;
    let diag = i - 1;
    for (let j = 1; j <= B.length; j += 1) {
      const up = prev[j];
      const next = Math.min(up + 1, left + 1, diag + (A[i - 1] === B[j - 1] ? 0 : 1));
      prev[j] = next;
      diag = up;
      left = next;
    }
    prev[0] = i;
  }
  return prev[B.length];
}

function parseArguments(value) {
  if (value == null) return { value: {}, changes: ["defaulted-null-arguments-to-empty-object"] };
  if (typeof value === "object" && !Array.isArray(value)) return { value: structuredClone(value), changes: [] };
  if (typeof value !== "string") throw new InputError("arguments must be an object or JSON string");

  let raw = value.trim();
  const changes = [];
  if (/^\`\`\`/.test(raw)) {
    raw = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
    changes.push("removed-code-fence");
  }

  const attempts = [
    [raw, null],
    [raw.replace(/,\s*([}\]])/g, "$1"), "removed-trailing-comma"],
  ];

  for (const [candidate, label] of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InputError("arguments JSON must decode to an object");
      if (label) changes.push(label);
      return { value: parsed, changes };
    } catch (error) {
      if (error instanceof InputError) throw error;
    }
  }
  throw new InputError("arguments is not valid JSON and cannot be repaired deterministically");
}

function coerceValue(value, schema) {
  if (!schema || typeof schema !== "object") return { value, changed: false };
  const type = Array.isArray(schema.type) ? schema.type.filter(t => t !== "null")[0] : schema.type;
  if (!type) return { value, changed: false };

  if (type === "string" && typeof value !== "string") {
    if (["number","boolean"].includes(typeof value)) return { value: String(value), changed: true, note: "coerced-to-string" };
  }
  if ((type === "number" || type === "integer") && typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && (type !== "integer" || Number.isInteger(n))) return { value: n, changed: true, note: `coerced-to-${type}` };
  }
  if (type === "boolean" && typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true","1","yes"].includes(s)) return { value: true, changed: true, note: "coerced-to-boolean" };
    if (["false","0","no"].includes(s)) return { value: false, changed: true, note: "coerced-to-boolean" };
  }
  if (type === "array" && !Array.isArray(value)) {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return { value: parsed, changed: true, note: "parsed-stringified-array" };
      } catch {}
    }
  }
  if (type === "object" && typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { value: parsed, changed: true, note: "parsed-stringified-object" };
    } catch {}
  }
  return { value, changed: false };
}

function repairName(name, availableTools) {
  const list = Array.isArray(availableTools) ? availableTools.map(String).map(s => s.trim()).filter(Boolean).slice(0, 200) : [];
  if (!list.length || list.includes(name)) return { name, change: null, unresolved: null };

  const lower = list.find(x => x.toLowerCase() === name.toLowerCase());
  if (lower) return { name: lower, change: `tool-name-case:${name}->${lower}`, unresolved: null };

  const canon = canonicalName(name);
  const canonicalMatches = list.filter(x => canonicalName(x) === canon);
  if (canonicalMatches.length === 1) {
    return { name: canonicalMatches[0], change: `tool-name-normalized:${name}->${canonicalMatches[0]}`, unresolved: null };
  }

  const ranked = list.map(x => ({ x, d: levenshtein(canon, canonicalName(x)) })).sort((a,b) => a.d - b.d);
  if (ranked[0] && ranked[0].d <= 2 && (!ranked[1] || ranked[1].d > ranked[0].d)) {
    return { name: ranked[0].x, change: `tool-name-typo:${name}->${ranked[0].x}`, unresolved: null };
  }
  return { name, change: null, unresolved: "tool-name-not-safely-repairable" };
}

export function repairToolCall({ toolName, arguments: rawArguments, schema, availableTools = [], error = "" }) {
  const originalName = normalizeToolName(toolName);
  const schemaObj = requireObject(schema, "schema");
  if (JSON.stringify(schemaObj).length > MAX_SCHEMA_CHARS) throw new InputError(`schema must be at most ${MAX_SCHEMA_CHARS} characters`);
  if (String(error || "").length > MAX_ERROR_CHARS) throw new InputError(`error must be at most ${MAX_ERROR_CHARS} characters`);

  const parsed = parseArguments(rawArguments);
  const repairedName = repairName(originalName, availableTools);
  const args = parsed.value;
  const changes = [...parsed.changes];
  const unresolved = [];
  if (repairedName.change) changes.push(repairedName.change);
  if (repairedName.unresolved) unresolved.push(repairedName.unresolved);

  const properties = schemaObj.properties && typeof schemaObj.properties === "object" ? schemaObj.properties : {};
  const required = Array.isArray(schemaObj.required) ? schemaObj.required.map(String) : [];

  for (const [key, propSchema] of Object.entries(properties)) {
    if (!(key in args)) continue;
    const fixed = coerceValue(args[key], propSchema);
    if (fixed.changed) {
      args[key] = fixed.value;
      changes.push(`${key}:${fixed.note}`);
    }
  }

  if (schemaObj.additionalProperties === false) {
    for (const key of Object.keys(args)) {
      if (!(key in properties)) {
        delete args[key];
        changes.push(`${key}:removed-unknown-field`);
      }
    }
  }

  const missing = required.filter(key => !(key in args) || args[key] === null || args[key] === "");
  if (missing.length) unresolved.push(...missing.map(key => `missing-required:${key}`));

  const safeToRetry = unresolved.length === 0;
  return {
    repairable: safeToRetry,
    changed: changes.length > 0,
    safe_to_retry: safeToRetry,
    tool_name: repairedName.name,
    arguments: args,
    changes,
    unresolved,
    original_error: String(error || "").slice(0, MAX_ERROR_CHARS) || null,
    next_action: safeToRetry ? "retry-once-with-repaired-call" : "regenerate-or-ask-for-missing-data",
  };
}
