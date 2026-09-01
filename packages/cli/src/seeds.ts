/**
 * The markets seeded before a demo.
 *
 * Chosen to match what people actually submit -- app ideas, SaaS, AI wrappers,
 * marketplaces -- rather than what would flatter the rubric, so the cache
 * actually hits when someone types their own idea into the deployed site.
 *
 * The mix matters as much as the count. Roughly a third of these should come
 * back DON'T BUILD IT. A seed set where everything is a BUILD IT produces a
 * demo that quietly proves the tool is the same flattery machine as every
 * other idea validator.
 */
export const SEED_IDEAS: readonly string[] = [
  "an app for dog walkers",
  "a link shortener with a nicer dashboard",
  "an AI tool that writes cold outreach emails",
  "a scheduling tool that handles timezones properly",
  "a marketplace for freelance video editors",
  "a personal finance app that tracks subscriptions",
  "an AI notetaker for meetings",
  "a habit tracker with streaks",
  "a self-hosted alternative to Notion",
  "a tool that turns podcasts into blog posts",
];
