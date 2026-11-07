// oxlint-disable node/no-top-level-await -- the skip condition is known before the tests are declared.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Drives the hook through its one interface: the PreToolUse payload on stdin, the decision on
// stdout, against the real Vale and the fork's synced styles.
// The config written here sets each error-level rule's level itself, so a level change in the
// fork's config can't move a case across the deny line unnoticed.

const script = path.resolve(import.meta.dir, 'check-pr-body.ts');
const fork = path.resolve(import.meta.dir, '../humanizer');
const valeAvailable = Bun.which('vale') != null && (await isDirectory(`${fork}/styles/AiTells`));

interface HookOutput {
  readonly hookSpecificOutput?: {
    readonly permissionDecision?: 'allow' | 'deny';
    readonly permissionDecisionReason?: string;
  };
  readonly systemMessage?: string;
}

interface Outcome {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly decision: 'allow' | 'deny';
  readonly reason: string;
  readonly systemMessage: string;
}

let dir = '';
let config = '';
let cleanBody = '';

// An `env` replaces the hook's whole environment: given without a usable PATH, Vale is missing.
async function run(command: string, env?: Record<string, string>): Promise<Outcome> {
  const payload = {
    session_id: 'test',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    cwd: dir,
    tool_input: { command }
  };

  const proc = Bun.spawn([process.execPath, script, '--config', config], {
    stdin: new TextEncoder().encode(JSON.stringify(payload)),
    stdout: 'pipe',
    stderr: 'pipe',
    ...(env == null ? {} : { env })
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);

  const code = await proc.exited;
  const output = (stdout.trim() ? JSON.parse(stdout) : {}) as HookOutput;
  const specific = output.hookSpecificOutput ?? {};

  return {
    code,
    stdout,
    stderr,
    decision: specific.permissionDecision ?? 'allow',
    reason: specific.permissionDecisionReason ?? '',
    systemMessage: output.systemMessage ?? ''
  };
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    const stats = await stat(target);

    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function bodyFile(name: string, content: string): Promise<string> {
  const file = path.join(dir, name);

  await writeFile(file, content);

  return file;
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'check-pr-body-'));
  config = path.join(dir, 'test.vale.ini');
  cleanBody = await bodyFile('clean.md', 'A clean body that says what changed.\n');

  await writeFile(
    config,
    [
      `StylesPath = ${path.join(fork, 'styles')}`,
      'MinAlertLevel = suggestion',
      '',
      '[*.md]',
      'BasedOnStyles = AiTells, Local',
      'AiTells.Passive = NO',
      'AiTells.Adverb = NO',
      'AiTells.Dash = error',
      'AiTells.FilePath = error',
      'AiTells.NeverTag = error',
      'AiTells.CodeToken = error',
      'AiTells.SectionCode = error',
      'AiTells.StatusBracket = error',
      'Local.Emoji = error',
      'Local.GeneratedFooter = error',
      ''
    ].join('\n')
  );
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

// One sample per error-level rule, each carrying the rule's name as Vale reports it.
const errorSamples: ReadonlyArray<readonly [rule: string, sample: string]> = [
  ['AiTells.Dash', 'The cache \u2014 the real one \u2014 was stale'],
  ['AiTells.Dash', 'Pages 3\u20134 cover the cache'],
  ['AiTells.FilePath', 'The rule lives in docs/readme.md now'],
  ['AiTells.NeverTag', 'The hook reads the file, never the account number itself'],
  ['AiTells.CodeToken', 'Raise MAX_RETRY_COUNT before the sync'],
  ['AiTells.SectionCode', 'The format is set in section 3'],
  ['AiTells.StatusBracket', 'The sync is [GREEN] again'],
  ['Local.Emoji', 'Ship it \u{1F680}'],
  ['Local.GeneratedFooter', 'Generated with [Claude Code](https://claude.com/claude-code)'],
  ['Local.GeneratedFooter', 'Co-Authored-By: Claude <noreply@anthropic.com>']
];

describe.skipIf(!valeAvailable)('with Vale and the synced styles', () => {
  describe('denies an error-level hit', () => {
    test.each(errorSamples)('%s in the body', async (rule, sample) => {
      const file = await bodyFile(`${rule}-body.md`, `A first line.\n\n${sample}\n`);
      const outcome = await run(`gh pr create --title "A clean title" --body-file ${file}`);

      expect(outcome.code).toBe(0);
      expect(outcome.decision).toBe('deny');
      expect(outcome.reason).toContain(rule);
      expect(outcome.reason).toContain('body file line 3');
    });

    test.each(errorSamples)('%s in the title', async (rule, sample) => {
      const outcome = await run(`gh pr create --title "${sample}" --body-file ${cleanBody}`);

      expect(outcome.decision).toBe('deny');
      expect(outcome.reason).toContain(rule);
      expect(outcome.reason).toContain('title');
    });

    test('in the body of the REST fallback', async () => {
      const file = await bodyFile('rest-body.md', 'A dash \u2014 here.\n');
      const outcome = await run(
        `gh api repos/o/r/pulls -f title='Clean' -f head=o:b -f base=main -F body=@${file}`
      );

      expect(outcome.decision).toBe('deny');
      expect(outcome.reason).toContain('AiTells.Dash');
    });

    test('in the title of the REST fallback', async () => {
      const outcome = await run(
        `gh api repos/o/r/pulls -f title='A \u2014 B' -f base=main -F body=@${cleanBody}`
      );

      expect(outcome.decision).toBe('deny');
      expect(outcome.reason).toContain('AiTells.Dash');
    });

    test('in the body of an edit of an open PR', async () => {
      const file = await bodyFile('edit-body.md', 'A dash \u2014 here.\n');
      const outcome = await run(`gh pr edit 12 --repo o/r --title "Clean" --body-file ${file}`);

      expect(outcome.decision).toBe('deny');
      expect(outcome.reason).toContain('AiTells.Dash');
    });

    test('in a body file not named .md', async () => {
      const file = await bodyFile('body.txt', 'A dash \u2014 here.\n');
      const outcome = await run(`gh pr create --title "Clean" --body-file ${file}`);

      expect(outcome.decision).toBe('deny');
    });

    test('after a chained push', async () => {
      const outcome = await run(
        `git push -u fork b && gh pr create --title "A \u2014 B" --body-file ${cleanBody}`
      );

      expect(outcome.decision).toBe('deny');
    });

    test('across a backslash-newline continuation', async () => {
      const file = await bodyFile('continued.md', 'A dash \u2014 here.\n');
      const outcome = await run(`gh pr create \\\n  --title "Clean" \\\n  --body-file ${file}`);

      expect(outcome.decision).toBe('deny');
    });

    test('on its own line after a push', async () => {
      const outcome = await run(
        `git push -u fork b\ngh pr create --title "A \u2014 B" --body-file ${cleanBody}`
      );

      expect(outcome.decision).toBe('deny');
    });

    test('beside an empty title', async () => {
      const file = await bodyFile('beside-empty.md', 'A dash \u2014 here.\n');
      const outcome = await run(`gh pr create --title "" --body-file ${file}`);

      expect(outcome.code).toBe(0);
      expect(outcome.decision).toBe('deny');
    });

    test('in a double-quoted title whose backtick is escaped', async () => {
      const outcome = await run(
        `gh pr create --title "fix: handle \\\`null\\\` \u2014 or not" --body-file ${cleanBody}`
      );

      expect(outcome.decision).toBe('deny');
      expect(outcome.reason).toContain('AiTells.Dash');
    });

    test('with every hit listed', async () => {
      const file = await bodyFile('two.md', 'A dash \u2014 here.\n\nSee section 3.\n');
      const outcome = await run(`gh pr create --title "Clean" --body-file ${file}`);

      expect(outcome.reason).toContain('AiTells.Dash');
      expect(outcome.reason).toContain('AiTells.SectionCode');
    });
  });

  describe('allows', () => {
    test('the AI-tell fixture, which carries suggestion-level tells only', async () => {
      const outcome = await run(
        `gh pr create --title "Clean" --body-file ${path.join(fork, 'fixtures/ai-sample.md')}`
      );

      expect(outcome.code).toBe(0);
      expect(outcome.decision).toBe('allow');
    });

    test('the human fixture', async () => {
      const outcome = await run(
        `gh pr create --title "Clean" --body-file ${path.join(fork, 'fixtures/human-sample.md')}`
      );

      expect(outcome.decision).toBe('allow');
      expect(outcome.stdout).toBe('');
    });

    test('a creation with no body file, silently', async () => {
      const outcome = await run('gh pr create --title "Clean" --body "Inline \u2014 text"');

      expect(outcome.decision).toBe('allow');
      expect(outcome.stdout).toBe('');
    });

    test('an empty body file, silently', async () => {
      const file = await bodyFile('empty.md', '');
      const outcome = await run(`gh pr create --title "Clean" --body-file ${file}`);

      expect(outcome.code).toBe(0);
      expect(outcome.decision).toBe('allow');
      expect(outcome.stdout).toBe('');
    });

    test('an unreadable body file, with a warning', async () => {
      const outcome = await run(`gh pr create --title "Clean" --body-file ${dir}/missing.md`);

      expect(outcome.decision).toBe('allow');
      expect(outcome.systemMessage).toContain('missing.md');
    });

    test('a body file the shell would expand, with a warning', async () => {
      const outcome = await run('gh pr create --title "Clean" --body-file <(tail -n +3 draft.md)');

      expect(outcome.decision).toBe('allow');
      expect(outcome.systemMessage).toContain('body');
    });

    test('a title the shell would expand, with a warning', async () => {
      const outcome = await run(
        `gh pr create --title "$(head -1 draft.md)" --body-file ${cleanBody}`
      );

      expect(outcome.decision).toBe('allow');
      expect(outcome.systemMessage).toContain('title');
    });

    test.each(['gh pr list --state merged --limit 10', 'git push -u fork b', 'gh api user'])(
      'a command that creates no PR: %s',
      async command => {
        const outcome = await run(command);

        expect(outcome.decision).toBe('allow');
        expect(outcome.stdout).toBe('');
      }
    );

    test('a run whose styles are missing, with a warning', async () => {
      const empty = path.join(dir, 'no-styles.vale.ini');

      await writeFile(
        empty,
        `StylesPath = ${path.join(dir, 'nowhere')}\n[*.md]\nBasedOnStyles = AiTells\n`
      );

      const saved = config;

      config = empty;

      try {
        const outcome = await run(`gh pr create --title "Clean" --body-file ${cleanBody}`);

        expect(outcome.decision).toBe('allow');
        expect(outcome.systemMessage).toContain('Vale');
      } finally {
        config = saved;
      }
    });
  });
});

test('allows with a warning when Vale is not installed', async () => {
  const file = path.join(dir, 'clean.md');
  const outcome = await run(`gh pr create --title "Clean" --body-file ${file}`, {
    PATH: path.join(dir, 'nowhere')
  });

  expect(outcome.code).toBe(0);
  expect(outcome.decision).toBe('allow');
  expect(outcome.systemMessage).toContain('Vale');
});

test('allows a payload that is not JSON', async () => {
  const proc = Bun.spawn([process.execPath, script, '--config', config], {
    stdin: new TextEncoder().encode('not json'),
    stdout: 'pipe'
  });

  expect(await new Response(proc.stdout).text()).toBe('');
  expect(await proc.exited).toBe(0);
});
