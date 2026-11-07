# Per-commit changes

Fits a branch whose commits stand on their own, a fix, a feature or a cleanup each, and a maintainer reads one at a time.

## Skeleton

```markdown
<Title: the theme, then the changes named.>

<One or two sentences: how many changes, and where in the code they are.>

## <n>. <commit title as committed, prefix included> (<short hash>)

<The problem: what the user or a dependent hits, or lacks, from the action that shows it, opening "Currently, …" where the reader could take it for the new behavior.>

<Why: the mechanism behind it, what outlives what, what runs before what, what the code never handled.>

<The change: what the commit does, in the code's names. Another paragraph or a list where the change has a precondition or several parts.>
```

## Rules

- Sections in branch order, numbered from 1, and a section refers to another by its number ("fix 3").
- The heading is the commit's title, prefix included, and ends with the bare short hash in parentheses: GitHub links a bare hash and leaves one in backticks as text.
- The same three paragraphs in the same order on every section, with no label on them, so a reader skims by position.
- The problem paragraph leads with what is visible; an exception name or a log line comes after it.
- Where the change depends on an order of events, list the orderings, one per line.
