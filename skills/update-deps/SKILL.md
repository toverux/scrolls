---
name: update-deps
description: Sweep a bun project's outdated dependencies in verified batches, reading each release's notes before upgrading and adopting the APIs they introduce.
argument-hint: '[package…]'
disable-model-invocation: true
version: 1.0.0
---

# Update Dependencies

An upgrade sweep runs in **batches**.
A batch is a set of version bumps applied together, verified, and committed as one unit, so a failure points at a known culprit.
A batch is **green** when the verification ladder passes on it, and **red** otherwise.

Named arguments limit the sweep to those packages; no arguments sweeps everything.
Coupled packages join the sweep even when unnamed, and the plan says so.

## Phase 0 — Guards

Stop and say why when any of these fails:

- `bun.lock` is present at the repo root.
  This skill speaks bun only.
- The working tree is clean.
  The sweep's safety rests on reverting to a known commit.

On the repository's default branch, create `chore/deps-<YYYY-MM-DD>` and work there.
On any other branch, stay on it.

**Done when** the guards pass and the working branch is settled.

## Phase 1 — The ladder, then batch zero

Build the verification ladder first, since every batch from here on is proven with it.
Discover how this repo can be proven **green**, using whatever means are at your disposal: its own scripts and tasks first (`package.json` scripts, mise tasks, CI workflow steps), then anything you can construct — typecheck, lint, tests, build, a boot check that starts the dev or start script and waits for ready-or-crash before killing it, a curl against a route it serves, an existing Playwright setup.
Note the risk this ladder structurally cannot reach: anything user-visible only, such as rendering, styling, or animation.

Then batch zero.
When `mise.toml` pins bun, the runtime is a repo-scoped dependency and moves like any other: run `mise up --bump bun`, then `mise install`, verify with the ladder, and commit.

When no `mise.toml` pins bun, leave bun alone.
`bun upgrade` mutates the machine's global toolchain, so this skill never runs it.

**Done when** the ladder is known, and the pin is bumped and green or its absence is noted.

## Phase 2 — Triage

Triage produces the plan you approve.
It reads and greps the repo, and writes nothing to it.

1. **Inventory.**
   Run `bun outdated`.
   In a workspace, sweep every member as one inventory: a package appearing in several members is one triage unit whose version moves everywhere at once.
   Report version divergences between members rather than flattening them, since a deliberate pin in one member is a decision to respect.

2. **Read the ledger.**
   `docs/agents/dependency-updates.md` records past skips.
   Honor a live skip without re-researching it.
   Re-evaluate a skip whose blocking condition now looks resolved — the blocker shipped, a newer release exists — and say in the plan that you did.

3. **Locate the sources.**
   `bun pm view <package> repository` gives the repo URL.

4. **Read the notes.**
   Dispatch one research subagent per package whose version span needs reading, in parallel, in the background (Claude Code: `model: sonnet`, and do not use `run_in_background: false`).
   The brief they run is [research-brief.md](research-brief.md); hand each agent the package, the version span, the repo URL, and the repo root.
   Their verdicts are what you plan from — keep the verdicts, not the changelogs.

5. **Form the batches.**
   - Round 1: everything that moves within its existing semver range, as one batch (`bun update`).
   - Then out-of-range minors and patches whose notes are clean, grouped.
   - Then one major per batch, alone.
   - **Coupling overrides all three**: peer-coupled packages move in the same batch even when that means several majors at once, because moving them apart is broken by construction.
     Read coupling from `peerDependencies` and from the notes — `react`/`react-dom`/`@types/react`, `eslint` and its plugins, `vitest` and `@vitest/*`, a framework and its adapters.
   - A package whose notes no rung of the brief could find is **unreviewed**: it stays out of the batches and is listed for your call.

6. **Present the plan and stop for approval.**
   The plan carries: the batches in order with their version spans, the ladder from Phase 1, the optional adoptions offered per batch with call-site counts and size estimates, the skips honored and re-evaluated, and the unreviewed packages.
   You tick the optional adoptions and confirm the ladder here; this is the single approval gate for the whole sweep.

**Done when** the user has approved a plan in which every outdated package is accounted for as batched, skipped, or unreviewed.

## Phase 3 — Rounds

Run the approved batches in order.
Each round:

1. **Apply** the batch's versions and run `bun install`.
2. **Adopt what the upgrade requires**: what it breaks, plus deprecations that now warn.
   These belong to the batch, since the upgrade is not done without them.
3. **Run the ladder.**
4. **On red, fix within bounds.**
   Apply the migration the notes prescribe.
   Allow one genuine attempt, plus one follow-up when the second failure is clearly the same cause.
   Still red: bisect the batch first when it holds several packages, so the blame lands on the real culprit rather than its neighbors, then `git reset --hard` back to the last checkpoint, write a ledger entry, and move to the next batch.
5. **On green, pause when the round earned your eyes.**
   Pause when either trigger fires: the batch carries risk the ladder cannot reach, or you wrote source changes beyond `package.json` and the lockfile.
   The pause message states the batch, a diff summary, and precisely what to smoke-test; the user replies go, revert, or adjust.
   A version-only batch that passes the ladder commits and rolls on without asking.
6. **Commit.**
   One commit per green batch, naming the packages and their version spans, in the repo's own commit convention (`chore(deps): …` where that is Conventional Commits).
7. **Commit each approved optional adoption separately**, after its batch's commit, one commit each, so any one of them is droppable on its own.

**Done when** every batch has been landed, or reverted and written to the ledger.

## Phase 4 — Ledger and report

Write every skip to `docs/agents/dependency-updates.md`, one entry per package:

```markdown
## <package>

- **Skipped**: <current> → <target>
- **Reason**: <what stopped it, with the error when there was one>
- **Blocked until**: <the condition that would unblock it>
- **Date**: <YYYY-MM-DD>
```

Then report, in the session:

- batches landed, with their commits;
- skips written, with reasons;
- adoptions applied, required and optional;
- **needs your eyes**: each package whose risk the ladder could not reach, with what to look at;
- unreviewed packages, still waiting on your call.

**Done when** the ledger reflects every skip of this sweep and the report has been given.

## Resuming

There is no run-state file.
Re-invoking the skill re-triages: `bun outdated` shows only what is left, the ledger supplies the live skips, and the commit series shows what landed.
The batch plan and the optional adoption picks are presented for approval again, being the parts that were never written down.
