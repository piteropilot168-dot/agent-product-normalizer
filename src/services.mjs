import { InputError } from "./safe-fetch.mjs";

export function extractOffer(result) {
  return {
    source_url: result?.source?.requested_url ?? null,
    canonical_url: result?.source?.canonical_url ?? null,
    name: result?.product?.name ?? null,
    brand: result?.product?.brand ?? null,
    sku: result?.product?.sku ?? null,
    price: result?.offer?.price ?? null,
    currency: result?.offer?.currency ?? null,
    availability: result?.offer?.availability ?? null,
    seller: result?.offer?.seller ?? null,
    offer_url: result?.offer?.url ?? null,
    confidence: result?.quality?.confidence ?? null,
    quality_grade: result?.quality?.grade ?? null
  };
}

export function validateNormalized(result, url) {
  const issues = [];
  let score = 100;
  const penalize = (points, code, message) => { score -= points; issues.push({ code, message }); };
  if (!result?.product?.name) penalize(25, "MISSING_NAME", "Product name is missing.");
  if (!result?.offer?.price) penalize(25, "MISSING_PRICE", "Offer price is missing.");
  if (!result?.offer?.currency) penalize(15, "MISSING_CURRENCY", "Offer currency is missing.");
  if (!result?.offer?.availability) penalize(10, "MISSING_AVAILABILITY", "Availability is missing.");
  if (!result?.product?.brand) penalize(5, "MISSING_BRAND", "Brand is missing.");
  if (!result?.product?.image_urls?.length) penalize(5, "MISSING_IMAGE", "No product image URL was found.");
  if ((result?.quality?.confidence ?? 0) < 0.8) penalize(10, "LOW_CONFIDENCE", "Normalizer confidence is below 0.8.");
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return {
    url, score, grade,
    usable_for_agents: score >= 70 && Boolean(result?.product?.name) && Boolean(result?.offer?.price),
    issues,
    normalized_quality: result?.quality ?? null
  };
}

function parsePrice(value) {
  if (value == null || value === "") return null;
  const p = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(p) ? p : null;
}

export function compareOffers(items) {
  const offers = items.map(({ url, result }) => ({ url, ...extractOffer(result) }));
  const best_by_currency = {};
  const warnings = [];
  const currencies = new Set();

  for (const offer of offers) {
    if (offer.currency) currencies.add(offer.currency);
    const price = parsePrice(offer.price);
    if (!offer.currency || price == null) continue;
    const current = best_by_currency[offer.currency];
    if (!current || price < current.numeric_price) {
      best_by_currency[offer.currency] = {
        url: offer.url, name: offer.name, price: offer.price, numeric_price: price,
        currency: offer.currency, availability: offer.availability, seller: offer.seller,
        confidence: offer.confidence
      };
    }
  }
  if (currencies.size > 1) warnings.push("Multiple currencies detected; no FX conversion is performed.");
  return { count: offers.length, offers, best_by_currency, warnings };
}

export function requireUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    throw new InputError("url is required and must be at most 2048 characters");
  }
  return value;
}

export function requireUrls(value, maxUrls = 5) {
  if (!Array.isArray(value) || value.length < 2 || value.length > maxUrls) {
    throw new InputError(`urls must contain between 2 and ${maxUrls} URLs`);
  }
  return value.map(requireUrl);
}
