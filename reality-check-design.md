# Idea Reality Check — Detailed Design Spec

> Status: **design only**. No code, no scaffolding. This document is the deliverable.
> Target location if/when built: `C:\personal project\reality-check`

---

## 1. Context

A personal / portfolio project that answers three questions for anyone holding a
product idea — developer or not:

1. **Does this already exist?**
2. **How would mine differ from what exists?**
3. **If I build it, will it actually matter — is there real demand?**

### Why this is worth building

The category is saturated with AI "idea scorers" (ValidatorAI, IdeaBuddy, dozens
of *Startup Idea Validator* GPTs, plus ChatGPT-with-search doing a free mediocre
version). They all converge on the same output: *"Your idea scores 7.5/10. Market
size is large. Competition is moderate."* Users read it once, feel nothing, never
return. One-shot, no trust, no retention.

**The wedge is inversion: an evidence engine, not an opinion engine.**
Every claim traces to a real, clickable URL. The tool is willing to say
*"don't build this"* and show the receipts. Nobody in this category is brave
enough to do that, because a "no" is unshareable and unflattering — which is
exactly why it's differentiated and memorable.

### Win condition

**Portfolio value, staged.** This is a resume project, not a business:

- v1 must be **finishable** and must **work instantly** when a recruiter clicks it.
- v2 layers in the engineering depth that survives a 45-minute technical interview.
- It must run at **near-zero AI cost** (target $0 on free tiers, <$10/mo worst case).

Explicitly *not* optimizing for: scale, retention, revenue, moat.

---

## 2. Competitive landscape

| Product | What it does | Where it falls short |
|---|---|---|
| ValidatorAI, IdeaBuddy, Kernal, IdeaCheck | LLM-generated idea scores + SWOT | No citations, no verifiable evidence, always encouraging, one-shot |
| ChatGPT / Claude + web search | Free, flexible, decent surface answer | Inconsistent between runs, no structured rubric, no persistence, no shareable artifact |
| GummySearch | Reddit demand mining | Excellent raw signal, but it's a research tool — no verdict, no synthesis |
| Exploding Topics / Glimpse | Trend detection | Trends only; no competitors, no complaints, no graveyard |
| Crunchbase / Tracxn / PitchBook | Funding-grade competitor maps | Expensive, aimed at investors, not idea-stage builders |
| G2 / Capterra / Product Hunt | Competitor discovery | Discovery only, no interpretation, scraping-hostile |

**Structural differentiators of this project:**

1. **A deterministic rubric, not an LLM opinion** — reproducible and testable.
2. **A "no" is a first-class outcome**, with evidence.
3. **Every rendered sentence is traceable to a stored quote + URL.**
4. **The interview step** — converting vague input into a searchable problem
   statement before any research runs. Competitors feed the raw blob straight to
   the model and hallucinate around it.
5. **Cause-of-death analysis** — not just *who* died, but *why*, which flips the
   meaning of the evidence (see §6.2).

---

## 3. Audience and its consequences

**Primary audience: anyone with an idea, including non-technical users.**

| Consequence | Design response |
|---|---|
| Input is vague and unstructured ("an app for dog walkers") | The **interview stage** is mandatory and is where verdict quality is won |
| Users cannot detect a hallucinated competitor | **Citations are non-negotiable**; ungrounded sentences are dropped, not flagged |
| Output gets forwarded to a cofounder / spouse / investor | Plain language, no jargon, shareable permalink |
| Low intent, high volume, will not pay | Caching is a cost *and reliability* requirement, not an optimization |

**Beachhead note (marketing, not architecture):** the product stays open to
everyone, but launch marketing should target one narrow group first — most
plausibly indie hackers / r/SaaS / Product Hunt, since they are reachable, vocal,
and will share a brutal verdict. Deferred decision; does not affect the build.

---

## 4. Product principles

1. **Evidence over opinion.** If it can't be cited, it isn't said.
2. **The rubric decides, the model writes.** See §8.
3. **Confidence is an output, not a decoration.** Thin evidence yields
   `GO FIND OUT`, never a bluffed verdict.
4. **Every answer ends somewhere you can go.** Every verdict except `GO FIND OUT`
   carries a `Redirect`: the heaviest complaint cluster the user's own angle does
   not already address, computed by the rubric from the same evidence. It is
   graded `strong` / `thin` / `speculative` so a weak opening can be reported
   honestly rather than dressed up, and it cites evidence at every grade.
5. **Never dead-end on a score.** The user leaves with a decision and a next step.

---

## 5. The verdict taxonomy

Four outcomes. **Never a numeric score as the headline** — a number invites
argument and communicates nothing.

| Verdict | Meaning | Required accompanying output |
|---|---|---|
| `BUILD IT` | Real gap, real demand, entry feasible | The wedge; the top 3 unserved complaints |
| `BUILD IT DIFFERENTLY` | Right market, wrong wedge | The better wedge, and why the stated one fails |
| `DON'T BUILD IT` | Served + users content, or shrinking, or a proven graveyard | The specific disqualifying evidence + one adjacent opportunity |
| `GO FIND OUT` | Evidence too thin to judge | 3 concrete homework tasks with where to look |

Each verdict ships with a **confidence band** (`high` / `medium` / `low`) computed
from source coverage, not from model self-assessment (§7).

---

## 6. The rubric — four signals

The rubric is **pure, deterministic TypeScript**. No LLM, no I/O, fully unit
tested. Inputs are structured `Evidence` rows; outputs are four sub-scores plus a
verdict.

### 6.1 Complaint density — *the strongest signal*

**Question:** are users actively angry at the incumbents?

The critical insight: **competition is not the "no" signal — contentment is.**
A market where users are furious is an open market. A market where users are
happy is a closed one. Raw complaint *count* is misleading (big markets generate
more of everything), so the metric is a **ratio**, not a count.

**Contentment must be observed, never inferred from silence.** Extraction collects
`praise` evidence alongside `complaint` evidence — the same call, one more enum
value. Without it, "users are happy" and "our gather found nothing" produce an
identical low complaint count, and rule 4 (§7.1) fires a confident `DON'T BUILD IT`
on both. That is the system's most consequential verdict being indistinguishable
from a retrieval failure.

**The denominator is per-competitor, not per-run.** Dividing by everything
retrieved makes the metric a function of how the search query was phrased. Asking
*"of everything said about Calendly, what fraction is a grievance?"* is
query-neutral by construction, because the query is just the competitor's name.

```
complaint_ratio(c) = weighted_complaints(c)
                   / ( weighted_complaints(c) + weighted_praise(c) )

complaint_ratio    = evidence-weighted mean of complaint_ratio(c)
                     over all discovered competitors c

weighted_X(c) = Σ over X evidence attributed to competitor c:
      recency_weight   (24mo half-life; older evidence decays)
    × source_weight    (review sites > Reddit > HN comments > search snippets)
    × recurrence_bonus (×1.5 if the same complaint theme appears
                        across ≥2 distinct competitors)
```

Because the ratio is now bounded by observed talk rather than by retrieval
volume, a thin gather no longer masquerades as contentment — it collapses
`evidence_volume` instead and routes to `GO FIND OUT` via rule 1, where it belongs.

The `recurrence_bonus` is what distinguishes *"one angry user"* from
*"a structural gap in the market"* — a theme that recurs across multiple
competitors is a category-level failure, and that is precisely the wedge. The
per-competitor denominator makes this fall out naturally, since complaints are
already attributed to a competitor.

Complaint themes are clustered (by embedding similarity) so the output is
*"3 recurring complaint clusters"*, not *"340 complaints"*.

### 6.2 The graveyard — *cause of death matters more than the death*

**Question:** who already tried this and died, and why?

The naive reading ("startups died here, therefore no") is wrong and is exactly
what would have killed Airbnb and Dropbox. Every obituary is classified by cause,
and the cause flips the sign:

| Cause of death | Signal |
|---|---|
| `no_demand` | **Strong negative** — the market rejected it |
| `unit_economics` | **Strong negative** — the math doesn't work |
| `regulatory` | **Strong negative** — unless the law has since changed |
| `execution` / `founder_quit` / `ran_out_of_runway` | **Neutral** — they failed, the idea didn't |
| `acquired` | **Positive** — the market has proven exits |
| `pivoted_away` | Weak negative |

```
graveyard_score = f( count(no_demand ∪ unit_economics ∪ regulatory),
                     recency of those deaths,
                     count(acquired) as an offset )
```

A market with five execution-failures and two acquisitions is *attractive*.
A market with two `no_demand` deaths is a wall.

### 6.3 Demand trajectory

**Question:** is interest growing or dying?

Normalized slope over a 24-month window, computed from whichever series are
available:

- Google Trends interest curve (optional — fragile, see §11)
- Subreddit subscriber growth for the relevant communities
- npm / PyPI download curves (for developer-tool ideas)
- Frequency of relevant HN/Reddit posts per month
- Job postings mentioning the problem space

Multiple series are z-normalized and averaged; **each source's absence lowers
confidence rather than skewing the score**.

This is the signal that separates *"crowded and growing"* (fine — a rising tide)
from *"crowded and shrinking"* (fatal).

### 6.4 Entry feasibility

**Question:** could a small team with a laptop actually enter this?

A barrier checklist. Critically, **the model never scores a barrier** — see the
counting rule in §8. Barriers reach the rubric in exactly two forms:

- **Observed barriers** — the model emits a `barrier` evidence row carrying a
  cause and a citation (a licensing requirement, a shutdown post-mortem blaming
  unit economics). Subject to the same drop-if-uncited rule as every other claim.
- **Structural barriers** — derived deterministically by the rubric from a
  `market_shape` classification (`two_sided_marketplace`, `single_player_saas`,
  `hardware`, `regulated_service`, …). A bounded categorical label is a
  classification the model may make; a 0–3 score is an opinion it may not.

The rubric owns the shape → barrier mapping and all arithmetic:

| Barrier | Example of a high score |
|---|---|
| Capital intensity | Hardware, inventory, or a balance sheet required |
| Regulatory burden | Banking, healthcare, insurance licensing |
| Network effects | Value requires both sides at scale (marketplaces) |
| Data moat | Incumbent advantage is proprietary data you cannot obtain |
| Switching costs | Users are contractually or technically locked in |
| Distribution lock | Incumbent owns the only channel |

```
barrier_load      = Σ observed_barriers (weighted by citation strength)
                  + Σ structural_barriers implied by market_shape

feasibility_score = 100 − normalize(barrier_load)
```

Exists to stop the tool from cheerfully telling a solo founder to *"go build a
bank"* or *"compete with Google Maps"*.

---

## 7. Verdict logic and confidence

### 7.1 Decision rules (evaluated in order)

A rules table rather than a weighted sum — defensible, explainable, and
unit-testable case by case:

```
1. evidence_volume < MIN_EVIDENCE
        → GO FIND OUT

2. competitors == 0 AND demand_signal ≈ 0
        → DON'T BUILD IT  ("nobody built it" is a red flag, not a green light)

3. deaths(no_demand | unit_economics | regulatory) ≥ 2, recent
        → DON'T BUILD IT

4. competitors ≥ 3 AND complaint_ratio LOW AND praise_volume ≥ MIN_PRAISE
   AND trajectory ≤ FLAT
        → DON'T BUILD IT  (observed contentment — the true "no")

5. feasibility_score < FEASIBILITY_FLOOR
        → BUILD IT DIFFERENTLY  (or DON'T, if barriers are absolute)

6. complaint_ratio HIGH AND trajectory ≥ FLAT AND feasibility OK
     6a. user's stated wedge ∈ top complaint clusters → BUILD IT
     6b. otherwise                                    → BUILD IT DIFFERENTLY

7. default → GO FIND OUT
```

The `praise_volume` term in rule 4 is load-bearing. Without it the rule fires on
*absence* of complaints, which a thin or timed-out gather produces just as readily
as a happy market — turning the harshest verdict into a silent report of our own
retrieval failure. Requiring positively observed praise means a thin gather falls
through to rule 7 (`GO FIND OUT`) instead.

Rule 6a/6b is where the user's *specific idea* — as opposed to the market —
finally enters the calculation. The market dossier is shared; this branch is
personal to them.

### 7.2 Confidence model

Confidence is computed from **coverage**, never from model self-report:

```
confidence = g( adapters_that_returned / adapters_attempted,
                total_evidence_count,
                median_recency_of_evidence,
                cross_source_agreement )
```

A run where 3 of 7 adapters failed cannot produce `high` confidence, regardless
of how clean the surviving evidence looks. **A failing source degrades
confidence; it never crashes the run.**

### 7.3 The two interpretation rules (guardrails)

These are asserted directly in the test suite, because they are the difference
between a credible tool and one that tells Airbnb "no":

> **R1 — Competitors existing is not a reason to say no.** It proves people pay.
> The "no" signal is *contentment*: competitors exist AND nobody complains.

> **R2 — "Nothing like this exists" is a red flag, not a green light.** An empty
> market usually means someone tried and died, or nobody wants it.

---

## 8. The core architectural stance

> **The LLM does not decide the verdict. The rubric does.**

Stated as a rule that can actually be enforced in review and in tests:

> **The model may classify and quote. Only the rubric may count.**

Quoting means emitting an `Evidence` row with a URL. Classifying means choosing
from a closed enum (`cause_of_death`, `market_shape`, `complaint` vs `praise`).
Counting — any number that reaches a verdict — belongs to `packages/rubric` alone.
This is what makes §6.4 legitimate rather than an opinion wearing a rubric's clothes.

- `packages/rubric` — pure deterministic TypeScript. Four signal scores in,
  verdict + confidence out. No network, no model, no randomness.
- The LLM has exactly two jobs:
  1. **Extraction** — turn a raw Reddit thread / review / search result into
     structured `Evidence` rows.
  2. **Prose** — write the explanation of a decision *the code has already made*.

**Why this matters:**

- Verdicts are **reproducible** — same evidence, same verdict, every time.
- Verdicts are **testable** against historical cases (§14 eval harness).
- Verdicts **cannot be hallucinated** — the model is never asked to judge.
- It is the direct answer to the question this project will attract in every
  interview: *"how do you stop an LLM app from making things up?"*

**Companion guardrail — evidence-grounded generation:** the prose stage receives
only distilled evidence with IDs, and must cite `evidence.id` inline. A
post-processing pass **drops any sentence lacking a resolvable citation** before
render. Silent removal, not a warning badge — the user should never see an
uncited claim at all.

---

## 9. User experience — the 60-second path

The recruiter test drives the whole UX: *understand it and get a result inside a
minute, with no signup.*

1. **One box.** "Describe your idea." Free text. No form, no account.
2. **Three sharp questions back**, inline, each with tappable suggested answers so
   it takes ~15 seconds. Skippable (skipping lowers confidence).
   - *Who pays for this?*
   - *What do they do today instead?*
   - *What happens if they just... don't solve it?*
3. **Canonicalize** the answers into a market node → check the dossier cache.
4. **Cached → instant verdict**, with the match stated plainly —
   *"matched to: **dog-walking marketplaces**"* — next to a **"not my market"**
   button that forces a fresh run.
   **Uncached → live research with a streaming trace:**
   `searching HN… 47 threads… extracting complaints… 3 shutdowns found…`
   Watching the agent work is the single most impressive 30 seconds of the demo,
   and it is nearly free to build since the pipeline is already streaming.
5. **The verdict card** — headline verdict, confidence band, four expandable
   evidence panels, every claim clickable through to its source.
6. **Shareable permalink** `/v/[id]` — doubles as the portfolio artifact; a real
   verdict URL can go directly on the resume.

---

## 10. Architecture

pnpm + TypeScript monorepo, mirroring the existing `vibe` project at
`C:\personal project\vibe` (`apps/web` + `packages/{cli,engine,rules,shared}`) and
its tooling: `tsx`, `vitest`, `tsc -b --pretty`, pnpm workspaces, ES2023 target,
`strict` + `noUncheckedIndexedAccess`.

```
apps/web          Next.js — input box, streaming trace, verdict card, /v/[id] share pages
packages/engine   pipeline: interview → canonicalize → gather → extract → judge
packages/sources  SourceAdapter registry — hn, reddit, search, github, appstore, packages, trends
packages/rubric   4 signals → scores → verdict. Pure, deterministic, no LLM, fully tested.
packages/shared   zod schemas + shared types
packages/cli      `validate "<idea>"` and `seed <market>` — pipeline in the terminal
```

**Dependency direction** (strictly one-way, no cycles):

```
shared ← rubric
shared ← sources
shared, rubric, sources ← engine
engine ← cli
engine ← apps/web
```

`rubric` depends only on `shared`. It must never import `sources` or `engine` —
that constraint is what keeps it pure and testable, and it should be enforced in
review.

### Runtime and deployment

A live run is **one streaming HTTP request**. The Next.js route handler runs the
engine and writes `TraceEvent`s to the response as SSE; the CLI consumes the same
stream and pretty-prints it. No queue, no worker, no run table.

The constraint that shapes this: **Vercel's Hobby tier caps a function at 60
seconds**, and streaming does not evade the cap. So the gather stage takes a
wall-clock **deadline (~40s)**, propagated to every adapter. Adapters that have not
returned by the deadline are recorded as `timed_out` in the same array that already
feeds the confidence model (§7.2). The ceiling therefore never produces a crash —
it produces a lower-confidence verdict. This is §12's degradation philosophy
extended from *sources* to *time*, using the machinery that already exists.

| Concern | Decision |
|---|---|
| Host | Vercel Hobby — free; non-commercial use is within terms for a portfolio piece |
| Database | Neon free-tier Postgres (mirrors the `.neon` setup already in `vibe`) |
| Long runs | Deadline-bounded; degrade rather than exceed the cap |
| Tab closed mid-run | Run dies, work is lost. Accepted — pre-seeded dossiers are the primary demo path |
| Two users, same uncached market | Both runs execute independently. Accepted for v1 |
| Scheduled refresh | Hobby cron is 2 jobs/day — too thin. Refresh runs from the CLI instead |

Durable job execution — a `run` row, a background worker, store-backed trace replay,
and joining an in-flight run — is the correct answer and is deferred to v2, where it
is honest engineering depth rather than v1 scaffolding the demo does not need.

---

## 11. Pipeline stages (`packages/engine`)

Each stage emits typed trace events consumed by both the CLI (pretty-printed) and
the web UI (streamed to the browser).

### Stage 1 — Interview
3–4 clarifying questions, each offering tappable suggested answers generated from
the raw idea text. Produces a structured `IdeaSpec`:

```
IdeaSpec {
  problem: string          // the pain, in the user's words, sharpened
  payer: string            // who opens their wallet
  currentAlternative: string  // what they do today (incl. "nothing")
  costOfInaction: string   // what breaks if unsolved
  statedWedge?: string     // how the user thinks they're different
  keywords: string[]       // search terms derived for the gather stage
}
```

`statedWedge` is what rule 6a/6b tests against. `keywords` is what makes retrieval
accurate — and is the reason this stage exists at all.

### Stage 2 — Canonicalize
Embed the `IdeaSpec` **locally** (free — `fastembed` / `sentence-transformers`
class model), nearest-neighbour search against existing `market` rows above a
cosine threshold.

- **Hit** → reuse the existing dossier; only the user's specific twist is
  evaluated live. Near-instant, near-free.
- **Miss** → create a new market node and trigger a full gather.

This maps *"an app for dog walkers"*, *"Uber for dog walking"*, and *"a platform
connecting pet owners with walkers"* onto the same market node — which is what
makes the cache actually hit.

**The failure mode here is the dangerous one.** A threshold set too loose serves a
*neighbouring* market's dossier, producing a confidently wrong verdict backed by
real, clickable citations — strictly worse than an error page, and invisible to a
user who cannot audit it.

The answer is transparency, not perfect matching. Set the threshold **high**, then
**state the match in the UI** — *"matched to: **dog-walking marketplaces**"* — beside
a **"not my market"** control that forces a fresh gather. The system is then allowed
to be wrong, but never *silently* wrong. Log near-misses (scores just under the
threshold) to tune it against the seeded markets.

### Stage 3 — Gather

**Two waves, not one fan-out** — required by the per-competitor denominator in §6.1:

1. **Wave 1 — discovery.** Fan out across enabled adapters using the market terms
   from `IdeaSpec.keywords`. Yields competitors, obituaries and trend points.
2. **Wave 2 — attribution.** For each competitor discovered in wave 1, query the
   adapters *by that competitor's name*. Yields complaints and praise already
   attributed to a specific competitor, which is what makes `complaint_ratio(c)`
   computable and query-neutral.

Both waves run their adapters in parallel, each with its own rate limiter and
on-disk response cache. Wave 2 roughly doubles request volume — harmless against
keyless HN and GitHub, and a real constraint to revisit when `reddit` lands in v2.

The whole stage runs under a **wall-clock deadline** (§10). Record which adapters
succeeded, failed, were skipped, or **timed out** — all four feed the confidence
model identically.

### Stage 4 — Extract
Cheap model converts `RawItem[]` → structured `Evidence[]`, one batched call per
source. Evidence kinds:

- `complaint` — a specific grievance about an existing product, **attributed to a competitor**
- `praise` — a specific expression of satisfaction, likewise attributed. The
  denominator of §6.1, and the only way contentment is ever *observed* rather than guessed
- `competitor` — an existing product, with pricing/positioning if available
- `obituary` — a dead product, **with classified cause of death** (§6.2)
- `barrier` — a cited entry barrier with a cause (§6.4). The model quotes it; the rubric weighs it
- `trend_point` — a datum in a time series

The extraction call also emits one `market_shape` classification per dossier, which
the rubric maps to structural barriers (§6.4). Both are closed enums — the model
picks a label, never a number.

Then: embed and cluster complaints into themes; dedupe competitors by domain.

### Stage 5 — Judge
1. `packages/rubric` computes four sub-scores → verdict + confidence.
   **Deterministic. No model involved.**
2. One good-model call writes the grounded prose explanation of that verdict,
   receiving only distilled evidence with IDs.
3. Citation-enforcement pass drops any sentence without a resolvable
   `evidence.id`.
4. Persist a `validation` row → shareable permalink.

---

## 12. Source adapters

Every source implements one interface, so a new source costs ~80 lines:

```ts
interface SourceAdapter {
  id: string
  kind: 'complaints' | 'competitors' | 'graveyard' | 'trend'
  enabled(): boolean                          // missing key/config → silently skipped
  fetch(q: MarketQuery, signal: AbortSignal): Promise<RawItem[]>
  rateLimit: RateLimitPolicy
}
```

**Graceful degradation is the defining behaviour:** a failing, rate-limited or
**timed-out** source drops out of the run and *lowers the confidence score* — it
never throws past the registry. The `AbortSignal` carries the gather deadline
(§10), so slowness is just one more way a source degrades rather than a way the run
dies. This is what makes each additional adapter cheap and safe to add.

### Adapters — all free, no paid keys

**v1 ships two.** `hn` + `github` between them cover all four signals and require
zero API signups and zero OAuth: HN Algolia returns timestamps, so posts-per-month
yields a trajectory series without Trends, Reddit or npm; GitHub's archived repos
are obituaries. The remaining five raise *confidence*, which §7.2 already models as
a dial — so shipping two adapters at honest `medium` confidence is the degradation
design visibly working, not a compromise.

| Adapter | Ship | Source | Feeds | Notes |
|---|---|---|---|---|
| `hn` | **v1** | HN Algolia API | complaints, praise, competitors, trend | Free, unlimited, **no key required**. Best signal-to-noise. Build this one first. |
| `github` | **v1** | GitHub REST API (free) | competitors, graveyard | Competing OSS projects; **archived repos = obituaries**. No key needed at v1 volumes. |
| `reddit` | v2 | Official Reddit API (OAuth free tier) | complaints, praise, trend | The complaint gold mine. Also yields subreddit subscriber curves. First v2 adapter. |
| `search` | v2 | Free-tier search API (Brave / Serper class) | competitors, graveyard | Finds product pages and shutdown post-mortems |
| `appstore` | v2 | iTunes RSS + Play review feeds | complaints, praise | Free. 1–3 star reviews are the richest complaint source for consumer ideas. |
| `packages` | v2 | npm + PyPI download-stat endpoints | trend | Free, clean time series. Only meaningful for dev-tool ideas. |
| `trends` | v2 | Google Trends (unofficial lib) | trend | **Explicitly optional and degradable** — no official API, libs break often |

### Deliberately excluded from v1

| Source | Why |
|---|---|
| G2 / Capterra | Obvious complaint source, but scraping-hostile with real ToS risk |
| Crunchbase | Would nail the graveyard; genuinely expensive |
| X / Twitter | API cost is prohibitive post-2023 |
| LinkedIn / Indeed | Hostile to automated access |

Trajectory falls back to subreddit growth + package downloads + post frequency
when `trends` is unavailable — so the fragile adapter is never load-bearing.

---

## 13. Data model

SQLite locally; Postgres on a free tier when deployed. Schema is the same.

```
market
  id, slug, canonical_name, description, embedding, created_at

dossier
  id, market_id → market
  competitors_json, complaint_clusters_json, graveyard_json, trend_series_json
  gathered_at, adapters_succeeded[], adapters_failed[]

evidence
  id, dossier_id → dossier
  source          -- 'hn' | 'reddit' | 'search' | ...
  kind            -- 'complaint' | 'praise' | 'competitor'
                  -- | 'obituary' | 'barrier' | 'trend_point'
  competitor_id   -- set on complaint/praise; the per-competitor denominator (§6.1)
  url, quote, author, posted_at, retrieved_at
  meta_json       -- e.g. obituary cause_of_death, competitor pricing
                  -- EVERY rendered claim resolves to a row here

validation
  id, idea_text, idea_spec_json, market_id → market
  verdict, confidence, scores_json, wedge, prose, cited_evidence_ids[]
  created_at      -- backs the /v/[id] permalink
```

**`evidence` is the integrity backbone.** If a claim in the UI cannot resolve to
an `evidence.id` with a live URL, it does not render. That single constraint is
what makes the product's central promise enforceable rather than aspirational.

---

## 14. LLM usage and cost control

### Tiered model routing

| Tier | Model class | Used for | Share of tokens |
|---|---|---|---|
| **Cheap / free** | Gemini Flash, Groq, DeepSeek class | Interview questions, extraction, classification, clustering | ~90% |
| **Good** | One call per run | The verdict prose only, over already-distilled evidence | ~10% |

Local embeddings for canonicalization and clustering — **free**.

### Measured cost per run

| Stage | Work | Tokens |
|---|---|---|
| Interview / canonicalize | 3–4 short calls | ~6k |
| Extraction | ~20 sources summarized & classified | ~40k in |
| Verdict prose | one call over distilled evidence | ~10k in / 2k out |

- **All-cheap:** ~**$0.01 per validation** → 500 runs ≈ **$5**
- **Cheap extract + good verdict:** ~**$0.06 per run** → 500 runs ≈ **$30**
- **On free tiers** (Gemini free tier, Groq, OpenRouter free models):
  effectively **$0**, with rate limits a portfolio demo will never approach.

### Caching is the reliability layer

Not a moat play — a *demo-reliability* play. Pre-seed **~10 market dossiers** in v1
(expanding toward 25–30 as adapters land) offline via the CLI so a recruiter clicking at 2am gets an instant answer that
costs nothing and cannot be broken by a rate limit or a dead adapter. Live
research becomes the deliberate "watch it think" showpiece, rate-limited to a few
runs/day per IP.

---

## 15. Build sequencing

### v1 — the shippable demo

Ordered as a **walking skeleton**: something deployed and clickable at step 4, with
every later step replacing a fake with a real. The obvious ordering — plumbing
first, UI last — puts `apps/web` at step 8 of 9, meaning that at 70% done there is
nothing to show. That is precisely the abandonment risk §16 rates High, baked into
the schedule.

| # | Milestone | Notes |
|---|---|---|
| 1 | Monorepo scaffold | pnpm workspaces, `tsconfig.base.json`, vitest, tsx — copy the `vibe` setup verbatim |
| 2 | `packages/shared` | zod schemas: `IdeaSpec`, `Evidence`, `Dossier`, `Verdict`, and **`TraceEvent` as a first-class contract** — that last one is the seam that makes step 4 possible |
| 3 | **`packages/rubric`, test-first + eval harness** | The heart. No LLM, no I/O, no network, no API keys. The harness ships *here*, not in v2 — see below |
| 4 | **`apps/web` on fixtures — deployed** | Built against a recorded `TraceEvent` stream and a hand-written `Verdict`. One-box input, inline interview, streaming trace view, verdict card, `/v/[id]`. **Clickable and deployed at 50% done** |
| 5 | `packages/sources` + `hn` + `github` | Adapter interface, registry, rate limiter, cache, deadline handling. Two adapters cover all four signals with zero API signups |
| 6 | `packages/engine` | The five stages, emitting the real `TraceEvent` stream |
| 7 | `packages/cli` | `validate "<idea>"`, `seed <market>` — pre-seed ~10 demo dossiers |
| 8 | Wire web to live engine | Swap fixtures for the real stream; README with architecture diagram and a live verdict permalink |

**Why the eval harness moves into v1.** It cannot use real gathers anyway — nobody
can re-gather 2008 Reddit — so its cases were always going to be hand-written
`Evidence` fixtures asserted against `packages/rubric`. That makes it
dependency-free and buildable the moment the rubric exists. More importantly, it is
the *only* thing that can set `MIN_EVIDENCE`, `MIN_PRAISE` and `FEASIBILITY_FLOOR`;
without it, v1 ships a rubric that is reproducible but uncalibrated. ~15 cases is
enough to pin the thresholds. Leaving the project's most interview-valuable artifact
in a v2 that portfolio projects rarely reach is a poor trade.

**Why `TraceEvent` is a seam, not a detail.** Defined as a real schema at step 2, it
lets the UI be built against a recorded trace before `engine` exists. That decouples
the demo surface from the pipeline entirely, and surfaces *"the verdict card needs a
field the schema lacks"* while it is still a one-line change instead of a refactor.

### v2 — the engineering depth

- **The remaining five adapters**, in order of value: `reddit`, `search`,
  `appstore`, `packages`, `trends`. Each is independently shippable and simply
  raises confidence on markets already seeded.
- **Durable run execution** — a `run` row, a background worker, store-backed trace
  replay, and joining an in-flight run instead of duplicating it (§10). The correct
  answer to the runtime question, deferred so v1 needs no infra beyond Vercel + Neon.
- **Eval harness expanded to ~30 cases** — the v1 harness proves the rubric is
  calibrated; the expansion broadens coverage across market shapes and adds more
  true negatives from real graveyards.
- Semantic dedup of near-identical complaints and competitors across sources.
- Scheduled dossier refresh so cached markets don't rot.
- Observability — per-stage timing, token spend, adapter hit/failure rates,
  cache hit ratio.
- "Demand for the idea itself" — how many users asked about this market this
  month, a signal only this product can see.

---

## 16. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Project abandoned at 70% | High | **Resolved by sequencing.** Walking-skeleton order (§15) deploys a clickable artifact at step 4 of 8; every step after that swaps a fake for a real, so the project is demo-complete at every point past halfway |
| Adapter count stalls the project | High | **Resolved by scope.** v1 ships two keyless adapters, not seven. The other five are additive v2 work that only raises confidence |
| A confident wrong "no" damages credibility | High | R1/R2 guardrails (§7.3); `praise` evidence so contentment is observed rather than inferred from a thin gather (§6.1); eval harness **in v1**; honest `GO FIND OUT` |
| Wrong cache hit serves a neighbouring market's dossier | High | Disclosed match + "not my market" override (§11 Stage 2). The system may be wrong, never *silently* wrong |
| Live run exceeds the 60s Vercel Hobby cap | Medium | Deadline-bounded gather (§10); timed-out adapters degrade confidence instead of failing the run |
| LLM hallucinating competitors, or scoring a verdict | High | Rubric decides the verdict; *the model may classify and quote, only the rubric may count* (§8); citation-enforcement drops uncited sentences |
| Cache never hits (canonicalization too strict) | Medium | Tune the cosine threshold against the seeded markets; log near-misses |
| Wave-2 request volume grows with competitor count | Low | Harmless on keyless HN/GitHub; revisit when `reddit` lands in v2 |

---

## 17. Verification

- **`pnpm test`** — rubric unit tests are the gate. Coverage must include both
  interpretation rules explicitly: *contentment ⇒ no*, and *empty market ⇒ red
  flag*, plus each of the seven decision rules in §7.1.
- **The contentment / thin-gather discrimination test** — the assertion that proves
  §6.1's fix works. A thin-gather fixture must yield `GO FIND OUT`; a high-praise
  fixture must yield `DON'T BUILD IT`. *Same low complaint count, different
  verdicts.* If these ever collapse to the same answer, the strongest signal has
  silently reverted to measuring our own retrieval failure.
- **Eval harness (v1)** — ~15 historical cases. Airbnb 2008, Dropbox 2007 and Slack
  2013 must not come back `DON'T BUILD IT`; real graveyard cases must. Thresholds
  are tuned until this passes, then frozen.
- **`pnpm typecheck`** — `tsc -b` clean across all packages.
- **Adapter contract tests** — each adapter against a recorded fixture payload,
  plus a forced-failure case *and a forced-timeout case*, both asserting the run
  **degrades and lowers confidence rather than throwing**.
- **End-to-end via CLI** — `validate "an app for dog walkers"` produces a verdict
  in which every claim carries a resolvable URL.
- **Hallucination check** — automated assertion that no rendered sentence lacks a
  backing `evidence.id`.
- **Manual demo pass** — cold-load the deployed app; run one cached market (expect
  instant, with the matched market disclosed) and one uncached idea (expect a live
  streaming trace that finishes inside 60s or degrades honestly); open the resulting
  `/v/[id]` link in a fresh browser with no session.

---

## 18. Open questions (deferred, non-blocking)

1. **Name.** Working title is *Idea Reality Check*; directory `reality-check`.
   Worth a better one before the README is written.
2. **Beachhead** for launch marketing (§3) — a positioning decision, not an
   architectural one.
3. **Which ~10 markets to seed** — should skew toward ideas people actually submit
   (app ideas, SaaS, AI wrappers, marketplaces) so the cache hits often during a
   demo.
4. **Search API choice** — Brave vs. Serper vs. alternatives. Deferred with the
   `search` adapter itself to v2; decide on free-tier generosity at that point.
