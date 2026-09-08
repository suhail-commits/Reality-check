/**
 * Every threshold the decision rules read. They live in one file because the
 * eval harness is what calibrates them: when a historical case comes back wrong,
 * this is the only file that should need to move.
 *
 * Nothing here is a guess that survived. Each value is pinned by the cases in
 * `src/evals` -- change one and run `pnpm evals`.
 */

/** Below this many evidence rows, no verdict is honest. Rule 1. */
export const MIN_EVIDENCE = 12;

/**
 * Praise required before `DON'T BUILD IT` may be justified by contentment.
 * Load-bearing: without it, rule 4 fires on the *absence* of complaints, which
 * a thin or timed-out gather produces just as readily as a happy market.
 */
export const MIN_PRAISE = 4;

/** Below this, entry is not realistic for a small team. Rule 5. */
export const FEASIBILITY_FLOOR = 35;

/** Below this, barriers are absolute rather than merely steep. Rule 5. */
export const FEASIBILITY_ABSOLUTE = 15;

/** Users are angry enough that the gap is real. Rule 6. */
export const COMPLAINT_RATIO_HIGH = 0.55;

/** Users are content. Only meaningful alongside MIN_PRAISE. Rule 4. */
export const COMPLAINT_RATIO_LOW = 0.3;

/** Normalised slope at or below this counts as not growing. Rules 4 and 6. */
export const TRAJECTORY_FLAT = 0;

/** A market with no talk at all. Rule 2. */
export const DEMAND_SIGNAL_FLOOR = 3;

/** Demand-side deaths at or above this are a wall. Rule 3. */
export const FATAL_DEATH_COUNT = 2;

/** How long a death still counts against the market. */
export const DEATH_RECENCY_MONTHS = 60;

/** Complaint evidence half-life. Older grievances may already be fixed. */
export const RECENCY_HALF_LIFE_MONTHS = 24;

/**
 * Evidence rows a complaint cluster needs before the opening it implies counts
 * as strong rather than thin. Below this the redirect is still reported -- the
 * product always shows you where to aim -- but it is labelled as thin so the
 * reader knows how much weight it carries.
 */
export const STRONG_REDIRECT_MIN_EVIDENCE = 3;

/** A theme recurring across this many competitors is a category-level failure. */
export const RECURRENCE_MIN_COMPETITORS = 2;
export const RECURRENCE_BONUS = 1.5;

/**
 * Review sites carry more weight than forums, which carry more than search
 * snippets. A one-star app review is a user who bothered; a search snippet is
 * a machine's guess at relevance.
 */
export const SOURCE_WEIGHT = {
  appstore: 1,
  reddit: 0.8,
  hn: 0.7,
  github: 0.6,
  search: 0.5,
  packages: 0.5,
  trends: 0.5,
} as const;

/** Severity of each barrier, 0-3, as in the design doc's checklist. */
export const BARRIER_SEVERITY = {
  capital_intensity: 3,
  regulatory_burden: 3,
  network_effects: 2,
  data_moat: 2,
  distribution_lock: 2,
  switching_costs: 1,
} as const;

/**
 * The barrier load at which entry stops being possible for a small team.
 *
 * Deliberately NOT the sum of every severity (13). No real market carries all
 * six barriers at once, so normalising against that total made every plausible
 * combination look mild: a consumer bank -- capital intensity, regulatory
 * burden and switching costs -- scored 46 feasibility and sailed past the floor
 * into BUILD IT. Two maximum-severity barriers plus a minor one is impassable,
 * and that is what this number says.
 *
 * Found by the "consumer neobank from two people, 2024" eval case.
 */
export const IMPASSABLE_BARRIER_LOAD = 8;

/** Confidence bands. Coverage is adapters that returned over adapters tried. */
export const HIGH_COVERAGE = 0.8;
export const HIGH_EVIDENCE = 40;
export const HIGH_RECENCY_DAYS = 365;
export const HIGH_AGREEMENT = 0.5;
export const MEDIUM_COVERAGE = 0.5;

/** Deaths decay more slowly than grievances; a market can stay burned. */
export const DEATH_HALF_LIFE_MONTHS = 36;
