# AI Token Usage — Session Ledger

Tracking LLM token consumption for the Sublime UI build session (session id
`c8a6885f-…`). Figures are aggregated from the session transcripts (main thread +
all workflow subagents). The billing-authoritative source is the `/cost` command;
these numbers are transcript-derived and may differ slightly.

## How to read these numbers

- **New tokens** = `input (uncached) + output + cache-write`. This is the figure
  that best reflects real work done.
- **Cache-read** is counted separately and is ~10× cheaper. It's huge here because
  the 1M-context window is re-read every turn — expected, not waste.
- **Workflows count too.** The background build workflows (#5a navigation, #5b
  desktop) run dozens of Opus subagents; their tokens are included via the
  `subagents/` transcripts.

## Snapshot 1 — 2026-06-19 (after #5a + #5b builds launched, docs branding in progress)

| Stream | Output | New tokens (in+out+cacheW) | Cache-read |
| --- | ---: | ---: | ---: |
| Main thread | 2,081,979 | 8,649,013 | 380,892,650 |
| Workflow subagents | 842,010 | 14,587,949 | 162,882,177 |
| **Total** | **2,923,989** | **23,236,962** | **543,774,827** |

**Headline so far: ~23.2M new tokens (~2.9M output), ~544M cache-reads.**
Most of the new-token spend is the two autonomous build workflows (~14.6M),
which is expected — they're writing and reviewing the whole #5a + #5b codebases.

## Yet to use (remaining planned work this session)

- Finish #5a / #5b builds (workflows running) + merge gates + final reviews
- Docs-site branding implementation (Strata logo) — small
- #6 starter template (spec → plan → build) — the largest remaining chunk
- Backfilling website docs as sub-projects land

> Update procedure: re-run the transcript aggregation (see commit history /
> session notes) or run `/cost`, then append a new Snapshot row below.
