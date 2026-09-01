/**
 * Recorded API payloads.
 *
 * Adapters are tested against these rather than against the live services, so
 * the suite runs offline, in CI, and identically a year from now. When a
 * provider changes its response shape the fix is to re-record here, and the
 * diff shows exactly what moved.
 *
 * Trimmed to the fields the adapters actually read, plus a few they must
 * tolerate being absent.
 */

export const HN_SEARCH = {
  hits: [
    {
      objectID: "38401234",
      title: null,
      story_title: "Ask HN: What do you use for scheduling?",
      url: null,
      author: "someuser",
      created_at: "2025-11-04T14:22:11.000Z",
      comment_text:
        "<p>Calendly&#x27;s timezone handling breaks every single DST change and support just tells you to &quot;refresh&quot;. We moved off it after the third incident.</p>",
      story_text: null,
      points: null,
      num_comments: null,
    },
    {
      objectID: "38409999",
      title: "Show HN: Cal.com, an open source Calendly alternative",
      story_title: null,
      url: "https://cal.com",
      author: "founder",
      created_at: "2025-09-18T08:00:00.000Z",
      comment_text: null,
      story_text: "We built this because scheduling tools are all closed and expensive.",
      points: 412,
      num_comments: 133,
    },
    {
      // Too short to be evidence of anything. Must be dropped.
      objectID: "38410000",
      title: "+1",
      story_title: null,
      url: null,
      author: "terse",
      created_at: "2025-10-01T00:00:00.000Z",
      comment_text: "<p>+1</p>",
      story_text: null,
      points: null,
      num_comments: null,
    },
    {
      // No author, no date. Must survive rather than throw.
      objectID: "38411111",
      title: null,
      story_title: "Scheduling tools",
      url: null,
      author: null,
      created_at: null,
      comment_text:
        "<p>The free tier used to include round robin. Now it is on the &#x2F;teams plan and costs 4x.</p>",
      story_text: null,
      points: 9,
      num_comments: 2,
    },
  ],
};

export const GITHUB_SEARCH = {
  total_count: 3,
  items: [
    {
      full_name: "calcom/cal.com",
      html_url: "https://github.com/calcom/cal.com",
      description: "Scheduling infrastructure for absolutely everyone.",
      archived: false,
      stargazers_count: 31000,
      pushed_at: "2026-08-18T10:00:00Z",
      created_at: "2021-03-01T00:00:00Z",
      owner: { login: "calcom" },
    },
    {
      // An archived repo is an obituary with a date and a URL that resolves.
      full_name: "deadco/schedulr",
      html_url: "https://github.com/deadco/schedulr",
      description: "Open source meeting scheduler. No longer maintained.",
      archived: true,
      stargazers_count: 840,
      pushed_at: "2021-02-10T00:00:00Z",
      created_at: "2018-06-01T00:00:00Z",
      owner: { login: "deadco" },
    },
    {
      // No description. Nothing to extract from, so it must be dropped.
      full_name: "someone/untitled",
      html_url: "https://github.com/someone/untitled",
      description: null,
      archived: false,
      stargazers_count: 2,
      pushed_at: "2026-01-01T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
      owner: { login: "someone" },
    },
  ],
};

/** A fetcher that always answers with the given payload. */
export function stubFetcher(payload: unknown, status = 200) {
  return async () => new Response(JSON.stringify(payload), { status });
}
