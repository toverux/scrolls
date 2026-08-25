# Rule decisions

A linter or formatter goes red differently from a library: nothing broke, a tool changed its mind.
Each finding is a judgement call belonging to the user, one rule at a time, so this replaces Phase 3's fix-within-bounds attempt rather than following it.

Every finding reaches the user as a numbered proposal before you edit anything.

## Legwork before proposing

Per rule that fires:

- **Link it.** Find the rule's documentation page and carry the URL into the proposal.
- **Count it.** Findings, and the files they span. A rule firing hundreds of times across most of the tree and a rule firing once are different decisions and read differently.
- **Test its options.** A rule that takes options may be configurable into agreement: run it configured and count again. Report what the count did — an option that makes it worse is the argument for turning the rule off, and it is an argument you measured.
- **Split it by cause.** One rule fires on an architectural clash at some sites and a real defect at others. Those are separate proposals with separate numbers, however single a rule they are to the tool.

**Done when** every finding sits under a numbered proposal.

## The proposal

Number them so the user can answer by number, one proposal per cause:

- the rule, linked
- how many findings, across how many files
- one representative site as `file:line`, or for a formatter, the hunk it would write
- what it fires on _here_ — the pattern in this codebase, not the rule's own description
- your recommended disposition and what it costs

## Dispositions

The user answers each proposal with one of:

- **upstream** — the shared config package the repo extends. For a rule about taste rather than this project, so the answer lands in every repo at once. Costs a release of that package and a bump in each consumer, which holds the batch until it ships.
- **repo** — this repo's own lint config. For a rule that fights something this project does and others do not.
- **site** — an inline suppression carrying its reason. For a one-off.
- **code** — change the code to satisfy the rule, or accept the formatter's hunk.

Reach for **site** while the sites are few and **repo** once they are many: a config entry also silences the rule for code nobody has written yet.

## What a disable hides

A rule turned off for an architectural clash stops catching the defects it was built for.
Where a proposal's findings split by cause, name what goes unwatched once the rule is off, and carry the genuine defects into their own **code** proposal — they outlive the rule that found them.
