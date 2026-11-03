# Measured series

Fits a branch of several commits toward one measured outcome, where the maintainer wants the result first and the steps after.

## Skeleton

```markdown
<Title: the outcome.>

<The problem as the user meets it, and the headline result.>

<The section of benchmark.md, headed "Before and after".>

## The commits

### <n>. <commit title as committed, prefix included> (<short hash>)

<What the code did, what it does now, and this commit's own numbers where the record has them.>
```

## Rules

- Commit sections in branch order, numbered; the heading ends with the bare short hash in parentheses, which GitHub links.
- The table gives the branch's numbers; each commit section gives its own where measured.
- Under a commit whose design the maintainer could question, a "Why this shape" list: one line per alternative, with what it would have cost.
