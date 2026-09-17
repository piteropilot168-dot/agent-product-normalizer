import * as cheerio from "cheerio";

const AVAILABILITY_MAP = {
  "https://schema.org/InStock": "in_stock",
  "http://schema.org/InStock": "in_stock",
  "https://schema.org/OutOfStock": "out_of_stock",
  "http://schema.org/OutOfStock": "out_of_stock",
  "https://schema.org/PreOrder": "preorder",
  "http://schema.org/PreOrder": "preorder"
};

function arr(v) { return Array.isArray(v) ? v : v == null ? [] : [v]; }
function str(v) { return typeof v === "string" ? v.trim() : v == null ? null : String(v).trim(); }

function findProductJsonLd($) {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const parsed = JSON.parse($(el).text());
      const nodes = arr(parsed?.["@graph"]).length ? arr(parsed["@graph"]) : arr(parsed);
      for (const node of nodes) {
        const types = arr(node?.["@type"]);
        if (types.includes("Product")) return node;
      }
    } catch {}
  }
  return null;
}

function pickOffer(product) {
  const offer = arr(product?.offers)[0] || {};
  const priceSpec = arr(offer?.priceSpecification)[0] || {};
  return {
    price: str(offer?.price ?? priceSpec?.price),
    currency: str(offer?.priceCurrency ?? priceSpec?.priceCurrency),
    availability: AVAILABILITY_MAP[offer?.availability] || str(offer?.availability),
    condition: str(offer?.itemCondition),
    seller: str(offer?.seller?.name ?? offer?.seller),
    url: str(offer?.url),
    valid_until: str(offer?.priceValidUntil)
  };
}

export function normalizeProductPage(page) {
  const html = page?.html ?? String(page ?? "");
  const finalUrl = page?.finalUrl ?? null;
  const $ = cheerio.load(html);
  const productLd = findProductJsonLd($);

  const canonical = $('link[rel="canonical"]').attr("href") || finalUrl;
  let merchantHost = null;
  try { merchantHost = new URL(finalUrl || canonical).host; } catch {}

  let name = null, description = null, brand = null, sku = null, gtin = null, category = null, images = [], offer = {};
  let primarySource = "html";
  let confidence = 0.55;

  if (productLd) {
    primarySource = "json_ld";
    confidence = 0.95;
    name = str(productLd.name);
    description = str(productLd.description);
    brand = str(productLd.brand?.name ?? productLd.brand);
    sku = str(productLd.sku);
    gtin = str(productLd.gtin ?? productLd.gtin13 ?? productLd.gtin12 ?? productLd.gtin14 ?? productLd.gtin8);
    category = str(productLd.category);
    images = arr(productLd.image).map(x => str(x?.url ?? x)).filter(Boolean);
    offer = pickOffer(productLd);
  }

  name ||= str($('meta[property="og:title"]').attr("content")) || str($("title").text());
  description ||= str($('meta[name="description"]').attr("content")) || str($('meta[property="og:description"]').attr("content"));
  const ogImage = str($('meta[property="og:image"]').attr("content"));
  if (!images.length && ogImage) images = [ogImage];

  const warnings = [];
  if (!name) warnings.push("missing product name");
  if (!offer?.price) warnings.push("missing price");
  if (!offer?.currency) warnings.push("missing currency");

  const grade = confidence >= 0.9 && warnings.length <= 1 ? "high" : confidence >= 0.7 ? "medium" : "low";

  return {
    schema_version: "2026-09-01",
    source: {
      requested_url: finalUrl,
      canonical_url: canonical,
      merchant_host: merchantHost,
      checked_at: new Date().toISOString()
    },
    product: {
      name, description, brand, sku, gtin, category, image_urls: images
    },
    offer: {
      price: offer?.price ?? null,
      currency: offer?.currency ?? null,
      availability: offer?.availability ?? null,
      condition: offer?.condition ?? null,
      seller: offer?.seller ?? merchantHost,
      url: offer?.url ?? finalUrl,
      valid_until: offer?.valid_until ?? null
    },
    commerce: { shipping: null, returns: null },
    quality: { confidence, grade, primary_source: primarySource, warnings }
  };
}
