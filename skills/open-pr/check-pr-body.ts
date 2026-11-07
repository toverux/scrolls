// Version: 1.0.0

// oxlint-disable node/no-top-level-await -- an entry script, run directly and never imported.

// PreToolUse hook: refuses a `gh pr create` or `gh pr edit` (or the `gh api .../pulls` fallback)
// whose title or body file carries an error-level Vale hit, listing the hits, so a skipped lint
// step can't leak a dash, a file path or an agent footer into a PR. Suggestion- and warning-level
// hits never deny.
//
// It allows, with a `systemMessage` warning where there is something to say, when the command
// writes no PR, names no body file, names one the shell would expand or that can't be read, or
// when Vale or its styles are missing: a hook failure never blocks unrelated work.
//
// Bun is the required runtime, and Vale must be on the PATH.
//
// One flag is required:
//   --config <path>   The Vale config to lint with, such as the humanizer skill's `.vale.ini`.
//
// Wire it as a PreToolUse hook matched on `Bash`, its command on a single line, such as:
//   bun "<skills>/open-pr/check-pr-body.ts" --config "<skills>/humanizer/.vale.ini"

import path from 'node:path';

interface Alert {
  readonly Check: string;
  readonly Line: number;
  readonly Match: string;
  readonly Message: string;
  readonly Severity: string;
}

// A word of the command once the shell's quoting is undone. A word that holds something the shell
// would still expand (a `$(…)`, a backtick, a variable, a process substitution) is not literal: the
// hook can neither read it as a path nor lint it as text.
interface Word {
  readonly text: string;
  readonly isLiteral: boolean;
}

// What the command passes gh for the PR, each field either a literal, absent, or a note on why
// it could not be read.
interface Creation {
  readonly title: string | undefined;
  readonly bodyFile: string | undefined;
  readonly notes: readonly string[];
}

type Lint = { readonly alerts: readonly Alert[] } | { readonly failure: string };

// The segments of a shell command, in the order the scanner tries them.
const segment =
  /(?<space>[^\S\n]+)|(?<continuation>\\\n)|'(?<single>[^']*)'|"(?<double>(?:\\.|[^"\\])*)"|\\(?<escaped>.)|(?<operator>&&|\|\||[;|&\n])|(?<bare>[^\s'"\\;|&]+)/uy;

// Only a thrown error reaches Bun's own exit 1, which reads as a non-blocking hook error and lets
// the command through: a bug in the hook never blocks a PR.
await run();

async function run(): Promise<void> {
  const payload = await readPayload();
  const command = commandOf(payload);

  if (command == null) {
    return;
  }

  const creation = parseCreation(splitWords(command));

  if (creation == null) {
    return;
  }

  const config = argValue(Bun.argv.slice(2), '--config');

  if (config == null) {
    warn('check-pr-body: no --config flag, so the PR was not linted.');

    return;
  }

  const notes = [...creation.notes];
  const hits: string[] = [];
  const texts: Array<[label: string, text: string]> = [];

  // Vale answers an empty stdin with its usage text, so a blank text is never sent to it.
  if (creation.title?.trim()) {
    texts.push(['title', creation.title]);
  }

  if (creation.bodyFile != null) {
    const file = path.resolve(cwdOf(payload), creation.bodyFile);
    const body = await tryReadFile(file);

    if (body == null) {
      notes.push(`the body file ${file} could not be read`);
    } else if (body.trim()) {
      texts.push(['body', body]);
    }
  }

  const lints = await Promise.all(
    texts.map(async ([label, text]) => [label, await lintText(config, text)] as const)
  );

  for (const [label, lint] of lints) {
    if ('failure' in lint) {
      notes.push(lint.failure);

      break;
    }

    for (const alert of lint.alerts) {
      if (alert.Severity == 'error') {
        hits.push(
          `${label == 'body' ? `body file line ${alert.Line}` : label}: ${alert.Check} ` +
            `"${alert.Match}": ${alert.Message}`
        );
      }
    }
  }

  if (hits.length > 0) {
    const count = `${hits.length} error-level lint ${hits.length == 1 ? 'hit' : 'hits'}`;
    const list = hits.map(hit => `- ${hit}`).join('\n');

    deny(
      `The PR's text carries ${count}; fix the draft, rewrite the body file from it, ` +
        `and run the command again:\n${list}`
    );

    return;
  }

  if (notes.length > 0) {
    warn(`check-pr-body: the PR was not fully linted: ${notes.join('; ')}.`);
  }
}

// Vale lints the text through stdin as Markdown, whatever the body file's name: a file whose
// extension the config does not name is silently skipped otherwise.
async function lintText(config: string, text: string): Promise<Lint> {
  try {
    return await lintWithVale(config, text);
  } catch (error) {
    if (fieldOf(error, 'code') == 'ENOENT') {
      return { failure: 'Vale is not installed or not on the PATH' };
    }

    throw error;
  }
}

async function lintWithVale(config: string, text: string): Promise<Lint> {
  const proc = Bun.spawn(['vale', '--config', config, '--ext=.md', '--output=JSON'], {
    stdin: new TextEncoder().encode(text),
    stdout: 'pipe',
    stderr: 'pipe'
  });

  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);

  const code = await proc.exited;

  // Vale exits 1 on an error-level alert and 2 on a failure of its own, such as a missing style,
  // which it reports on stderr.
  if (code > 1) {
    return { failure: `Vale failed (exit ${code}): ${err.trim() || 'no detail'}` };
  }

  // One key per linted file, holding its alerts; an empty output means no alerts.
  const byFile = (out.trim() ? JSON.parse(out) : {}) as Record<string, Alert[]>;

  return { alerts: Object.values(byFile).flat() };
}

// The PR creation in the command, where there is one: `gh pr create` or `gh pr edit` with its
// `--title` and `--body-file` (or `-t`, `-F`), or `gh api <...>/pulls` with `-f title=` and
// `-F body=@<file>`.
// Only the words up to the next shell operator belong to it, so a push chained before it is
// skipped and a command chained after it is left alone.
function parseCreation(words: readonly Word[]): Creation | undefined {
  const start = words.findIndex(
    (word, i) => word.text == 'gh' && word.isLiteral && (i == 0 || isOperator(words[i - 1]))
  );

  if (start == -1) {
    return undefined;
  }

  const end = words.findIndex((word, i) => i > start && isOperator(word));
  const args = words.slice(start + 1, end == -1 ? undefined : end);
  const [first, second] = args;

  if (first?.text == 'pr' && (second?.text == 'create' || second?.text == 'edit')) {
    return parseFlags(args.slice(2));
  }

  if (first?.text == 'api' && args.some(word => word.isLiteral && word.text.endsWith('/pulls'))) {
    return parseRestFields(args.slice(1));
  }

  // A `gh` that creates no PR may still precede one in the same command.
  return parseCreation(words.slice(start + 1));
}

function parseFlags(args: readonly Word[]): Creation {
  let title: Word | undefined;
  let bodyFile: Word | undefined;

  for (const [i, word] of args.entries()) {
    const [flag, inlineValue] = splitAtEquals(word.text);
    const value = inlineValue == null ? args[i + 1] : { ...word, text: inlineValue };

    if (flag == '--title' || flag == '-t') {
      title = value;
    } else if (flag == '--body-file' || flag == '-F') {
      bodyFile = value;
    }
  }

  return creationOf(title, bodyFile);
}

// The REST fields, `-f key=value` (literal) and `-F key=value` (typed; `@<file>` reads a file).
function parseRestFields(args: readonly Word[]): Creation {
  let title: Word | undefined;
  let bodyFile: Word | undefined;

  for (const [i, word] of args.entries()) {
    const [flag, inlineField] = splitAtEquals(word.text);
    const isTyped = flag == '-F' || flag == '--field';

    if (!isTyped && flag != '-f' && flag != '--raw-field') {
      continue;
    }

    const field = inlineField == null ? args[i + 1] : { ...word, text: inlineField };

    if (field == null) {
      continue;
    }

    const [key, value] = splitAtEquals(field.text);

    if (value == null) {
      continue;
    }

    if (key == 'title') {
      title = { ...field, text: value };
    } else if (key == 'body' && isTyped && value.startsWith('@')) {
      bodyFile = { ...field, text: value.slice(1) };
    }
  }

  return creationOf(title, bodyFile);
}

function creationOf(title: Word | undefined, bodyFile: Word | undefined): Creation {
  const notes: string[] = [];

  if (title != null && !title.isLiteral) {
    notes.push('the title is not a literal the hook can lint; write it out in the command');
  }

  if (bodyFile != null && !bodyFile.isLiteral) {
    notes.push('the body file is not a literal path the hook can read; write the body to a file');
  }

  return {
    title: title?.isLiteral ? title.text : undefined,
    bodyFile: bodyFile?.isLiteral ? bodyFile.text : undefined,
    notes
  };
}

// Splits a command into words the way a POSIX shell would for the quoting a PR command uses:
// blanks separate; a backslash-newline joins two lines into one; single quotes keep everything;
// double quotes keep spaces and honor a backslash before `"`, `\`, `$` or a backtick; a bare
// backslash escapes the next character; `&&`, `||`, `;`, `|`, `&` and a newline become operator
// words of their own. What the shell would expand is kept as written and marks its word as not
// literal. An unterminated quote ends the scan.
function splitWords(command: string): Word[] {
  const words: Word[] = [];
  let current: Word | undefined;

  const flush = (): void => {
    if (current != null) {
      words.push(current);
    }

    current = undefined;
  };

  segment.lastIndex = 0;

  for (let match = segment.exec(command); match != null; match = segment.exec(command)) {
    const { space, continuation, operator } = match.groups ?? {};

    if (continuation != null) {
      continue;
    }

    if (space != null) {
      flush();
    } else if (operator == null) {
      const piece = pieceOf(match.groups ?? {});

      current = {
        text: (current?.text ?? '') + piece.text,
        isLiteral: (current?.isLiteral ?? true) && piece.isLiteral
      };
    } else {
      flush();
      words.push({ text: operator, isLiteral: true });
    }
  }

  flush();

  return words;
}

function pieceOf(groups: Record<string, string | undefined>): Word {
  const { single, double, escaped, bare } = groups;

  if (single != null) {
    return { text: single, isLiteral: true };
  }

  if (double != null) {
    return {
      text: double.replaceAll(/\\(?<char>["\\$`])/gu, '$<char>'),
      isLiteral: !hasExpansion(double.replaceAll(/\\./gu, ''))
    };
  }

  if (escaped != null) {
    return { text: escaped, isLiteral: true };
  }

  return { text: bare ?? '', isLiteral: !hasExpansion(bare ?? '') };
}

function hasExpansion(text: string): boolean {
  return /\$|`|[<>]\(/u.test(text);
}

// `key=value` split at the first `=`; a text without one has no value.
function splitAtEquals(text: string): [head: string, tail: string | undefined] {
  const index = text.indexOf('=');

  return index == -1 ? [text, undefined] : [text.slice(0, index), text.slice(index + 1)];
}

function isOperator(word: Word | undefined): boolean {
  return word != null && word.isLiteral && ['&&', '||', ';', '|', '&', '\n'].includes(word.text);
}

function deny(reason: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason
      }
    })
  );
}

// Stderr of an exit-0 hook is never shown, so a warning goes out as a `systemMessage`.
function warn(message: string): void {
  process.stdout.write(JSON.stringify({ systemMessage: message }));
}

// A flag's value is the next argument; a flag given without one counts as absent.
function argValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index == -1 ? undefined : args[index + 1];
}

// The hook payload is JSON on stdin. A harness that invokes the hook with no stdin, or with
// something that is not JSON, gets no check rather than a crash.
async function readPayload(): Promise<unknown> {
  try {
    return await Bun.stdin.json();
  } catch {
    return undefined;
  }
}

async function tryReadFile(file: string): Promise<string | undefined> {
  try {
    return await Bun.file(file).text();
  } catch {
    return undefined;
  }
}

function commandOf(payload: unknown): string | undefined {
  const toolInput = fieldOf(payload, 'tool_input');
  const command = fieldOf(toolInput, 'command');

  return typeof command == 'string' && command != '' ? command : undefined;
}

function cwdOf(payload: unknown): string {
  const cwd = fieldOf(payload, 'cwd');

  return typeof cwd == 'string' && cwd != '' ? cwd : process.cwd();
}

function fieldOf(value: unknown, key: string): unknown {
  return typeof value == 'object' && value != null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}
