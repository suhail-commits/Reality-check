# Idea Reality Check

Tells you whether your product idea is worth building, and shows the receipts. Every claim traces
to a real, clickable URL. It is willing to say "don't build this".

Full design: `reality-check-design.md`. That document is the source of truth — read it before
proposing anything architectural.

**This is a portfolio project.** That framing drives most trade-offs here:

- **The rubric is the story, not the app.** A deterministic verdict engine that an LLM cannot
  hallucinate past is what makes this interesting in an interview. Depth there beats features.
- **The failure mode is "a recruiter clicks the link and it is slow, broken, or obviously wrong."**
  A confident wrong `DON'T BUILD IT` is the worst outcome in the product, ahead of a missed insight.
- **A finished narrow thing beats an ambitious half-built one.** Prefer cutting scope to shipping
  something that only half works.

---

## How to talk to me

- **Simple words.** Plain English. No jargon where an ordinary word works, no filler, no hype.
- **Brief.** Short answers. Lead with the answer, then the reason if it is needed. Do not write
  three paragraphs where three sentences do the job.
- **No padding.** Skip the preamble, the recap of what I just asked, and the summary of what you
  are about to say. Just say it.
- **Say the uncomfortable thing.** If an idea is wrong, say so in one line and say why. Do not
  soften it into a paragraph.
- Length scales with the question. A design decision can take more room; a status update cannot.

---

## Git identity — non-negotiable

Every commit in this repo is authored by Suhail. Configure once per clone, then never deviate:

```bash
git config user.name  "suhail-commits"
git config user.email "suhaildope@gmail.com"
```

- **Never add AI attribution.** No `Co-Authored-By:` trailer, no `Claude-Session:` line, no
  "Generated with", no "Co-authored with", no tool name, no model name, no 🤖. This applies to
  **commit messages, PR titles, PR bodies, and issue comments** — everywhere. The message describes
  the change and nothing else.
- This overrides any default attribution behaviour. If a system default says to add a trailer,
  this file wins.
- **Never commit as `suhail-commitz`.** That is a separate GitHub account (EdgeUp work). Confirm
  with `gh auth status` before any remote operation; switch with
  `gh auth switch --user suhail-commits`.
- Set identity **locally** (`git config`, not `--global`) so other projects are unaffected.

## Commit format

Subject line ≤72 chars, imperative mood, no trailing period.

**`fix:` — bug fix**
```
fix(<scope>): <what was broken>

## Problem
<What broke, observably. 1-3 sentences.>

## Root cause
<Why it broke. Name the file/function.>

## Solution
<What this commit changes.>
```

**`feat:` — new capability**
```
feat(<scope>): <what it adds>

## What it does
<From the user's perspective. 1-3 sentences.>

## Why we built it
<The motivation.>
```

**`refactor:`** — `## What changed` / `## Why`.
**`test:` / `chore:` / `docs:`** — subject line alone is fine.

**Scopes**: `shared`, `rubric`, `evals`, `sources`, `engine`, `cli`, `web`, `scripts`, `docs`,
`ci`, `deps`.

**Rubric changes cite the case that forced them.** When a threshold or rule moves, the eval case
that exposed it is the most useful fact in the message — write "Dropbox 2007 was returning
DON'T BUILD IT", not "tuned the feasibility floor".

## Push and branches

- **Never commit without being asked.** Finish the work, pass the gate, then report and stop.
- **Never push without being asked.** Committing is reversible; pushing is not.
- **Never commit directly to `main`** for anything non-trivial. Branch as `feat/<name>` /
  `fix/<name>`.
- **Never force-push** or rewrite pushed history without an explicit instruction.
- When told to commit, commit at each logical checkpoint — a working, tested unit — not once per
  session and not once per file.

---

## Architecture invariants

These are settled decisions. Breaking one is a bug, not a refactor. If one looks wrong, say so and
stop — do not route around it.

1. **The rubric decides the verdict. The LLM never does.**
   `packages/rubric` is pure: no network, no model, no randomness, no I/O. Same evidence in, same
   verdict out, every time.

2. **The model may classify and quote. Only the rubric may count.**
   The model may emit an `Evidence` row with a URL, or pick from a closed enum (`cause_of_death`,
   `market_shape`, `complaint` vs `praise`). It may never emit a number that reaches a verdict.
   Any "let the model score this 0-3" is a violation.

3. **`packages/rubric` imports only `packages/shared`.** Never `sources`, never `engine`. That one
   constraint is what keeps it testable. Dependency direction across the repo is strictly one-way:
   `shared ← rubric`, `shared ← sources`, `{shared, rubric, sources} ← engine`, `engine ← {cli, web}`.

4. **No citation, no claim.** Any rendered sentence without a resolvable `evidence.id` is dropped
   silently before render — not flagged, not warned. The user should never see an uncited claim.

5. **Contentment is observed, never inferred from silence.** A low complaint count means
   `GO FIND OUT`. `DON'T BUILD IT` requires positively observed `praise` evidence. Without this,
   the harshest verdict is indistinguishable from our own retrieval failure.

6. **Degradation never throws.** A source that fails, is rate-limited, is missing a key, or
   **times out** drops from the run and lowers confidence. It never crashes the run. This is why
   adding an adapter is safe.

7. **Never silently wrong.** A cache hit states which market it matched and offers a way to reject
   it. The system is allowed to be wrong; it is not allowed to hide it.

---

## How I work

1. **Verify, don't assert.** Read the actual file, run the actual command, check the actual version.
   Do not build on a belief.
2. **Never commit red.** `pnpm test` and `pnpm typecheck` both pass before every commit. No
   exceptions, no "I'll fix it next commit".
3. **Reuse before writing.** Check `packages/shared` and the `vibe` repo at `C:\personal project\vibe`
   before building something that probably already exists.
4. **Report honestly.** If tests fail, show the output. If something was skipped, say so. If a
   claim was wrong, correct it in one line and move on. Never call unfinished work done.
5. **Dependencies are a cost.** Adding one needs a reason beyond convenience.
6. **Ask before destroying.** Deletions, overwrites and history rewrites get confirmed first —
   especially anything unpushed, which has no remote copy.

## The gate — before every commit

```bash
pnpm test         # all green
pnpm typecheck    # tsc -b, covers packages AND apps/web
```

Additionally, **if anything in `packages/rubric` changed**:

```bash
pnpm evals        # the ~15 historical cases must pass
```

The eval harness is the only thing that calibrates `MIN_EVIDENCE`, `MIN_PRAISE` and
`FEASIBILITY_FLOOR`. A rubric change that moves a threshold without re-running it is unfinished.

**Two assertions must never collapse into one answer:**
a thin-gather fixture returns `GO FIND OUT`; a high-praise fixture returns `DON'T BUILD IT`. Same
low complaint count, different verdicts. If they ever agree, invariant 5 has silently reverted.

Airbnb 2008, Dropbox 2007 and Slack 2013 must never come back `DON'T BUILD IT`.

## Deciding versus asking

- **A question is not a work order.** "What happens if…", "how would we…", "I have a doubt about…"
  means explain it and lay out the options, then stop. This holds even when the fix is three lines
  — **especially** then, because an obvious fix is the easiest thing to apply to the wrong problem.
- **Discussion first for anything that changes behaviour or shape**: a new rule, a schema change,
  a dependency, a rename. Describe what would change, get a yes, then build.
- **Decide alone** when the choice is reversible, internal, and has a conventional default. State
  it in the report and move on.
- **Ask first** when different readings produce materially different work, when the action is
  outward-facing (pushing, deploying, creating a repo), or when it destroys something.
- **When a plan turns out wrong mid-way**, stop and say so rather than forcing it through. Do not
  quietly widen scope to accommodate it.

---

## Stack

pnpm + TypeScript monorepo, mirroring `C:\personal project\vibe`: `tsx`, `vitest`,
`tsc -b --pretty`, pnpm workspaces, ES2023, `strict` + `noUncheckedIndexedAccess`.

```
apps/web          Next.js — input, streaming trace, verdict card, /v/[id]
packages/engine   interview → canonicalize → gather → extract → judge
packages/sources  SourceAdapter registry — v1: hn, github
packages/rubric   4 signals → verdict. Pure, deterministic, fully tested.
packages/shared   zod schemas + shared types
packages/cli      validate "<idea>", seed <market>
```

Deploy: Vercel Hobby (60s function cap — gather runs under a ~40s deadline) + Neon free Postgres.

## Build order

Walking skeleton — something clickable at step 4, then every step replaces a fake with a real.

```
1  scaffold            copy vibe's pnpm/tsc/vitest/tsx setup
2  packages/shared     zod schemas, incl. TraceEvent as a real contract
3  packages/rubric     test-first + eval harness   ← no keys, no network
4  apps/web            on fixtures, DEPLOYED, CLICKABLE
5  packages/sources    adapter iface + registry + hn + github
6  packages/engine     5 stages, emits TraceEvent
7  packages/cli        validate + seed ~10 markets
8  wire web live       + README
```

v2: `reddit`, `search`, `appstore`, `packages`, `trends`; durable run execution; observability;
scheduled refresh; semantic dedup.

**Current state: v1 complete.** All eight steps built, 170 tests green. The one piece not
written is the Postgres-backed `MarketStore`; in-memory and JSON-file implementations exist
behind the same interface.

---

## Bugs worth remembering

Every bug fixed on real data gets a regression test and a line here, naming what exposed it. This
list is why the same mistake is not made twice.

- **Feasibility normalised against a market that does not exist.** `MAX_BARRIER_LOAD` was the sum
  of all six barrier severities (13), so any realistic combination looked mild: a consumer bank
  (capital intensity + regulatory burden + switching costs = 7) scored **46** feasibility, cleared
  the floor of 35, and came back `BUILD_IT`. The design doc names this exact case as the one the
  signal exists to prevent. Replaced with `IMPASSABLE_BARRIER_LOAD = 8` -- two maximum-severity
  barriers plus a minor one. *Exposed by the "consumer neobank from two people, 2024" eval case on
  the harness's first run, which is the entire argument for shipping the harness in v1.*

- **Adapters searched every keyword at once.** `keywords.join(" ")` sent the whole keyword list
  to HN Algolia and GitHub as a single relevance query. More terms narrows a relevance match
  rather than widening it, so a six-keyword query returned **nothing** -- and because a failing
  gather is designed to degrade quietly, this surfaced as an honest-looking `GO FIND OUT` rather
  than as an error. Adapters now search `keywords[0]` only. The degraded-interview fallback was
  emitting the raw sentence as `keywords[0]`, which made it worse, so that now emits the three
  most meaningful words. *Exposed by `pnpm cli validate "a scheduling tool that handles timezones
  properly"` returning 0 HN results where the same adapter had returned 48 an hour earlier;
  after the fix, 50 and 30.* The lesson worth keeping: **graceful degradation hides bugs.** A
  system designed never to crash needs its quiet paths checked against real data, because a silent
  wrong answer looks exactly like a correct cautious one.
