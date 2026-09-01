# Idea Reality Check

Tells you whether your product idea is worth building, and shows the receipts. Every claim traces
to a real, clickable URL. It is willing to say **don't build this**.

```
$ pnpm cli validate "a link shortener with a nicer dashboard"

  DON'T BUILD IT
  high confidence - 4/4 sources returned

  Five products already do this and the people using them are not unhappy [sh_002].
  The only recurring grievance is that free tiers have narrowed [sh_004], which is
  a pricing complaint rather than a product one.

    decided by rule 4
```

---

## The idea

The category is full of AI "idea scorers". They all return the same thing: *your idea scores 7.5
out of 10, market size is large, competition is moderate.* No citations, always encouraging, read
once and never opened again.

This inverts it. It is an **evidence engine, not an opinion engine**, and the interesting
consequence is that it can be wrong in a way you can check.

---

## The one thing worth reading the code for

> **The rubric decides the verdict. The model never does.**

`packages/rubric` is pure TypeScript: no network, no model, no randomness, no I/O. Evidence goes
in, a verdict comes out, and the same evidence produces the same verdict on any machine on any
day. The model has exactly two jobs — turn a Reddit thread into structured evidence, and write the
explanation of a decision the code has already made.

Stated as a rule that can be enforced in review:

> **The model may classify and quote. Only the rubric may count.**

It may emit an evidence row with a URL, or pick from a closed enum. It may never emit a number
that reaches a verdict. This is tested rather than asserted — `run.test.ts` executes the whole
pipeline three times, with the normal prose model, with one that writes *"this is a terrible idea
and nobody wants it"*, and with one that throws. The verdict, the rule that fired, and every score
come back identical.

Three more guarantees are enforced in code rather than requested in a prompt:

- **The model never supplies a URL.** It references a source by index; the URL is attached from
  our own retrieved item. A hallucinated citation is unrepresentable, not merely discouraged.
- **Every extracted row is parsed against a schema and dropped if it fails.** A bad classification
  costs one row, not the run.
- **Every sentence without a resolvable evidence id is deleted before render** — silently, per
  sentence, and only for ids that actually exist. Silent because a flagged claim is still a claim
  to a reader who cannot audit it, and that reader is exactly who this is for.

---

## The four signals

| Signal | Question | The non-obvious part |
|---|---|---|
| Complaint density | Are users angry at what exists? | Measured **per competitor** as complaints over complaints-plus-praise. Dividing by everything a query returned measures the query, not the market. |
| The graveyard | Who died here, and why? | Cause of death flips the sign. Five execution failures and two acquisitions is an *attractive* market; two demand-side deaths is a wall. |
| Demand trajectory | Growing or dying? | Each series normalised by its own mean, so subscribers and downloads can be averaged. A missing series lowers confidence rather than skewing the score. |
| Entry feasibility | Could a small team actually enter? | Barriers arrive as cited evidence or are implied by a market-shape label. Never scored by a model. |

Four verdicts — `BUILD IT`, `BUILD IT DIFFERENTLY`, `DON'T BUILD IT`, `GO FIND OUT` — decided by
seven rules evaluated in order. Never a numeric score as the headline: a number invites argument
about the arithmetic instead of reading the evidence.

**Contentment is observed, never inferred from silence.** A market where users are happy and a run
where the gather came back empty produce the identical complaint count. Praise evidence is what
separates them, so `DON'T BUILD IT` requires positively observed satisfaction. Without that, the
harshest thing the tool can say would be indistinguishable from its own retrieval failure.

---

## Try it

```bash
pnpm install
pnpm cli validate "an app for dog walkers"
```

Works with no API keys at all — it will gather from Hacker News and GitHub, then tell you honestly
that it cannot judge without a model to read what it found.

```bash
pnpm test        # 170 tests
pnpm typecheck   # tsc -b, packages and the web app
pnpm evals       # 15 historical cases
pnpm web         # the app on localhost:3000
```

---

## Configuration

Everything is optional. A missing key lowers what the system can claim rather than stopping it.

| Variable | For | If unset |
|---|---|---|
| `CHEAP_API_KEY`, `CHEAP_BASE_URL`, `CHEAP_MODEL` | Interview, extraction, classification (~90% of tokens) | No interview and no extraction, so runs land on `GO FIND OUT` |
| `ANTHROPIC_API_KEY` | The verdict prose, one call per run | Verdicts keep their evidence but have no written explanation |
| `GITHUB_TOKEN` | Raises the GitHub rate limit | Unauthenticated search, which is enough for v1 |

The cheap tier is any OpenAI-compatible endpoint — Groq, OpenRouter, DeepSeek, Gemini — so
switching providers is three environment variables. No model id is defaulted, because free tiers
retire model names and a wrong guess fails confusingly at request time instead of clearly at
startup.

```bash
pnpm cli config    # shows what is configured and what is missing
pnpm cli seed      # pre-research the demo markets
pnpm cli markets   # list what has been seeded
```

---

## Architecture

```
apps/web          Next.js - input, interview, streaming trace, verdict card, /v/[id]
packages/engine   interview -> canonicalize -> gather -> extract -> judge
packages/sources  SourceAdapter registry - hn, github
packages/rubric   4 signals -> verdict. Pure, deterministic, fully tested.
packages/shared   zod schemas and shared types
packages/cli      validate, seed, markets, config
```

Dependencies run strictly one way: `shared <- rubric`, `shared <- sources`,
`{shared, rubric, sources} <- engine`, `engine <- {cli, web}`. `rubric` importing `sources` or
`engine` would end its testability, so it never does.

**Degradation never throws.** A source that fails, is rate-limited, is missing a key, or **times
out** drops from the run and lowers confidence. Time is treated as one more way a source can fail,
which is what lets the whole gather run under a wall-clock deadline: Vercel's Hobby tier kills a
function at 60 seconds, so the ceiling produces a weaker verdict rather than a broken page.

**Never silently wrong.** A cache hit names the market it matched and offers a way to reject it.
The system is allowed to be wrong; it is not allowed to hide it.

---

## Deploying

Vercel Hobby (free, 60s function cap) plus Neon free-tier Postgres. Seed dossiers locally first so
the deployed site answers instantly from stored research rather than gathering live on every
visit.

The Postgres-backed store is the one piece of v1 not yet written — `MarketStore` is an interface
with in-memory and JSON-file implementations, and Postgres slots in behind it without any stage
learning about it.

---

## What is deliberately not here

`reddit`, `search`, `appstore`, `packages` and `trends` adapters; durable run execution with a
worker and resumable runs; scheduled dossier refresh; semantic dedup; real embeddings for market
matching.

Two keyless adapters cover all four signals — HN returns a timestamp on every hit, so
posts-per-month is a trend series without Google Trends, and archived GitHub repositories are
obituaries with a date and a URL that still resolves. The other five raise *confidence*, which is
already modelled as a dial. Shipping two at honest `medium` confidence is the degradation design
working, not a compromise.
