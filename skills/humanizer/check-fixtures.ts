// Version: 1.0.0

// oxlint-disable node/no-top-level-await -- an entry script, run directly and never imported.

// Checks the Vale rules of this skill against its two fixtures, after a `vale sync` has updated
// the third-party rules: the AI sample must still produce hits and none at error level, and the
// human sample must produce none. Vale's exit code tells an error-level alert from none and a
// failure of its own, so this script counts the alerts from its JSON output.
//
// Bun is the required runtime.
// Run it from anywhere: `bun ~/.claude/skills/humanizer/check-fixtures.ts`.

const { dir } = import.meta;

interface Alert {
  readonly Check: string;
  readonly Line: number;
  readonly Match: string;
  readonly Severity: string;
}

async function lint(fixture: string): Promise<readonly Alert[]> {
  const proc = Bun.spawn(['vale', '--config', `${dir}/.vale.ini`, '--ext=.md', '--output=JSON'], {
    stdin: Bun.file(`${dir}/fixtures/${fixture}`),
    stdout: 'pipe',
    stderr: 'pipe'
  });

  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);

  const code = await proc.exited;

  // Vale exits 1 on an error-level alert and 2 on a failure of its own, such as a missing style,
  // which it reports on stderr with an empty stdout.
  if (code > 1) {
    throw new Error(`vale exited ${code} on ${fixture}: ${err.trim()}`);
  }

  // One key per linted file, holding its alerts; an empty output means no alerts.
  const byFile = (out.trim() ? JSON.parse(out) : {}) as Record<string, Alert[]>;

  return Object.values(byFile).flat();
}

function describe(alerts: readonly Alert[]): string {
  return alerts.map(a => `  ${a.Severity} ${a.Check} line ${a.Line}: ${a.Match}`).join('\n');
}

const ai = await lint('ai-sample.md');
const human = await lint('human-sample.md');
const problems: string[] = [];

if (ai.length === 0) {
  problems.push('the AI sample produced no hit');
}

const aiErrors = ai.filter(a => a.Severity === 'error');

if (aiErrors.length > 0) {
  problems.push(`the AI sample produced error-level hits:\n${describe(aiErrors)}`);
}

if (human.length > 0) {
  problems.push(`the human sample produced hits:\n${describe(human)}`);
}

if (problems.length > 0) {
  process.stderr.write(`humanizer fixtures: ${problems.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `humanizer fixtures: ok (${ai.length} hits on the AI sample, 0 on the human sample)\n`
  );
}
