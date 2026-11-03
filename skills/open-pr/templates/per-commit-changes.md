# Per-commit changes

Fits a branch whose commits stand on their own, a fix, a feature or a cleanup each, and a maintainer reads one at a time.

## Skeleton

```markdown
<Title: the theme, then the changes named.>

<One or two sentences: how many changes, and where in the code they are.>

## <n>. <commit title as committed, prefix included> (<short hash>)

**The problem.** <What the user or a dependent hits, or lacks, from the action that shows it.>

**Why.** <The mechanism behind it: what outlives what, what runs before what, what the code never handled.>

**The change.** <What the commit does, in the code's names. Another paragraph or a list where the change has a precondition or several parts.>
```

## Rules

- Sections in branch order, numbered from 1, and a section refers to another by its number ("fix 3").
- The heading is the commit's title, prefix included, and ends with the bare short hash in parentheses: GitHub links a bare hash and leaves one in backticks as text.
- The same three labels on every section, so a reader skims by label.
- **The problem** leads with what is visible; an exception name or a log line comes after it.
- Where the change depends on an order of events, list the orderings, one per line.
