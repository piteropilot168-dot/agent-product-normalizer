import dns from "node:dns/promises";
import net from "node:net";

export class InputError extends Error {
  constructor(message, status = 400, code = "INVALID_INPUT") {
    super(message);
    this.name = "InputError";
    this.status = status;
    this.code = code;
  }
}

function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;
  if (ip.startsWith("10.") || ip.startsWith("127.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

async function assertPublicUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new InputError("url must be a valid absolute URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new InputError("only HTTP(S) URLs are allowed");
  const records = await dns.lookup(url.hostname, { all: true });
  if (!records.length || records.some(r => isPrivateIp(r.address))) {
    throw new InputError("private or local network targets are not allowed");
  }
  return url;
}

export async function safeFetchHtml(rawUrl, { timeoutMs = 8000, maxBytes = 2_000_000 } = {}) {
  const url = await assertPublicUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 AgentProductNormalizer/0.2",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    if (!response.ok) throw new InputError(`upstream returned HTTP ${response.status}`, 422, "UPSTREAM_HTTP_ERROR");
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
      throw new InputError("URL did not return HTML", 422, "NOT_HTML");
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > maxBytes) throw new InputError("response body is too large", 422, "RESPONSE_TOO_LARGE");
    return { html: buf.toString("utf8"), finalUrl: response.url || url.href };
  } catch (e) {
    if (e?.name === "AbortError") throw new InputError("upstream fetch timed out", 422, "FETCH_TIMEOUT");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
