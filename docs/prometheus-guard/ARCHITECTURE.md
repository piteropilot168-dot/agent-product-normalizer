# Architecture

PROMETHEUS Guard sits between an agent-generated candidate and downstream execution.

```
request
  |
worker --------> candidate + atomic claims
                    |
evidence --------> claim/evidence matrix
                    |
critic ----------> conflicts + omissions + constraint failures
                    |
verifier --------> independent verdict
                    |
policy gate ------> AUTO_EXECUTE / VERIFY / HUMAN_REVIEW / BLOCK
                    |
audit log <-------- every stage
```

The first implementation should remain deliberately small: deterministic schemas and policy logic first; model adapters second. This lets the benchmark distinguish orchestration/policy behavior from model behavior.

### Minimum gate policy
- BLOCK: explicit constraint violation or known contradiction on a critical field.
- HUMAN_REVIEW: unresolved material contradiction, insufficient evidence on a required field, or verifier confidence below threshold.
- VERIFY: supported output with non-critical uncertainty.
- AUTO_EXECUTE: all required fields supported, no material contradiction, verifier threshold met.

Thresholds are configuration, not hard-coded research conclusions.
