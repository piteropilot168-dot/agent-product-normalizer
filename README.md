# Agent Product Normalizer + Video Intelligence API v0.7.6

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

## v0.7.6

Adds Bazaar discovery metadata to every video route, fixes `/test-video-transcript`, and adds the all-in-one `video-analyze` endpoint so agents pay once and fetch the transcript once.

## Health

`GET /health` → version `0.7.2`.


## v0.7.6 quality pass

- fixes generic cross-language questions such as `What is this video about?` by falling back to the extracted brief when lexical matching cannot work across languages
- avoids creating one chapter per sentence for very short videos
- expands claim detection beyond English to common German, Polish, Spanish and French patterns
- adds timestamp metadata to key points, chapters, claims, actions and answer evidence in `video-analyze`


## v0.7.6 video precision pass

- stricter factual-claim extraction: filters scene-setting, meta commentary and opinion-only lines
- normalizes constructions such as “the cool thing is that …” down to the factual clause
- chapter timestamps now point to the chapter start rather than the representative summary sentence
- `video-analyze` returns duration and compression metrics so agents can estimate how much context they avoided reading


## v0.7.6 long-video quality pass

- caption-aware sentence reconstruction reduces broken subtitle fragments
- more coherent extractive brief and key points with duplicate suppression
- stricter claim extraction filters greetings, questions, opinions and conference chatter
- action items require direct action language and reject narrative false positives
- analytical Q&A recognizes broad prompts such as “main arguments and examples”
- chapter generation uses larger coherent windows and shorter titles


## v0.7.6 transcript segmentation and relevance pass

- fixes long-video sentence collapse caused by lowercase subtitle starts
- filters greetings and filler from summaries/key points
- ranks verifiable claims by specificity instead of returning the first matches
- improves broad “main arguments and examples” extraction using transcript-wide topic terms
- adds `context_pack` with timestamped model-ready evidence for downstream agents


## v0.7.6 thematic relevance pass

- prioritizes central thesis sentences in briefs and chapter titles
- penalizes jokes, stage chatter and anecdotal setup in summaries
- improves broad examples by requiring relevance to the video's central topics
- filters anecdotal/personal narration from verifiable claims unless supported by numeric/evidence signals
- reduces tangential examples such as jokes and unrelated quotations
