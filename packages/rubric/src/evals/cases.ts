import type { Verdict } from "@rc/shared";
import { competitor, competitorRow, obituary, talk, trendPoint } from "../fixtures.js";
import type { RubricInput } from "../types.js";

/**
 * The calibration corpus.
 *
 * Every threshold in `constants.ts` is pinned by these cases. They are
 * hand-written rather than gathered because nobody can re-gather 2008 Reddit --
 * which is exactly why the harness has no dependency on adapters, the network,
 * or an API key, and why it ships in v1 rather than waiting for v2.
 *
 * The cases are not here to prove the tool is clever. They are here to prove it
 * would not have told Airbnb no.
 */

export interface EvalCase {
  name: string;
  /** What the market actually looked like at the time. */
  asOf: Date;
  /** What really happened, so a failing case can be argued with. */
  outcome: string;
  input: RubricInput;
  /** Exact verdict required, when the case is unambiguous. */
  expect?: Verdict;
  /** Verdicts the case must never produce. Used where several are defensible. */
  reject?: Verdict[];
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/** Monthly points ending one month before `asOf`. */
function series(name: string, values: number[], asOf: Date) {
  return values.map((v, i) =>
    trendPoint(name, new Date(asOf.getTime() - (values.length - i) * MS_PER_MONTH), v),
  );
}

const growing = (n: string, asOf: Date) => series(n, [100, 130, 165, 205, 250], asOf);
const flat = (n: string, asOf: Date) => series(n, [100, 101, 99, 100, 100], asOf);
const shrinking = (n: string, asOf: Date) => series(n, [250, 210, 175, 140, 100], asOf);

function monthsBefore(asOf: Date, months: number): Date {
  return new Date(asOf.getTime() - months * MS_PER_MONTH);
}

const bothV1 = { hn: "ok", github: "ok" } as const;

export const CASES: EvalCase[] = [
  // ---------------------------------------------------------------------------
  // The ones a naive "competitors exist, therefore no" tool gets wrong.
  // ---------------------------------------------------------------------------
  {
    name: "Airbnb, 2008",
    asOf: new Date("2008-06-01"),
    outcome: "Couchsurfing, Craigslist and VRBO all existed. The complaint was trust.",
    expect: "BUILD_IT",
    input: {
      now: new Date("2008-06-01"),
      marketShape: "two_sided_marketplace",
      adapterStatuses: bothV1,
      statedWedge: "make trust between strangers work with profiles and reviews",
      competitors: [
        competitor("couchsurfing"),
        competitor("craigslist"),
        competitor("vrbo"),
        competitor("hostels"),
      ],
      evidence: [
        ...talk("couchsurfing", { complaints: 8, theme: "trust and safety" }, new Date("2008-06-01")),
        ...talk("craigslist", { complaints: 7, theme: "trust and safety" }, new Date("2008-06-01")),
        ...talk("vrbo", { complaints: 4, theme: "booking is a phone call" }, new Date("2008-06-01")),
        ...talk("couchsurfing", { praise: 4 }, new Date("2008-06-01")),
        competitorRow("couchsurfing", "CouchSurfing"),
        competitorRow("craigslist", "Craigslist"),
        competitorRow("vrbo", "VRBO"),
        ...growing("travel-forum-posts", new Date("2008-06-01")),
      ],
    },
  },
  {
    name: "Dropbox, 2007",
    asOf: new Date("2007-04-01"),
    outcome: "rsync, FolderShare, box.net and Xdrive existed. None of them just worked.",
    expect: "BUILD_IT",
    input: {
      now: new Date("2007-04-01"),
      marketShape: "single_player_saas",
      adapterStatuses: bothV1,
      statedWedge: "sync that works without the user thinking about it",
      competitors: [
        competitor("foldershare"),
        competitor("boxnet"),
        competitor("xdrive"),
        competitor("rsync"),
      ],
      evidence: [
        ...talk("foldershare", { complaints: 7, theme: "sync silently breaks" }, new Date("2007-04-01")),
        ...talk("boxnet", { complaints: 6, theme: "sync silently breaks" }, new Date("2007-04-01")),
        ...talk("xdrive", { complaints: 5, theme: "sync silently breaks" }, new Date("2007-04-01")),
        ...talk("rsync", { praise: 3 }, new Date("2007-04-01")),
        competitorRow("foldershare", "FolderShare"),
        competitorRow("boxnet", "box.net"),
        ...growing("backup-posts", new Date("2007-04-01")),
      ],
    },
  },
  {
    name: "Slack, 2013",
    asOf: new Date("2013-06-01"),
    outcome: "HipChat, Campfire and IRC existed. Nobody could find anything said last week.",
    expect: "BUILD_IT",
    input: {
      now: new Date("2013-06-01"),
      marketShape: "single_player_saas",
      adapterStatuses: bothV1,
      statedWedge: "searchable history across every conversation",
      competitors: [
        competitor("hipchat"),
        competitor("campfire"),
        competitor("irc"),
        competitor("skype"),
      ],
      evidence: [
        ...talk("hipchat", { complaints: 7, theme: "search and history" }, new Date("2013-06-01")),
        ...talk("campfire", { complaints: 6, theme: "search and history" }, new Date("2013-06-01")),
        ...talk("irc", { complaints: 5, theme: "search and history" }, new Date("2013-06-01")),
        ...talk("hipchat", { praise: 5 }, new Date("2013-06-01")),
        competitorRow("hipchat", "HipChat"),
        competitorRow("campfire", "Campfire"),
        ...growing("team-chat-posts", new Date("2013-06-01")),
      ],
    },
  },
  {
    name: "Stripe, 2010",
    asOf: new Date("2010-06-01"),
    outcome: "PayPal and Authorize.net owned payments. Developers loathed integrating them.",
    reject: ["DONT_BUILD_IT"],
    input: {
      now: new Date("2010-06-01"),
      marketShape: "regulated_service",
      adapterStatuses: bothV1,
      statedWedge: "integration in a few lines of code, no merchant account",
      competitors: [competitor("paypal"), competitor("authorizenet"), competitor("braintree")],
      evidence: [
        ...talk("paypal", { complaints: 9, theme: "integration is a nightmare" }, new Date("2010-06-01")),
        ...talk("authorizenet", { complaints: 8, theme: "integration is a nightmare" }, new Date("2010-06-01")),
        ...talk("paypal", { praise: 4 }, new Date("2010-06-01")),
        competitorRow("paypal", "PayPal"),
        competitorRow("authorizenet", "Authorize.net"),
        ...growing("payments-posts", new Date("2010-06-01")),
      ],
    },
  },
  {
    name: "Figma, 2012",
    asOf: new Date("2012-06-01"),
    outcome: "Photoshop and Sketch were entrenched. Collaboration and handoff were the pain.",
    expect: "BUILD_IT",
    input: {
      now: new Date("2012-06-01"),
      marketShape: "single_player_saas",
      adapterStatuses: bothV1,
      statedWedge: "real-time collaboration in the browser",
      competitors: [competitor("photoshop"), competitor("sketch"), competitor("invision")],
      evidence: [
        ...talk("photoshop", { complaints: 8, theme: "collaboration and handoff" }, new Date("2012-06-01")),
        ...talk("sketch", { complaints: 7, theme: "collaboration and handoff" }, new Date("2012-06-01")),
        ...talk("sketch", { praise: 5 }, new Date("2012-06-01")),
        competitorRow("sketch", "Sketch"),
        competitorRow("invision", "InVision"),
        ...growing("design-tool-posts", new Date("2012-06-01")),
      ],
    },
  },
  {
    name: "Email clients, 2024 (a graveyard of acquisitions)",
    asOf: new Date("2024-06-01"),
    outcome: "Sparrow and Mailbox were acquired, not rejected. Users remain furious at Gmail.",
    reject: ["DONT_BUILD_IT"],
    input: {
      now: new Date("2024-06-01"),
      marketShape: "single_player_saas",
      adapterStatuses: bothV1,
      statedWedge: "triage that actually reaches inbox zero",
      competitors: [competitor("gmail"), competitor("outlook"), competitor("superhuman")],
      evidence: [
        ...talk("gmail", { complaints: 9, theme: "triage is manual" }, new Date("2024-06-01")),
        ...talk("outlook", { complaints: 7, theme: "triage is manual" }, new Date("2024-06-01")),
        ...talk("superhuman", { praise: 4 }, new Date("2024-06-01")),
        obituary("Sparrow", "acquired", { diedAt: monthsBefore(new Date("2024-06-01"), 30) }),
        obituary("Mailbox", "acquired", { diedAt: monthsBefore(new Date("2024-06-01"), 40) }),
        obituary("Astro", "acquired", { diedAt: monthsBefore(new Date("2024-06-01"), 36) }),
        competitorRow("gmail", "Gmail"),
        ...flat("email-posts", new Date("2024-06-01")),
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // True negatives. A tool that never says no is a tool nobody needs.
  // ---------------------------------------------------------------------------
  {
    name: "Another URL shortener, 2024",
    asOf: new Date("2024-06-01"),
    outcome: "Solved. Bitly works, everyone is fine, nothing is growing.",
    expect: "DONT_BUILD_IT",
    input: {
      now: new Date("2024-06-01"),
      marketShape: "single_player_saas",
      adapterStatuses: bothV1,
      statedWedge: "a cleaner dashboard",
      competitors: [
        competitor("bitly"),
        competitor("tinyurl"),
        competitor("shortio"),
        competitor("rebrandly"),
      ],
      evidence: [
        ...talk("bitly", { praise: 11 }, new Date("2024-06-01")),
        ...talk("tinyurl", { praise: 9 }, new Date("2024-06-01")),
        ...talk("shortio", { praise: 7 }, new Date("2024-06-01")),
        ...talk("bitly", { complaints: 2, theme: "pricing tiers" }, new Date("2024-06-01")),
        competitorRow("bitly", "Bitly"),
        ...flat("shortener-posts", new Date("2024-06-01")),
      ],
    },
  },
  {
    name: "Yet another to-do app, 2024",
    asOf: new Date("2024-06-01"),
    outcome: "The most crowded category on earth, and its users are content.",
    expect: "DONT_BUILD_IT",
    input: {
      now: new Date("2024-06-01"),
      marketShape: "consumer_app",
      adapterStatuses: bothV1,
      statedWedge: "a nicer design",
      competitors: [
        competitor("todoist"),
        competitor("things"),
        competitor("ticktick"),
        competitor("reminders"),
        competitor("notion"),
      ],
      evidence: [
        ...talk("todoist", { praise: 12 }, new Date("2024-06-01")),
        ...talk("things", { praise: 10 }, new Date("2024-06-01")),
        ...talk("ticktick", { praise: 8 }, new Date("2024-06-01")),
        ...talk("todoist", { complaints: 3, theme: "sync latency" }, new Date("2024-06-01")),
        competitorRow("todoist", "Todoist"),
        ...flat("todo-posts", new Date("2024-06-01")),
      ],
    },
  },
  {
    name: "Online grocery delivery, 2002",
    asOf: new Date("2002-01-01"),
    outcome: "Webvan burned 1.2bn and died. The unit economics did not work in 2002.",
    expect: "DONT_BUILD_IT",
    input: {
      now: new Date("2002-01-01"),
      marketShape: "two_sided_marketplace",
      adapterStatuses: bothV1,
      statedWedge: "same-day delivery in cities",
      competitors: [competitor("peapod")],
      evidence: [
        obituary("Webvan", "unit_economics", { diedAt: monthsBefore(new Date("2002-01-01"), 6) }),
        obituary("HomeGrocer", "unit_economics", { diedAt: monthsBefore(new Date("2002-01-01"), 18) }),
        obituary("Kozmo", "no_demand", { diedAt: monthsBefore(new Date("2002-01-01"), 9) }),
        ...talk("peapod", { complaints: 5, theme: "delivery windows" }, new Date("2002-01-01")),
        ...talk("peapod", { praise: 3 }, new Date("2002-01-01")),
        competitorRow("peapod", "Peapod"),
        ...shrinking("grocery-posts", new Date("2002-01-01")),
      ],
    },
  },
  {
    name: "Consumer QR payments in the US, 2016",
    asOf: new Date("2016-06-01"),
    outcome: "US consumers did not want it. Several tried; all of them died of no demand.",
    expect: "DONT_BUILD_IT",
    input: {
      now: new Date("2016-06-01"),
      marketShape: "consumer_app",
      adapterStatuses: bothV1,
      statedWedge: "pay by scanning a code",
      competitors: [competitor("applepay")],
      evidence: [
        obituary("Softcard", "no_demand", { diedAt: monthsBefore(new Date("2016-06-01"), 14) }),
        obituary("CurrentC", "no_demand", { diedAt: monthsBefore(new Date("2016-06-01"), 8) }),
        ...talk("applepay", { complaints: 4, theme: "acceptance" }, new Date("2016-06-01")),
        ...talk("applepay", { praise: 6 }, new Date("2016-06-01")),
        competitorRow("applepay", "Apple Pay"),
        ...flat("qr-payment-posts", new Date("2016-06-01")),
      ],
    },
  },
  {
    name: "A social network for pets, 2015",
    asOf: new Date("2015-06-01"),
    outcome: "Repeatedly attempted, never wanted. Nobody was asking for it.",
    expect: "DONT_BUILD_IT",
    input: {
      now: new Date("2015-06-01"),
      marketShape: "consumer_app",
      adapterStatuses: bothV1,
      competitors: [],
      evidence: [
        obituary("Petster", "execution", { diedAt: monthsBefore(new Date("2015-06-01"), 20) }),
        obituary("Dogbook", "founder_quit", { diedAt: monthsBefore(new Date("2015-06-01"), 30) }),
        obituary("Catmoji", "execution", { diedAt: monthsBefore(new Date("2015-06-01"), 12) }),
        obituary("YummyPets", "ran_out_of_runway", { diedAt: monthsBefore(new Date("2015-06-01"), 15) }),
        obituary("Petzbe", "execution", { diedAt: monthsBefore(new Date("2015-06-01"), 24) }),
        obituary("Klooff", "no_demand", { diedAt: monthsBefore(new Date("2015-06-01"), 26) }),
        obituary("MyPetLoves", "founder_quit", { diedAt: monthsBefore(new Date("2015-06-01"), 33) }),
        obituary("PetPop", "execution", { diedAt: monthsBefore(new Date("2015-06-01"), 18) }),
        obituary("Woofound", "pivoted_away", { diedAt: monthsBefore(new Date("2015-06-01"), 28) }),
        obituary("Fuzzster", "execution", { diedAt: monthsBefore(new Date("2015-06-01"), 22) }),
        obituary("PetSocial", "ran_out_of_runway", { diedAt: monthsBefore(new Date("2015-06-01"), 16) }),
        obituary("Barkley", "execution", { diedAt: monthsBefore(new Date("2015-06-01"), 19) }),
      ],
    },
  },
  {
    name: "Competing with Uber head-on, 2019",
    asOf: new Date("2019-06-01"),
    outcome: "Riders complain constantly, and none of it is reachable by a small team.",
    expect: "DONT_BUILD_IT",
    input: {
      now: new Date("2019-06-01"),
      marketShape: "two_sided_marketplace",
      adapterStatuses: bothV1,
      statedWedge: "fairer pay for drivers",
      competitors: [competitor("uber"), competitor("lyft"), competitor("taxi")],
      evidence: [
        ...talk("uber", { complaints: 10, theme: "driver pay" }, new Date("2019-06-01")),
        ...talk("lyft", { complaints: 8, theme: "driver pay" }, new Date("2019-06-01")),
        ...talk("uber", { praise: 4 }, new Date("2019-06-01")),
        { ...competitorRow("uber", "Uber") },
        ...growing("rideshare-posts", new Date("2019-06-01")),
        ...(
          [
            "capital_intensity",
            "regulatory_burden",
            "network_effects",
            "distribution_lock",
            "data_moat",
          ] as const
        ).map((b) => ({
          id: `barrier-${b}`,
          source: "hn" as const,
          url: `https://example.com/${b}`,
          quote: "documented barrier",
          retrievedAt: new Date("2019-06-01"),
          postedAt: new Date("2019-01-01"),
          kind: "barrier" as const,
          barrier: b,
        })),
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // The honest middle. Most real ideas land here, and that is fine.
  // ---------------------------------------------------------------------------
  {
    name: "A personal finance app with the wrong wedge, 2024",
    asOf: new Date("2024-06-01"),
    outcome: "Users are angry about bank connections breaking, not about chart design.",
    expect: "BUILD_IT_DIFFERENTLY",
    input: {
      now: new Date("2024-06-01"),
      marketShape: "single_player_saas",
      adapterStatuses: bothV1,
      statedWedge: "prettier spending graphs",
      competitors: [competitor("mint"), competitor("ynab"), competitor("monarch")],
      evidence: [
        ...talk("mint", { complaints: 9, theme: "bank connections break" }, new Date("2024-06-01")),
        ...talk("ynab", { complaints: 7, theme: "bank connections break" }, new Date("2024-06-01")),
        ...talk("ynab", { praise: 4 }, new Date("2024-06-01")),
        competitorRow("mint", "Mint"),
        ...growing("finance-posts", new Date("2024-06-01")),
      ],
    },
  },
  {
    name: "A niche B2B tool nobody has written about, 2024",
    asOf: new Date("2024-06-01"),
    outcome: "Real idea, but the public record is nearly silent. The honest answer is homework.",
    expect: "GO_FIND_OUT",
    input: {
      now: new Date("2024-06-01"),
      marketShape: "single_player_saas",
      adapterStatuses: { hn: "ok", github: "timed_out" },
      statedWedge: "scheduling for dental labs",
      competitors: [competitor("labstar")],
      evidence: [
        ...talk("labstar", { complaints: 2, theme: "scheduling" }, new Date("2024-06-01")),
        ...talk("labstar", { praise: 1 }, new Date("2024-06-01")),
        competitorRow("labstar", "LabStar"),
      ],
    },
  },
  {
    name: "A consumer neobank from two people, 2024",
    asOf: new Date("2024-06-01"),
    outcome: "The demand is real; the licensing and capital are not reachable by two people.",
    reject: ["BUILD_IT"],
    input: {
      now: new Date("2024-06-01"),
      marketShape: "regulated_service",
      adapterStatuses: bothV1,
      statedWedge: "a bank account that does not charge fees",
      competitors: [competitor("chase"), competitor("revolut"), competitor("monzo")],
      evidence: [
        ...talk("chase", { complaints: 10, theme: "fees" }, new Date("2024-06-01")),
        ...talk("revolut", { complaints: 6, theme: "support" }, new Date("2024-06-01")),
        ...talk("monzo", { praise: 5 }, new Date("2024-06-01")),
        competitorRow("chase", "Chase"),
        ...growing("neobank-posts", new Date("2024-06-01")),
        ...(["capital_intensity", "regulatory_burden", "switching_costs"] as const).map((b) => ({
          id: `nb-barrier-${b}`,
          source: "hn" as const,
          url: `https://example.com/nb-${b}`,
          quote: "documented barrier",
          retrievedAt: new Date("2024-06-01"),
          postedAt: new Date("2024-01-01"),
          kind: "barrier" as const,
          barrier: b,
        })),
      ],
    },
  },
];
