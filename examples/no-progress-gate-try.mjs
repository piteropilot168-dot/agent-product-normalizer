#!/usr/bin/env node
// Zero-dependency, no-wallet trial for Agent402 No-Progress Gate.
// Node.js 22+. Uses only the free /try endpoint; it never initiates a payment.
// Usage: node examples/no-progress-gate-try.mjs
//        cat sanitized-trace.json | node examples/no-progress-gate-try.mjs --stdin

const endpoint = process.env.AGENT402_FREE_TRY_URL ??
  'https://agent-product-normalizer.vercel.app/api/v1/no-progress-gate/try';

const syntheticEvent = {
  tool: 'web_search',
  args: { query: 'example API retry' },
  result: { hits: 0, status: 'success' },
  cost_usd: 0.014,
  elapsed_ms: 120,
};

async function main() {
  const custom = process.argv.slice(2);
  if (custom.length > 1 || (custom.length === 1 && custom[0] !== '--stdin')) {
    throw new Error('Usage: node no-progress-gate-try.mjs [--stdin]');
  }
  let payload = { history: Array.from({ length: 3 }, () => structuredClone(syntheticEvent)) };
  if (custom[0] === '--stdin') {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(payload.history) || payload.history.length < 2 || payload.history.length > 3) {
      throw new Error('Free trial requires 2–3 sanitized history events');
    }
  }
  if (new URL(endpoint).protocol !== 'https:' && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(endpoint)) {
    throw new Error('Trial URL must use HTTPS (localhost HTTP allowed for testing)');
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'agent402-production-check/1.0' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`Unexpected non-JSON response (HTTP ${response.status})`); }
  if (!response.ok) throw new Error(`Free trial failed (HTTP ${response.status}): ${JSON.stringify(data).slice(0,300)}`);
  if (!data.result || typeof data.result.decision !== 'string') throw new Error('Unexpected free-trial response shape');
  const { decision, reason, next_action, trace } = data.result;
  console.log(JSON.stringify({ decision, reason, next_action, event_count: trace?.event_count ?? null, paid: false }, null, 2));
  console.log('Free evaluation only. No charge or payment authorization.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
