---
name: open-pr
description: Open a pull request from the current branch, its body drafted from the commits and the repo's records in one of the template shapes, humanized, revised with the user, then pushed and opened.
argument-hint: '[shape or facts, free text]'
disable-model-invocation: true
version: 0.4.0
---

# Open a PR

A run turns the current branch into a pull request a maintainer can skim: a draft in `/tmp` built from the commits and the repo's own records, a humanizer pass, a critique by a fresh agent and a second pass, the user's edits with a check after each, then the push and `gh pr create`.

The arguments, when given, name the shape or carry facts: which commits the PR covers, the base, what the body must say or leave out.

This skill is under construction: step 9 refines it after every PR it opens, from what the run taught.

## 1. Read the branch

- `git fetch` every remote, then the base: the target repo's default branch (`gh repo view <target> --json defaultBranchRef`).
- An open PR for the branch: `gh pr list --repo <target> --head <branch> --state open`. One found goes to the user before anything else: this run then rewrites its body, or stops.
- The commits: `git log <base>..HEAD` with bodies, and `git diff --stat <base>..HEAD`.
- The diff itself, read against the commit messages: a change no commit names, or a file outside the branch's goal, goes to the user before drafting.
- The records behind them, which the project agent file (`CLAUDE.local.md`, `AGENTS.md`) names: a findings folder, a roadmap, a changelog. Read the entries the commits came from.
- The remotes: the one the branch pushes to (`git remote -v`, and the head owner of the user's previous PR: `gh pr list --author @me --state all --json number,headRepositoryOwner,headRefName`), and the repo that hosts the PR.
- The repo's conventions for a PR, in this order, the first found winning: a contributing file (`CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, a PR section of the README); failing that, the repo's merged PRs (`gh pr list --state merged --limit 10`, their titles and bodies), where a shared pattern of title, sections or tone counts and a mix of styles does not. Where neither yields one, the templates here set the convention.
- The last two PR bodies the user opened on this repo (`gh pr view <n> --json title,body`), for their own voice.
- The project agent file's rules on PRs: the voice, what stays out, what to update once the PR is open.

**Done when** no open PR stands in the way, the diff matches its commits, and the commits, their records, the base, the push remote, the target repo, the repo's PR convention or its absence, and two earlier PR bodies are in context.

## 2. Pick the shape

One template from `templates/`, each stating what it fits:

- [`per-commit-changes.md`](templates/per-commit-changes.md): independent changes, one section per commit.
- [`single-change.md`](templates/single-change.md): one improvement across the branch, in prose.
- [`measured-series.md`](templates/measured-series.md): several commits toward one measured outcome, the headline table first.

A branch with measurements adds the section of [`benchmark.md`](templates/benchmark.md) where its shape says.

The user's argument names it when they have a preference. Otherwise propose one in a line, the template and what in the branch fits it, and wait for their approval before drafting. A branch that fits none takes the closest template, and step 9 adds the missing one.

**Done when** the user has approved a template.

## 3. Draft

Write `/tmp/<repo>-pr-<branch>.md`: line 1 the title, line 2 blank, the body after, in the template's skeleton. A repo convention from step 1 overrides the skeleton where the two differ: its title form, its required sections, its checklist.

Rules for the body, whatever the shape:

- The title becomes the merge commit: it follows the repo's title convention and states what the change gets the user, not its mechanism:
  - Bad: `perf(server): negotiate permessage-deflate on the websocket`
  - Good: `perf(server): cut websocket frame size by 70%+ with gzipping`
  - A number in the title holds across the whole table, not its best cell: `up to 90%` taken from one row of seven overstates the change.
- The body opens on the problem as the user meets it, in plain words, then the change. The list of touched functions belongs to the diff:
  - Bad: "Removed implicit workspace carry-over from every "new thread" entry point (cmd+n / cmd+shift+o, sidebar v1/v2 buttons, command palette). New threads inherit only the project from context; branch, worktree, and env mode always come from the configured defaults. Deleted buildContextualThreadOptions, startNewThreadInProjectFromContext, and the v1 sidebar's seed-context machinery."
  - Good: "My "new worktree" default was ignored when starting new threads on existing worktrees. Not intuitive. Now your preferences always apply."
- Every claim comes from a commit message, a record or the diff. A number carries its conditions (the hardware, the data size, what was timed) as the record states them.
- Before a claim rests on a test result, check the records written after it: a later finding can show the test didn't do what a player does. The critique reads only the body and the commits, so it can't catch this.
- The body states the failure, its cause and the change. The evidence of the testing stays in the records; a maintainer asks for it when they want it.
- A detail of the session's test case (the fixture, the dataset, the input that happened to show the bug) stands only where the fix depends on it; elsewhere, state the rule it is an instance of.
- A name the maintainer may not know (another project, a tool, an acronym) is spelled out or left out.
- Plain words, short paragraphs, one idea each. The template sets the headings.

**Done when** each section the template calls for is written and every claim traces to a source.

## 4. Humanize, first pass

Run `humanizer:humanizer` on the file in file mode, one pass over the whole text.

**Done when** the pass ran.

## 5. Critique

First put the draft's framing to the user in one line, the story the body tells, and wait: a reframe after the critique spends its rounds on a dead draft.

The reviewer takes the brief of [`critique.md`](critique.md). Where this session ran `/review-gate` on the branch and its `cantrips:arbiter` agent is still in context, spawned here and addressable by its id, send the brief to that agent: it already holds the diff's reading. Otherwise spawn a fresh agent, in the background, with the brief as its whole prompt and nothing of this session; an arbiter reachable only through a transcript or a checkpoint counts as absent. Wait for the report.

Apply each finding that holds against the sources. Where one asks for context, add what the records hold. A finding that asks for what the sources lack stays open, and goes in the hand-off note of step 7. A finding the sources refute, or that overstates what it quotes, is ignored, with the fact that refutes it.

Then send the same agent the re-read message of the brief, with the open findings named and the ignored ones with their refutation, and wait again. Rounds go on until consensus, a round whose findings are all open ones or none, or until four rounds have run.

**Done when** a round reached consensus or four rounds ran, every finding applied or listed for the hand-off.

## 6. Humanize, final pass

Run `humanizer:humanizer` on the file in file mode, one pass over the whole text, so the critique's rewrites read like the rest.

**Done when** the pass ran.

## 7. Hand off and loop on the edits

Give the user the path, the shape chosen and why, the critique findings left open, and what to decide. They edit the file in their editor and ask for changes in the chat.

After each of their turns, before acting on it, re-read the file from disk and flag what their edits introduced: a claim the sources contradict, a name or acronym the maintainer may not know, an abbreviation from another language or a typo, a claim the rest of the text leans on and that is now gone. Then apply what they asked, and quote the changed passage in the reply.

**Done when** the user has said to open the PR, and the file was re-read since their last edit.

## 8. Open

- Scan the title, the body, its quotes and attachments for secrets and private details: a token, a home path, an internal host, a name the user kept out.
- `git push -u <remote> <branch>`.
- `gh pr create --repo <target> --base <base> --head <owner>:<branch> --title "$(head -1 <file>)" --body-file <(tail -n +3 <file>)`, ready for review rather than a draft, so the review bots run. Where it fails on a spent GraphQL rate limit, open it through REST: `gh api repos/<owner>/<repo>/pulls -f title=... -f head=<owner>:<branch> -f base=<base> -F body=@<body file>`.
- The body carries the whole case; a comment goes on the PR only when the user asks for one.
- The bookkeeping the project agent file asks for after a PR: a roadmap item closed, a handoff written.

**Done when** the diff is empty but for a trailing newline, the bookkeeping is done, and the reply gives the URL.

## 9. Refine this skill

Put to the user what the run taught: a step they had to ask for, a check that caught something, a rule they gave on the text, a shape no template fit. Write the approved changes in the source, `~/Documents/Dev/scrolls/skills/open-pr/` (`SKILL.md`, the template used, or a new template), bump `version`, copy the folder over `~/.claude/skills/open-pr/`, and commit in scrolls.

**Done when** the approved changes are committed in scrolls and the installed copy matches it.
