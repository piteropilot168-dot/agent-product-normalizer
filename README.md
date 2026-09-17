# Agent Product Normalizer + Video Intelligence API v0.7.1

Machine-first x402 utilities for autonomous agents.

## Video Intelligence — do not make the agent watch the video

- `video-transcript` — fetch a YouTube transcript through a configured transcript provider — $0.015
- `video-brief` — compact extractive brief from a long transcript — $0.006
- `video-key-points` — important passages only — $0.004
- `video-answer-question` — question → answer + evidence passages — $0.006
- `video-chapters` — topic-sized transcript chunks — $0.004
- `video-claims` — claims queued for verification — $0.004
- `video-action-items` — concrete actions from a video — $0.003
- `video-analyze` — URL → transcript → brief + key points + chapters + claims + actions + optional Q&A in one call — $0.025

The transcript fetch route is advertised only after `SUPADATA_API_KEY` is configured. All transcript-analysis routes work without an upstream provider if the caller already has transcript text.

## Provider setup

Set `SUPADATA_API_KEY` in Vercel environment variables. The service calls Supadata's transcript endpoint server-side; callers never see that key.

## Existing agent utility layer

The v0.6 friction, safety, workflow and commerce endpoints remain available.

## v0.7.1

Adds Bazaar discovery metadata to every video route, fixes `/test-video-transcript`, and adds the all-in-one `video-analyze` endpoint so agents pay once and fetch the transcript once.

## Health

`GET /health` → version `0.7.1`.
