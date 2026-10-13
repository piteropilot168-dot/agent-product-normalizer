import { aiWorldDelta } from "../src/precomputed-intelligence.mjs";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  res.setHeader("cache-control", "public, max-age=300, stale-while-revalidate=1800");
  res.setHeader("content-type", "application/json; charset=utf-8");
  return res.status(200).json(aiWorldDelta);
}
