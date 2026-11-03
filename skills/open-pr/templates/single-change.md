# Single change

Fits a branch that makes one improvement, in one commit or in several that only make sense together.

## Skeleton

```markdown
<Title: the commit title, or the outcome.>

<The problem as the user meets it, and what the code did that cost it.>

<The change, one paragraph per part, in the code's names.>

<Known trade-offs, one paragraph, where there are any; several known limits, a short list under "Known limits".>
```

## Rules

- A trade-off is stated as a fact beside the gain, with its cost.
- A branch with measurements adds the section of [`benchmark.md`](benchmark.md) after the change.
