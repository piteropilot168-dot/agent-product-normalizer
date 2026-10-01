# FieldFuse Utility Mapper — PoC

Offline-first, vendor-neutral decision-support layer for underground-utility surveys.

## Problem

Field crews often combine several imperfect evidence sources: GPR at different frequencies, electromagnetic locators, GNSS/RTK positions, archived drawings, visual inspection and local knowledge. Those sources disagree and have very different reliability. FieldFuse fuses them into a single GIS-ready confidence layer instead of treating any one sensor as ground truth.

## What this PoC does

- spatial/depth clustering of observations;
- sensor-specific evidence weighting;
- cross-sensor confidence fusion;
- disagreement and uncertainty penalties;
- explicit `hold_for_verification` status for weak/single-source detections;
- GeoJSON output with depth, confidence, uncertainty, sensor provenance and evidence IDs;
- fully offline execution with no cloud dependency.

## Safety boundary

This is **not** a raw-GPR detector and must not be used as the sole basis for excavation. It is a decision-support and data-fusion layer intended to sit above approved utility-locating methods and local safety procedures.

## Why it may matter

A practical field stack can use:
1. low-frequency GPR for deeper targets;
2. higher-frequency GPR for shallow/high-resolution utilities;
3. active/passive electromagnetic locating for conductive lines;
4. RTK/GNSS positioning;
5. FieldFuse to combine evidence, preserve provenance and export GIS-ready results.

The software layer is deliberately hardware-neutral so a pilot can use locally available or rented instruments.

## Run

```bash
node prototype/fieldfuse-utility-mapper/test.mjs
node prototype/fieldfuse-utility-mapper/cli.mjs prototype/fieldfuse-utility-mapper/sample-observations.json
```

## Validation plan before any external technical claim

1. Benchmark the fusion logic against public utility GPR datasets.
2. Add adapters for vendor exports / CSV / DZT-derived detections.
3. Evaluate false-positive/false-negative behavior with known ground truth.
4. Test shallow and deep targets separately.
5. Add corridor/line fitting and uncertainty envelopes.
6. Field-validate against a qualified subsurface-utility survey partner before representing the system as excavation-ready.

## Commercial/challenge positioning

Potential value is not "AI replaces GPR." The value proposition is:
- fewer duplicate passes;
- clearer verification priorities;
- lower training burden;
- consistent confidence scoring;
- auditable sensor provenance;
- standard GIS exports in low-connectivity environments.

No field-performance or savings claims should be made until validated.
