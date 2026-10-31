---
name: update-deps
description: Sweep a bun project's outdated dependencies and toolchain in verified batches, reading each release's notes before upgrading and adopting what they introduce.
argument-hint: '[package…]'
disable-model-invocation: true
version: 1.2.0
---

# Update Dependencies

An upgrade sweep runs in **batches**.
A batch is a set of version bumps applied together, verified, and committed as one unit, so a failure points at a known culprit.
A batch is **green** when the verification ladder passes on it, and **red** otherwise.
The **toolchain** is anything outside the dependency lists that pins a version of what the project runs or builds with.

Named arguments limit the sweep to those packages or tools; no arguments sweeps everything.
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

## Phase 1 — The ladder

Build the verification ladder, since every batch is proven with it.
Discover how this repo can be proven **green**, using whatever means are at your disposal: its own scripts and tasks first (`package.json` scripts, mise tasks, CI workflow steps), then anything you can construct — typecheck, lint, tests, build, a boot check that starts the dev or start script and waits for ready-or-crash before killing it, failing outright when its port is already bound, since a leftover server would answer for it, a curl against a route it serves, an existing Playwright setup.
Note the risk this ladder structurally cannot reach: anything user-visible only, such as rendering, styling, or animation, and whatever runs only in CI or a deployed image.

**Done when** the ladder is known and its blind spots are noted.

## Phase 2 — Triage

Triage produces the plan you approve.
It reads and greps the repo, and writes nothing to it.

1. **Inventory.**
   Run `bun outdated`.
   In a workspace, sweep every member as one inventory: a package appearing in several members is one triage unit whose version moves everywhere at once.
   Report version divergences between members rather than flattening them, since a deliberate pin in one member is a decision to respect.

   Then inventory the toolchain, reading every file that pins a tool:

   | Surface           | Read from                                                                             |
   | ----------------- | ------------------------------------------------------------------------------------- |
   | mise tools        | `mise outdated --bump --json`, keeping entries whose `source.path` is inside the repo |
   | mise itself       | `min_version` in `mise.toml` against `mise --version` and `jdx/mise`'s latest release |
   | CI actions        | `uses:` pins against each action's latest release                                     |
   | Images            | `FROM` lines, versions their `RUN` lines install, compose `image:` keys               |
   | Declared versions | `packageManager`, `engines`, `.nvmrc`, `.tool-versions`                               |

   A tool pinned on several surfaces is one triage unit, and its pins diverging is reported like a divergence between members.
   `engines` is a floor: it moves only when an adoption needs a newer one.
   `min_version = { soft = "<version>" }` records the mise the repo last passed on, and warns on an older one; the plain string form is a hard minimum that stops an older mise, so write the soft one.
   mise gets a batch whenever `min_version` is absent or differs from the version mise lands on; its span runs from `min_version`, or from the installed version when absent, and an empty span takes no research.

2. **Read the ledger.**
   `docs/agents/dependency-updates.md` records past skips.
   Honor a live skip without re-researching it.
   Re-evaluate a skip whose blocking condition now looks resolved — the blocker shipped, a newer release exists — and say in the plan that you did.
   A declined adoption stays out of the plan unless its reason no longer holds.

3. **Locate the sources.**
   `bun pm view <package> repository` gives a package's repo URL; a tool's is its project repo, and a `uses:` pin already names it.

4. **Read the notes.**
   Dispatch one research subagent per tool and per package, skipping only patch-only moves on packages at 1.0 or above, in parallel, in the background (Claude Code: `model: sonnet`, and do not use `run_in_background: false`).
   The brief they run is [research-brief.md](research-brief.md); hand each agent the name, the version span, the repo URL, and the repo root, and mark a tool as `toolchain`.
   Their verdicts are what you plan from — keep the verdicts, not the changelogs.

5. **Form the batches.**
   - First the toolchain, one tool per batch: mise, which installs the others, then the runtime, then the rest, so every later batch runs on them.
   - Then everything that moves within its existing semver range, as one batch (`bun update`).
   - Then out-of-range minors and patches whose notes are clean, grouped.
   - Then one major per batch, alone.
   - **Coupling overrides all of these**: peer-coupled packages move in the same batch even when that means several majors at once, because moving them apart is broken by construction.
     Read coupling from `peerDependencies` and from the notes — `react`/`react-dom`/`@types/react`, `eslint` and its plugins, `vitest` and `@vitest/*`, a framework and its adapters, a runtime and its `@types/*`.
   - A package or tool whose notes no rung of the brief could find is **unreviewed**: it stays out of the batches and is listed for your call.

6. **Present the plan and stop for approval.**
   The plan carries: the batches in order with their version spans, the ladder from Phase 1, the **offered adoptions**, the skips honored and re-evaluated, the declined adoptions honored, and the unreviewed units.
   Rank the offered adoptions across the whole sweep by gain against size, each with its batch, kind, sites, and size estimate.
   Mark each **recommended** when its gain is worth its size, and **optional** otherwise.
   Recommended adoptions are ticked by default and optional ones are not, so "go" takes the recommended set; the user unticks, ticks, declines with a reason, and confirms the ladder here.
   This is the single approval gate for the whole sweep.

**Done when** the user has approved a plan in which every outdated package and tool is accounted for as batched, skipped, or unreviewed.

## Phase 3 — Rounds

Run the approved batches in order.
Each round:

1. **Apply** the batch's versions and run `bun install`.
   A mise tool moves with `mise up --bump <tool>` then `mise install`, always naming the tool; every other surface moves by editing its pin.
   mise itself moves with `mise self-update --no-plugins`, run only when the installed mise is behind, which the plan flags as changing the machine, and `min_version` takes what `mise --version` then reports, since self-update skips releases younger than its minimum age.
   When a package manager owns the mise install and self-update refuses, pause with the command to run.
   Every pin of a tool moves in its batch.
   `bun upgrade` mutates the machine's global toolchain, so this skill never runs it.
2. **Adopt what the upgrade requires**: what it breaks, plus deprecations that now warn.
   These belong to the batch, since the upgrade is not done without them.
3. **Run the ladder.**
4. **On red, fix within bounds.**
   Rule findings from a linter or formatter are the user's call, one rule at a time: read [rule-decisions.md](rule-decisions.md) and run it in place of the attempt below.
   Apply the migration the notes prescribe.
   Allow one genuine attempt, plus one follow-up when the second failure is clearly the same cause.
   Still red: bisect the batch first when it holds several packages, so the blame lands on the real culprit rather than its neighbors, then `git reset --hard` back to the last checkpoint, write a ledger entry, and move to the next batch.
5. **On green, pause when the round earned your eyes.**
   Pause when either trigger fires: the batch carries risk the ladder cannot reach, or you wrote source changes beyond `package.json` and the lockfile.
   The pause message states the batch, a diff summary, and precisely what to smoke-test; the user replies go, revert, or adjust.
   A version-only batch that passes the ladder commits and rolls on without asking.
6. **Commit.**
   One commit per green batch, naming the packages and their version spans, in the repo's own commit convention (`chore(deps): …` where that is Conventional Commits).
7. **Commit each ticked adoption separately**, after its batch's commit, one commit each, so any one of them is droppable on its own.
   Run the ladder on each first; one still red after a genuine attempt is reset away and reported.

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

Write each docs-pass adoption the user declined with a reason the same way, since the next docs pass would find it again.
An adoption merely left unticked returns unticked in the next sweep.

```markdown
## <tool>

- **Declined adoption**: <the feature, and what it would change here>
- **Reason**: <the user's reason>
- **Date**: <YYYY-MM-DD>
```

Then report, in the session:

- batches landed, with their commits;
- skips written, with reasons;
- adoptions applied, required and offered;
- **needs your eyes**: each package or tool whose risk the ladder could not reach, with what to look at;
- unreviewed units, still waiting on your call.

**Done when** the ledger reflects every skip and declined docs-pass adoption of this sweep, and the report has been given.

## Resuming

There is no run-state file.
Re-invoking the skill re-triages: the inventory shows only what is left, the ledger supplies the live skips, and the commit series shows what landed.
The batch plan and the adoption picks are presented for approval again, being the parts that were never written down.
