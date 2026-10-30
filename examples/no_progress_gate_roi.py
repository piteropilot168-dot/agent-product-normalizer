#!/usr/bin/env python3
"""Estimate whether paying for No-Progress Gate can beat doing the retry.

Local-only calculator: no network, wallet, API keys, or purchases.
All values are assumptions, not measured savings or payment evidence.
"""

import argparse
from decimal import Decimal, InvalidOperation


def nonnegative_decimal(value: str) -> Decimal:
    try:
        number = Decimal(value)
    except InvalidOperation as exc:
        raise argparse.ArgumentTypeError("expected a decimal number") from exc
    if not number.is_finite() or number < 0:
        raise argparse.ArgumentTypeError("expected a finite, nonnegative number")
    return number


def probability(value: str) -> Decimal:
    number = nonnegative_decimal(value)
    if number > 1:
        raise argparse.ArgumentTypeError("probability must be between 0 and 1")
    return number


def positive_integer(value: str) -> int:
    try:
        number = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected a positive integer") from exc
    if number < 1:
        raise argparse.ArgumentTypeError("expected a positive integer")
    return number


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--retry-cost", type=nonnegative_decimal, required=True,
                        help="USD cost of one next retry (model + tools)")
    parser.add_argument("--avoid-probability", type=probability, required=True,
                        help="fraction of evaluated retries correctly prevented, 0..1")
    parser.add_argument("--evaluations", type=positive_integer, default=1000,
                        help="number of paid gate evaluations (default: 1000)")
    parser.add_argument("--gate-price", type=nonnegative_decimal, default=Decimal("0.003"),
                        help="USD equivalent price per evaluation (default: 0.003)")
    parser.add_argument("--overhead", type=nonnegative_decimal, default=Decimal("0"),
                        help="other USD cost per gate evaluation (default: 0)")
    parser.add_argument("--false-stop-probability", type=probability, default=Decimal("0"),
                        help="probability per evaluation of a harmful false stop (default: 0)")
    parser.add_argument("--false-stop-cost", type=nonnegative_decimal, default=Decimal("0"),
                        help="estimated USD cost per harmful false stop (default: 0)")
    args = parser.parse_args()

    avoided = args.avoid_probability * args.retry_cost
    loss = args.false_stop_probability * args.false_stop_cost
    net = avoided - args.gate_price - args.overhead - loss
    count = Decimal(args.evaluations)
    threshold_cost = args.gate_price + args.overhead + loss
    threshold = threshold_cost / args.retry_cost if args.retry_cost else None

    print("Local-only expected-value estimate (USD; not actual savings or revenue)")
    print(f"Evaluations: {args.evaluations}")
    print(f"Expected avoided retries: {args.avoid_probability * count:,.2f}")
    print(f"Gross avoided retry cost: ${avoided * count:,.4f}")
    print(f"Gate + overhead cost: ${(args.gate_price + args.overhead) * count:,.4f}")
    print(f"Expected false-stop loss: ${loss * count:,.4f}")
    print(f"Expected net benefit: ${net * count:,.4f}")
    if threshold is None:
        print("Break-even avoid probability: undefined (retry cost is zero)")
    elif threshold > 1:
        print(f"Break-even avoid probability: {threshold * 100:.2f}% (unreachable)")
    else:
        print(f"Break-even avoid probability: {threshold * 100:.2f}%")
    print("Decision: model favors paid gate" if net > 0 else
          "Decision: break-even" if net == 0 else
          "Decision: model favors local check or retry without paid gate")
    print("Validate probabilities on real sanitized traces before buying; a cheaper local guard wins when equivalent.")


if __name__ == "__main__":
    main()
