<!--
Version: 1.0.0
-->

# CLAUDE.md

## Project overview

`scrolls` is a personal library of agent-facing configuration — rules, templates, hooks, tool configs — kept in one place so every project can be updated from a single source.
Nothing here is imported: consumers **copy** a file into their project and adapt it.
That copy-not-import model drives every other rule below — an artifact must stand alone, and it must carry a version so a consumer can tell their copy is stale.

## Tech stack

- [mise-en-place](https://mise.jdx.dev): manages dev tools (bun, node), env vars, and tasks.
- oxlint + ofxmt: lint and format; both extend `@toverux/blanc-hopital`, which also supplies the tsconfig bases.
- lefthook: pre-commit hooks running tsc/oxlint/oxfmt on staged files.

## Repository structure

- `rules/`: Agents rules, notably code styles.
- `skills/`: agent skills, one `<name>/SKILL.md` per skill plus its reference files, copied to `~/.claude/skills/`.
- `templates/`: starter files copied and filled in per project (`agents-md.md`, `.editorconfig`, etc.).
- `hooks/`: executable TypeScript agent hooks.

## Commands

- `mise check:agents`: same, with output optimized for agents.
- `mise fix`: auto-fix lint then formatting, in place. Run once when you're done editing a batch of files.

`mise tasks` lists everything; arguments pass through (`mise some:task --some-arg`).
Do NOT use npx; prefer mise shortcuts, or bun/bunx when no shortcut exists.

Run the check command after editing, at the end of the session rather than mid-flight.

## Guidelines

- **Bump the version on every semantic edit.** Artifacts carry their version in frontmatter (`rules/`) or a header comment (`hooks/`, `templates/`); consumers diff against it to decide whether to re-copy. Semver: breaking rewording or removed guidance is major, new guidance is minor, typo or clarification is patch. Skip the bump for edits that cannot change a consumer's behavior.
- **Write every artifact to survive the copy.** No relative links to other files in this repo, no assumption that a sibling scroll came along. What an artifact needs, it states.
- Rule and template prose is read by an agent every turn it applies. Cut lines that don't change behavior; loading is the cost, wording is the product.

## Preferred agent behavior

- Start by inspecting existing patterns.
- Prefer LSP over Grep/Glob/Read for code navigation.
- When uncertain, state the assumption and proceed conservatively.
- Actively propose updates to `CLAUDE.md`, comments, or other docs when you detect drift.
