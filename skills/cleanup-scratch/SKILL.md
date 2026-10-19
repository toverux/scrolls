---
name: cleanup-scratch
description: Triage the current repo's .scratch/ once its work has landed, delete what is dead on evidence, and keep only what an agent file points to, every keep gated and the learnings handed to /compound.
argument-hint: '[facts or overrides, free text]'
disable-model-invocation: true
version: 1.0.0
---

# Clean up .scratch

`.scratch/` is a repo's gitignored working material: feature folders, notes, tools, fixtures, data.
A run leaves it holding only what a future session needs, each entry reached through a pointer in an untracked agent file, and harvests the knowledge of what it deletes before deleting it.
It covers the current repo's `.scratch/` only; without one, say so and stop.

The arguments, when given, are facts and overrides from the user: what has closed, what to keep, what to treat as dead.
A stated fact counts as evidence; an instruction to keep an entry keeps it.

The harvest runs through cantrips' `/compound`; it needs the cantrips plugin.

## 1. Read the repo

Read the agent files: `CLAUDE.local.md`, `AGENTS.md` or `CLAUDE.md`, the loop config (`docs/agents/cantrips-loop.md` or the copy the agent file names), and the project's skills.
Note every line that points into `.scratch/`, and which work is delivered: `git branch --merged <default branch>`, `gh pr list --state all --head <branch>`, and the `Status: resolved` lines of a feature folder's tickets.

**Done when** each `.scratch/` pointer and each branch or feature with work in `.scratch/` is listed with its state.

## 2. Triage

Walk `.scratch/` entry by entry, descending into any folder that mixes live and dead content, and give each entry one verdict:

- **Dead**, on evidence you can name:
  1. Regenerable output: `bin/`, `obj/`, `build/`, `dist/`, `out/`, `node_modules/`, or anything a script beside it produces.
  2. A copy of a kept entry, such as an archive's extracted contents beside the archive.
  3. Superseded by a kept tool, such as a wait script that a fuller game-control script also covers.
  4. Closed work: a feature folder, or material that served one piece of work, once that work is delivered: its tickets resolved, and its branch merged or its PR open.
- **Kept, pointed**: an agent file already points to it. The pointer outweighs Dead 1 to 3; closed work outweighs the pointer.
- **Keep proposal**: no evidence makes it dead. It needs a pointer, so draft the line it would get.
- **Move**: kept or proposed, in a better place (a stray script into `tools/`). Its pointer or proposal names the new path; repoint whatever the move breaks.

For each entry read, find copies deployed or installed from it outside `.scratch/`, through its build files and scripts (a deploy path, an install target) and the agent files.
Mark the outside copy for removal, noting the files only it holds.

While reading, collect the **knowledge** that dead entries and keep proposals hold and that should outlive them: a finding, a root cause, a measured number, a reusable procedure.

**Done when** every entry carries a verdict, each dead one with its evidence.

## 3. Gate

Put one list to the user, each item answered on its own.
Where this session engaged a deputy through `/deputy` and has not dismissed it, what is put to the user here goes to the deputy instead, as `/deputy`'s ROUNDS.md says, and the deputy's reply is printed verbatim under a one-line header before anything acts on it; otherwise it goes to the user as written.

- Each keep proposal: its pointer line, in `CLAUDE.local.md`.
- Each pointer fix: a line naming a path that is gone or that this run deletes or moves, reworded or removed. A line describing a file created on demand (a roadmap kept only while work is open) stands.
- Each outside copy marked for removal, with the files only it holds.

A refused keep proposal turns its entry dead; a refused outside removal is left as it is; a refused pointer fix keeps its line, and the entry it names stays where it is, neither moved nor deleted.

Write the approved lines under `/writing-for-agents`, to fit the lines around them.
Pointers into `.scratch/` go to `CLAUDE.local.md` only: a tracked file citing them dangles wherever the folder is absent.
When the repo has no `CLAUDE.local.md`, create it with a `# CLAUDE.local.md` heading.
Place each pointer in the section listing `.scratch/` documents, or under a new `## Local documents` section, one line each: the path, what it is, when to reach for it.

Where anything was harvested, run `/compound` with the knowledge harvested from the entries now dead as its arguments; it gates and routes each piece itself.
Its stop and its closing pointer end `/compound`, not this run: carry the pointer to the report and go on to step 4.

**Done when** every approved line is written, and `/compound`, where it ran, has written what it approved.

## 4. Act

Delete every dead entry, the refused keeps included, and make the moves.
Bring the files only an approved outside copy holds into its entry where that entry is kept, then remove the outside copy.

**Done when** `find .scratch` shows only kept entries, and every `.scratch/` path the agent files name exists, is a file created on demand, or sits in a line the user kept at the gate.

## 5. Report

List what was deleted with its evidence, what moved where, what was kept and through which pointer, the outside copies removed, and the size before and after (`du -sh .scratch`), then end on `/compound`'s closing pointer where it gave one.
