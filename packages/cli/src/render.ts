import type { RunResult } from "@rc/engine";
import type { Evidence, TraceEvent, Verdict } from "@rc/shared";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => (useColor ? `[${code}m${s}[0m` : s);

const dim = wrap("2");
const bold = wrap("1");
const green = wrap("32");
const amber = wrap("33");
const red = wrap("31");
const blue = wrap("34");

const VERDICT_STYLE: Record<Verdict, { label: string; paint: (s: string) => string }> = {
  BUILD_IT: { label: "BUILD IT", paint: green },
  BUILD_IT_DIFFERENTLY: { label: "BUILD IT DIFFERENTLY", paint: amber },
  DONT_BUILD_IT: { label: "NOT THIS ONE", paint: red },
  GO_FIND_OUT: { label: "GO AND CHECK", paint: blue },
};

const STAGE_LABEL: Record<string, string> = {
  interview: "Understanding the idea",
  canonicalize: "Checking what we already know",
  gather: "Reading what people said",
  extract: "Pulling out the claims",
  judge: "Scoring it",
};

/**
 * The same TraceEvent stream the browser renders, printed for a terminal.
 *
 * Degraded and timed-out lines are shown rather than swallowed. A source
 * dropping out is normal behaviour in this system, and hiding it here would
 * make the CLI a worse debugging tool than the web app.
 */
export function renderTrace(event: TraceEvent): void {
  switch (event.type) {
    case "stage_start":
      process.stdout.write(`\n${bold(STAGE_LABEL[event.stage] ?? event.stage)}\n`);
      break;
    case "stage_end":
      process.stdout.write(dim(`  done in ${(event.ms / 1000).toFixed(1)}s\n`));
      break;
    case "adapter_result": {
      const detail = `${event.adapter} wave ${event.wave}`;
      process.stdout.write(
        event.status === "ok"
          ? dim(`  ${detail} - ${event.items} results (${event.ms}ms)\n`)
          : amber(`  ! ${detail} - ${event.status.replace("_", " ")}\n`),
      );
      break;
    }
    case "market_matched":
      process.stdout.write(
        `  ${event.fresh ? "researching as" : "matched to"} ${bold(event.name)}` +
          dim(` (${Math.round(event.similarity * 100)}%)\n`),
      );
      break;
    case "degraded":
      process.stdout.write(amber(`  ! ${event.reason}\n`));
      break;
    case "note":
      process.stdout.write(dim(`  ${event.text}\n`));
      break;
    case "verdict":
      break;
  }
}

function evidenceLine(e: Evidence): string {
  const who =
    e.kind === "complaint" || e.kind === "praise"
      ? ` ${e.competitorId}`
      : e.kind === "obituary"
        ? ` ${e.name} (${e.causeOfDeath})`
        : e.kind === "barrier"
          ? ` ${e.barrier}`
          : "";
  const quote = e.quote.replace(/\s+/g, " ").slice(0, 96);
  return `  ${dim(`[${e.id}]`)} ${e.kind}${who}\n    "${quote}"\n    ${dim(e.url)}\n`;
}

export function renderVerdict(result: RunResult): void {
  const { verdict, scores, confidence } = result.verdict;
  const style = VERDICT_STYLE[verdict];

  process.stdout.write(`\n${"-".repeat(64)}\n`);
  process.stdout.write(`\n  ${bold(style.paint(style.label))}\n`);
  process.stdout.write(
    dim(
      `  ${confidence.band} confidence - ${confidence.adaptersReturned}/${confidence.adaptersAttempted} sources returned\n`,
    ),
  );

  if (result.verdict.prose) {
    process.stdout.write(`\n${wrapText(result.verdict.prose, 68, "  ")}\n`);
  } else {
    process.stdout.write(dim("\n  (no written explanation - prose model unavailable)\n"));
  }

  // The opening is the half people act on, so it comes before the arithmetic.
  const redirect = result.verdict.redirect;
  if (redirect) {
    const grade =
      redirect.strength === "strong"
        ? green("well supported")
        : redirect.strength === "thin"
          ? amber("worth checking first")
          : dim("our reading, not the market's");

    process.stdout.write(`\n  ${bold("Where the opening is")}  ${grade}\n`);
    process.stdout.write(`\n${wrapText(redirect.theme, 68, "  ")}\n`);
    process.stdout.write(dim(`\n${wrapText(redirect.basis, 68, "  ")}\n`));
    process.stdout.write(dim(`\n  backed by ${redirect.evidenceIds.join(", ")}\n`));
  }

  process.stdout.write(`\n  ${bold("Signals")}\n`);
  const rows: [string, string][] = [
    ["complaints vs praise", `${Math.round(scores.complaintRatio * 100)}%`],
    ["praise observed", scores.praiseVolume.toFixed(1)],
    ["evidence rows", String(scores.evidenceVolume)],
    ["competitors", String(scores.competitorCount)],
    ["recent demand-side deaths", String(scores.recentDemandSideDeaths)],
    ["trajectory", scores.trajectory.toFixed(2)],
    ["feasibility", `${Math.round(scores.feasibility)}/100`],
  ];
  for (const [label, value] of rows) {
    process.stdout.write(`    ${label.padEnd(28)} ${value}\n`);
  }
  process.stdout.write(dim(`\n    decided by rule ${result.verdict.firedRule}\n`));

  const cited = result.verdict.citedEvidenceIds
    .map((id) => result.dossier.evidence.find((e) => e.id === id))
    .filter((e): e is Evidence => Boolean(e));

  if (cited.length > 0) {
    process.stdout.write(`\n  ${bold("Sources for every claim above")}\n\n`);
    for (const e of cited) process.stdout.write(evidenceLine(e));
  }

  process.stdout.write(`\n${"-".repeat(64)}\n`);
}

function wrapText(text: string, width: number, indent: string): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + word).length > width) {
      lines.push(line.trimEnd());
      line = "";
    }
    line += `${word} `;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.map((l) => indent + l).join("\n");
}
