import type { Dossier, Evidence, TraceEvent, Validation } from "@rc/shared";

/**
 * Sample data.
 *
 * `packages/engine` does not exist yet. Building the UI against a recorded
 * trace and a hand-written verdict is the point of step 4: it lets the demo
 * surface ship and get deployed before the pipeline is written, and it surfaces
 * "the verdict card needs a field the schema lacks" while that is still a
 * one-line change.
 *
 * Every page rendered from this module shows a visible sample-data badge. When
 * the engine lands, these objects are replaced by real ones and the badge goes
 * with them -- nothing else in the UI should need to change.
 */

const RETRIEVED = new Date("2026-08-20T09:14:00Z");
const ago = (days: number) => new Date(RETRIEVED.getTime() - days * 86_400_000);

let n = 0;
const id = () => `ev_${(++n).toString().padStart(3, "0")}`;

// ---------------------------------------------------------------------------
// Scenario one: a dog-walking app. Real market, real anger, wrong wedge.
// ---------------------------------------------------------------------------

const dogEvidence: Evidence[] = [
  {
    id: id(),
    kind: "competitor",
    source: "search",
    competitorId: "rover",
    name: "Rover",
    domain: "rover.com",
    pricing: "20% commission on every booking",
    url: "https://example.com/sample/rover",
    quote: "Rover takes a 20% cut of what the owner pays for each walk.",
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "competitor",
    source: "search",
    competitorId: "wag",
    name: "Wag",
    domain: "wagwalking.com",
    url: "https://example.com/sample/wag",
    quote: "Wag matches on-demand walkers within a 30 minute window.",
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "competitor",
    source: "search",
    competitorId: "fetch",
    name: "Fetch",
    domain: "fetchpetcare.com",
    url: "https://example.com/sample/fetch",
    quote: "Fetch operates through local franchise offices rather than an app.",
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "complaint",
    source: "reddit",
    competitorId: "rover",
    theme: "walker vetting is shallow",
    quote:
      "The background check is a joke. My walker had never handled a reactive dog and nothing in the profile said so.",
    url: "https://example.com/sample/r-dogs-1",
    author: "u/sample_owner",
    postedAt: ago(41),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "complaint",
    source: "reddit",
    competitorId: "wag",
    theme: "walker vetting is shallow",
    quote:
      "Third walker in a month who clearly had not read that my dog cannot be off leash. There is no real screening.",
    url: "https://example.com/sample/r-dogs-2",
    author: "u/sample_owner_2",
    postedAt: ago(63),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "complaint",
    source: "appstore",
    competitorId: "wag",
    theme: "walker vetting is shallow",
    quote: "Two stars. You have no idea who is actually turning up at your door.",
    url: "https://example.com/sample/appstore-wag-1",
    postedAt: ago(22),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "complaint",
    source: "hn",
    competitorId: "rover",
    theme: "commission is punishing for walkers",
    quote:
      "Twenty percent off the top means the good walkers leave for private clients within about six months.",
    url: "https://example.com/sample/hn-1",
    postedAt: ago(88),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "complaint",
    source: "reddit",
    competitorId: "wag",
    theme: "commission is punishing for walkers",
    quote: "After the cut and the insurance deduction I clear less than minimum wage per walk.",
    url: "https://example.com/sample/r-walkers-1",
    postedAt: ago(35),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "complaint",
    source: "appstore",
    competitorId: "rover",
    theme: "support is unreachable when something goes wrong",
    quote: "My dog was injured on a walk and it took nine days to reach a human being.",
    url: "https://example.com/sample/appstore-rover-1",
    postedAt: ago(15),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "praise",
    source: "appstore",
    competitorId: "rover",
    theme: "booking is easy",
    quote: "Booking takes about fifteen seconds and the same walker shows up every week.",
    url: "https://example.com/sample/appstore-rover-2",
    postedAt: ago(27),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "praise",
    source: "reddit",
    competitorId: "rover",
    theme: "booking is easy",
    quote: "Honestly Rover has been fine for us for three years. Photos every walk, no drama.",
    url: "https://example.com/sample/r-dogs-3",
    postedAt: ago(52),
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "obituary",
    source: "search",
    name: "Swifto",
    causeOfDeath: "execution",
    diedAt: new Date("2019-04-01"),
    quote: "Swifto wound down after failing to expand beyond Manhattan.",
    url: "https://example.com/sample/swifto",
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "obituary",
    source: "github",
    name: "walkies-api",
    causeOfDeath: "founder_quit",
    diedAt: new Date("2021-10-01"),
    quote: "Repository archived by the owner. No longer maintained.",
    url: "https://example.com/sample/walkies-api",
    retrievedAt: RETRIEVED,
  },
  {
    id: id(),
    kind: "barrier",
    source: "search",
    barrier: "network_effects",
    quote:
      "Liquidity is local: a walker marketplace is useless until it has both sides inside the same few postcodes.",
    url: "https://example.com/sample/marketplace-liquidity",
    postedAt: ago(210),
    retrievedAt: RETRIEVED,
  },
  ...[
    ["2024-09-01", 100],
    ["2024-12-01", 112],
    ["2025-03-01", 126],
    ["2025-06-01", 131],
    ["2025-12-01", 148],
    ["2026-06-01", 162],
  ].map(([at, value]) => ({
    id: id(),
    kind: "trend_point" as const,
    source: "reddit" as const,
    series: "r/dogs subscribers (thousands)",
    at: new Date(at as string),
    value: value as number,
    quote: `Subscriber count at ${at as string}`,
    url: "https://example.com/sample/subscriber-series",
    retrievedAt: RETRIEVED,
  })),
];

export const DOG_DOSSIER: Dossier = {
  id: "dos_dogwalking",
  marketId: "mkt_dogwalking",
  marketShape: "two_sided_marketplace",
  competitors: [
    { id: "rover", name: "Rover", domain: "rover.com", pricing: "20% commission" },
    { id: "wag", name: "Wag", domain: "wagwalking.com" },
    { id: "fetch", name: "Fetch", domain: "fetchpetcare.com" },
  ],
  complaintClusters: [
    {
      theme: "walker vetting is shallow",
      evidenceIds: ["ev_004", "ev_005", "ev_006"],
      competitorIds: ["rover", "wag"],
    },
    {
      theme: "commission is punishing for walkers",
      evidenceIds: ["ev_007", "ev_008"],
      competitorIds: ["rover", "wag"],
    },
    {
      theme: "support is unreachable when something goes wrong",
      evidenceIds: ["ev_009"],
      competitorIds: ["rover"],
    },
  ],
  evidence: dogEvidence,
  gatheredAt: RETRIEVED,
  adapterStatuses: { hn: "ok", github: "ok", reddit: "ok", appstore: "ok", search: "timed_out" },
};

export const DOG_VALIDATION: Validation = {
  id: "dogwalking-trust",
  ideaText: "an app for dog walkers",
  ideaSpec: {
    problem: "Owners cannot tell whether a walker is competent until something goes wrong.",
    payer: "Dog owners in dense cities, paying per walk.",
    currentAlternative: "Rover or Wag, or a neighbour they already know.",
    costOfInaction: "They keep using a service they do not trust, or stop using one at all.",
    statedWedge: "a cleaner app with better scheduling",
    keywords: ["dog walking app", "Rover", "Wag", "dog walker marketplace"],
  },
  marketId: "mkt_dogwalking",
  verdict: "BUILD_IT_DIFFERENTLY",
  confidence: {
    band: "medium",
    adaptersAttempted: 5,
    adaptersReturned: 4,
    adapterStatuses: { hn: "ok", github: "ok", reddit: "ok", appstore: "ok", search: "timed_out" },
    evidenceCount: dogEvidence.length,
    medianRecencyDays: 41,
    crossSourceAgreement: 0.67,
  },
  scores: {
    complaintRatio: 0.71,
    praiseVolume: 5.2,
    evidenceVolume: dogEvidence.length,
    graveyard: -4,
    trajectory: 0.34,
    feasibility: 75,
    competitorCount: 3,
    recentDemandSideDeaths: 0,
    demandSignal: 14,
    wedgeMatchesTopCluster: false,
  },
  firedRule: 6,
  wedge: "Vet the walkers, not the interface.",
  prose:
    "Owners are not short of dog-walking apps and they are not asking for a nicer one. What they complain about, across both Rover and Wag, is that they cannot tell who is turning up at their door [ev_004] [ev_005] [ev_006]. Walkers complain about the other end of the same trade: a twenty percent cut that pushes the competent ones into private arrangements within months [ev_007] [ev_008]. Your stated angle is scheduling and a cleaner interface, and nobody in this evidence is unhappy about either -- booking is one of the few things people actively praise [ev_010] [ev_011]. The market is growing rather than shrinking, and nothing here died for lack of demand, so this is a real opening entered from the wrong side. Build the vetting, not the app.",
  citedEvidenceIds: ["ev_004", "ev_005", "ev_006", "ev_007", "ev_008", "ev_010", "ev_011"],
  createdAt: RETRIEVED,
};

// ---------------------------------------------------------------------------
// Scenario two: the honest no. A solved problem whose users are content.
// ---------------------------------------------------------------------------

const shortenerEvidence: Evidence[] = [
  {
    id: "sh_001",
    kind: "competitor",
    source: "search",
    competitorId: "bitly",
    name: "Bitly",
    domain: "bitly.com",
    url: "https://example.com/sample/bitly",
    quote: "Bitly has offered link shortening and analytics since 2008.",
    retrievedAt: RETRIEVED,
  },
  {
    id: "sh_002",
    kind: "praise",
    source: "hn",
    competitorId: "bitly",
    theme: "it just works",
    quote: "Bitly has never once failed me in fifteen years. What exactly would you improve?",
    url: "https://example.com/sample/hn-shortener-1",
    postedAt: ago(74),
    retrievedAt: RETRIEVED,
  },
  {
    id: "sh_003",
    kind: "praise",
    source: "reddit",
    competitorId: "tinyurl",
    theme: "it just works",
    quote: "TinyURL still works, still free, still no account needed. Solved problem.",
    url: "https://example.com/sample/r-shortener-1",
    postedAt: ago(120),
    retrievedAt: RETRIEVED,
  },
  {
    id: "sh_004",
    kind: "complaint",
    source: "hn",
    competitorId: "bitly",
    theme: "pricing tiers",
    quote: "The free tier got worse. Custom domains behind a paywall now.",
    url: "https://example.com/sample/hn-shortener-2",
    postedAt: ago(58),
    retrievedAt: RETRIEVED,
  },
];

export const SHORTENER_VALIDATION: Validation = {
  id: "url-shortener",
  ideaText: "a link shortener with a nicer dashboard",
  ideaSpec: {
    problem: "Existing shorteners have cluttered dashboards.",
    payer: "Marketers running campaigns.",
    currentAlternative: "Bitly, or the free tier of whatever came up first.",
    costOfInaction: "Nothing much. They keep using Bitly.",
    statedWedge: "a cleaner dashboard",
    keywords: ["link shortener", "bitly alternative", "url shortener"],
  },
  marketId: "mkt_shortener",
  verdict: "DONT_BUILD_IT",
  confidence: {
    band: "high",
    adaptersAttempted: 4,
    adaptersReturned: 4,
    adapterStatuses: { hn: "ok", github: "ok", reddit: "ok", search: "ok" },
    evidenceCount: 46,
    medianRecencyDays: 74,
    crossSourceAgreement: 0.8,
  },
  scores: {
    complaintRatio: 0.14,
    praiseVolume: 21.4,
    evidenceVolume: 46,
    graveyard: -2,
    trajectory: -0.05,
    feasibility: 100,
    competitorCount: 5,
    recentDemandSideDeaths: 0,
    demandSignal: 38,
    wedgeMatchesTopCluster: false,
  },
  firedRule: 4,
  wedge: "Nothing here. The adjacent opening is link management inside a CRM, not shortening.",
  prose:
    "Five products already do this and the people using them are not unhappy. The overwhelming sentiment is that the problem is finished: Bitly has not failed anyone in fifteen years [sh_002], and TinyURL still works without an account [sh_003]. The only recurring grievance is that free tiers have narrowed [sh_004], which is a pricing complaint rather than a product one, and it is not something a new entrant can undercut for long. Interest is flat to slightly declining. A cleaner dashboard is not a reason to switch away from a link that already works.",
  citedEvidenceIds: ["sh_002", "sh_003", "sh_004"],
  createdAt: RETRIEVED,
};

export const SHORTENER_DOSSIER: Dossier = {
  id: "dos_shortener",
  marketId: "mkt_shortener",
  marketShape: "single_player_saas",
  competitors: [
    { id: "bitly", name: "Bitly", domain: "bitly.com" },
    { id: "tinyurl", name: "TinyURL", domain: "tinyurl.com" },
  ],
  complaintClusters: [
    { theme: "pricing tiers", evidenceIds: ["sh_004"], competitorIds: ["bitly"] },
  ],
  evidence: shortenerEvidence,
  gatheredAt: RETRIEVED,
  adapterStatuses: { hn: "ok", github: "ok", reddit: "ok", search: "ok" },
};

// ---------------------------------------------------------------------------

export const SAMPLES: Record<string, { validation: Validation; dossier: Dossier }> = {
  [DOG_VALIDATION.id]: { validation: DOG_VALIDATION, dossier: DOG_DOSSIER },
  [SHORTENER_VALIDATION.id]: { validation: SHORTENER_VALIDATION, dossier: SHORTENER_DOSSIER },
};

/**
 * A recorded run. The engine will emit this same shape live; until then the
 * API route replays it with the original gaps between events, which is what
 * makes the streaming view real to build against rather than guessed at.
 */
const t0 = new Date("2026-08-20T09:13:31Z").getTime();
const at = (ms: number) => new Date(t0 + ms);

export const DEMO_TRACE: TraceEvent[] = [
  { type: "stage_start", stage: "interview", at: at(0) },
  { type: "note", at: at(120), text: "Sharpening the idea into something searchable" },
  { type: "stage_end", stage: "interview", at: at(900), ms: 900 },

  { type: "stage_start", stage: "canonicalize", at: at(950) },
  { type: "note", at: at(1100), text: "Embedding locally, no model call" },
  {
    type: "market_matched",
    at: at(1600),
    marketId: "mkt_dogwalking",
    name: "dog-walking marketplaces",
    similarity: 0.89,
    fresh: true,
  },
  { type: "stage_end", stage: "canonicalize", at: at(1700), ms: 750 },

  { type: "stage_start", stage: "gather", at: at(1750) },
  { type: "note", at: at(1800), text: "Wave 1 - finding who already does this" },
  { type: "adapter_result", at: at(3100), adapter: "hn", status: "ok", wave: 1, items: 47, ms: 1310 },
  { type: "adapter_result", at: at(3600), adapter: "github", status: "ok", wave: 1, items: 12, ms: 1820 },
  { type: "note", at: at(3700), text: "3 competitors found: Rover, Wag, Fetch" },
  { type: "note", at: at(3800), text: "Wave 2 - asking what people say about each of them" },
  { type: "adapter_result", at: at(6200), adapter: "hn", status: "ok", wave: 2, items: 88, ms: 2400 },
  {
    type: "adapter_result",
    at: at(9400),
    adapter: "github",
    status: "timed_out",
    wave: 2,
    items: 0,
    ms: 5600,
  },
  {
    type: "degraded",
    at: at(9450),
    stage: "gather",
    reason: "github timed out on wave 2, confidence lowered",
  },
  { type: "stage_end", stage: "gather", at: at(9500), ms: 7750 },

  { type: "stage_start", stage: "extract", at: at(9550) },
  { type: "note", at: at(11200), text: "9 complaints, 2 pieces of praise, 2 shutdowns" },
  { type: "note", at: at(12400), text: "Clustered into 3 recurring themes" },
  { type: "stage_end", stage: "extract", at: at(12500), ms: 2950 },

  { type: "stage_start", stage: "judge", at: at(12550) },
  { type: "note", at: at(12700), text: "Scoring - no model involved in this step" },
  { type: "note", at: at(13400), text: "Writing the explanation, dropping uncited sentences" },
  { type: "stage_end", stage: "judge", at: at(14800), ms: 2250 },

  {
    type: "verdict",
    at: at(14850),
    validationId: DOG_VALIDATION.id,
    verdict: DOG_VALIDATION.verdict,
  },
];
