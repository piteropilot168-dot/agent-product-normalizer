# PROMETHEUS Guard v0.1

## Goal
An open verification layer for AI-agent outputs. A worker cannot approve its own result.

## Decision pipeline
TASK -> WORKER -> EVIDENCE -> CRITIC -> VERIFIER -> POLICY GATE -> OUTPUT / HUMAN REVIEW / BLOCK

## Core invariants
1. Separation of duties: worker and verifier are logically independent roles.
2. Evidence before approval: material factual claims require traceable evidence.
3. Disagreement is preserved, not averaged away.
4. Every decision emits an append-only audit record.
5. High-risk or insufficiently supported outputs fail closed to HUMAN_REVIEW or BLOCK.
6. Provider/model independence: roles can be backed by different models/providers.

## v0.1 decision contract
Input:
- task_id
- task
- candidate_output
- evidence[]
- constraints[]

Role outputs:
- worker: candidate + claims
- evidence: evidence coverage per claim
- critic: contradictions, missing evidence, constraint failures
- verifier: independent verdict + confidence
- gate: AUTO_EXECUTE | VERIFY | HUMAN_REVIEW | BLOCK

Audit event:
- timestamp
- task_id
- role
- model/provider identifier
- input hash
- output hash
- verdict
- confidence
- evidence refs
- reasons

## First benchmark
Use product normalization/extraction as the controlled task because this repository already implements it.

Compare:
A. baseline single-pass output
B. Guard pipeline

Measure:
- factual-field accuracy against a hand-checked gold set
- unsupported-field rate
- contradiction detection recall
- false-block rate
- human-review rate
- latency
- token/API cost

Target initial dataset: 100 examples. Expand to 200 after pipeline stabilization.

## Success criterion for the grant demo
Guard must demonstrate a measurable reduction in unsupported or incorrect accepted outputs versus baseline, with the full audit trail published. No target percentage will be claimed before measurement.

## Scope boundaries
v0.1 is a research prototype, not a claim of general AI alignment or guaranteed correctness. It does not autonomously execute consequential real-world actions.

## Open-source deliverables
- orchestration code
- role/policy schemas
- benchmark dataset (where licensing permits)
- evaluation scripts
- aggregate results
- reproducibility instructions
