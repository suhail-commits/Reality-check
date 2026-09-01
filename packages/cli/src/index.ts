import { buildDeps, FileStore, run } from "@rc/engine";
import { renderTrace, renderVerdict } from "./render.js";
import { SEED_IDEAS } from "./seeds.js";

const USAGE = `Idea Reality Check

  validate "<idea>"     research an idea and print a verdict
  seed [n]              pre-research the demo markets (default: all)
  markets               list what has been seeded
  config                show which providers and adapters are configured

Options
  --fresh               ignore any cached dossier and gather again
  --quiet               print the verdict only, no trace
`;

function reportConfig(warnings: string[], cheap: string, good: string, adapters: string[]): void {
  process.stdout.write(`  cheap tier   ${cheap}\n`);
  process.stdout.write(`  prose tier   ${good}\n`);
  process.stdout.write(`  adapters     ${adapters.join(", ")}\n`);
  for (const w of warnings) process.stdout.write(`\n  ! ${w}\n`);
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const args = argv.filter((a) => !a.startsWith("--"));
  const command = args[0];

  const quiet = flags.has("--quiet");
  const { deps, report } = buildDeps();

  if (!command || command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  if (command === "config") {
    reportConfig(report.warnings, report.cheap, report.good, report.adapters);
    return 0;
  }

  if (command === "markets") {
    const rows = await new FileStore().summary();
    if (rows.length === 0) {
      process.stdout.write("Nothing seeded yet. Run: pnpm cli seed\n");
      return 0;
    }
    for (const row of rows) {
      process.stdout.write(
        `  ${row.market.id.padEnd(8)} ${row.market.name.slice(0, 44).padEnd(46)} ${String(row.evidence).padStart(4)} rows\n`,
      );
    }
    return 0;
  }

  if (command === "validate") {
    const idea = args.slice(1).join(" ").trim();
    if (!idea) {
      process.stderr.write('Give it an idea: validate "an app for dog walkers"\n');
      return 1;
    }

    // Warnings up front rather than a confusing GO FIND OUT at the end.
    if (report.warnings.length > 0 && !quiet) {
      for (const w of report.warnings) process.stdout.write(`! ${w}\n`);
    }

    const result = await run(
      { ideaText: idea, ...(flags.has("--fresh") ? { forceFresh: true } : {}) },
      deps,
      quiet ? () => {} : renderTrace,
    );
    renderVerdict(result);
    return 0;
  }

  if (command === "seed") {
    const limit = Number(args[1] ?? SEED_IDEAS.length);
    const ideas = SEED_IDEAS.slice(0, Number.isFinite(limit) ? limit : SEED_IDEAS.length);

    process.stdout.write(`Seeding ${ideas.length} markets. This hits live APIs.\n`);
    let ok = 0;

    for (const idea of ideas) {
      process.stdout.write(`\n${idea}\n`);
      try {
        const result = await run({ ideaText: idea }, deps, quiet ? () => {} : renderTrace);
        // A seeded market whose verdict is DON'T BUILD IT is the valuable kind:
        // it proves in a demo that the tool is willing to say no.
        process.stdout.write(
          `  -> ${result.verdict.verdict} (${result.dossier.evidence.length} evidence rows)\n`,
        );
        ok++;
      } catch (error) {
        // One bad market must not abandon the other nine.
        process.stderr.write(`  x failed: ${error instanceof Error ? error.message : error}\n`);
      }
    }

    process.stdout.write(`\nSeeded ${ok} of ${ideas.length}.\n`);
    return ok === 0 ? 1 : 0;
  }

  process.stderr.write(`Unknown command: ${command}\n\n${USAGE}`);
  return 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`\n${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  },
);
