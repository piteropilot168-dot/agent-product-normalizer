#!/usr/bin/env python3
"""Free, no-wallet Agent402 No-Progress Gate demo (Python 3.9+; stdlib only).

Usage:
  python3 examples/no_progress_gate_try.py
  python3 examples/no_progress_gate_try.py --file sanitized-trace.json

Never submit credentials, customer records or private tool outputs to a public API.
The free /try route accepts 2-3 events; this script does not initiate payments.
"""

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

DEFAULT_ENDPOINT = "https://agent-product-normalizer.vercel.app/api/v1/no-progress-gate/try"


def main():
    parser = argparse.ArgumentParser(description="Try the free No-Progress Gate without a wallet")
    parser.add_argument("--file", help="JSON file containing a sanitized {'history': [...]} payload")
    args = parser.parse_args()

    event = {
        "tool": "web_search",
        "args": {"query": "example API retry"},
        "result": {"hits": 0, "status": "success"},
        "cost_usd": 0.014,
        "elapsed_ms": 120,
    }
    payload = {"history": [event.copy() for _ in range(3)]}
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            payload = json.load(f)
    if not isinstance(payload, dict) or not isinstance(payload.get("history"), list) or not 2 <= len(payload["history"]) <= 3:
        raise ValueError("Free trial requires JSON with 2-3 history events")

    endpoint = os.getenv("AGENT402_FREE_TRY_URL", DEFAULT_ENDPOINT)
    url = urlsplit(endpoint)
    is_local = url.scheme == "http" and url.hostname in ("localhost", "127.0.0.1")
    if url.scheme != "https" and not is_local:
        raise ValueError("Trial endpoint must use HTTPS (HTTP permitted only for localhost)")
    if url.username or url.password or url.fragment:
        raise ValueError("Endpoint must not contain credentials or a URL fragment")

    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "agent402-production-check/1.0",
            "X-Agent402-Probe": "production-check",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            status = response.status
            data = json.load(response)
    except HTTPError as exc:
        raise RuntimeError("Free trial failed with HTTP {}".format(exc.code)) from exc
    except URLError as exc:
        raise RuntimeError("Could not reach free trial: {}".format(exc.reason)) from exc

    if status != 200 or not isinstance(data, dict) or not isinstance(data.get("result"), dict):
        raise RuntimeError("Unexpected free trial response shape")
    result = data["result"]
    if not isinstance(result.get("decision"), str):
        raise RuntimeError("Missing decision in free trial response")
    print(json.dumps({
        "decision": result["decision"],
        "reason": result.get("reason"),
        "next_action": result.get("next_action"),
        "event_count": result.get("trace", {}).get("event_count") if isinstance(result.get("trace"), dict) else None,
        "paid": False,
    }, indent=2))
    print("Free evaluation only; no charge or payment authorization.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print("Error: {}".format(exc), file=sys.stderr)
        sys.exit(1)
