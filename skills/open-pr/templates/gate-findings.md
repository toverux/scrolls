# Review findings section

Added last to any shape under `--disclose-gate`, on a branch that went through `/review-gate`: every finding the gate recorded, with its verdict, ruling and outcome.

## Source

The gate's state file, which the findings script keeps under `$TMPDIR/cantrips-<uid>/review-gate/`, one JSON per run: its `findings` list holds each numbered finding's location, summary, verdict, ruling and outcome, and its `refuted` list the refuted ones, which carry no ID. Where a reboot cleared it, rebuild it from the session transcript: each `findings.ts` call's input JSON and printed block hold the same data. Take the run on the PR's final branch only.

## Skeleton

```markdown
## Review findings

An automated review by AI agents ran <rounds> rounds over the branch and recorded <total> findings: <n> fixed, <n> declined as not worth changing here, <n> refuted, <n> skipped and <n> that needed no change.

<details>
<summary>All review findings (<total>)</summary>

| ID  | Round | Where         | Finding   | Verdict   | Ruling | Outcome |
| --- | ----- | ------------- | --------- | --------- | ------ | ------- |
| F1  | 1     | <file>:<line> | <finding> | CONFIRMED | fix    | fixed   |

</details>
```

## Rules

- Every finding of the run, refuted ones included, in ID order; refuted findings last, with `-` as the ID and as the ruling.
- The blank line after `<summary>` stays: without it GitHub renders the table as text.
- Where: the short path and line. A file the PR doesn't carry (gitignored notes) reads "my local notes"; a file whose extension the lint refuses in prose (`.md`, `.json`, `.py`) reads as its human title ("English strings, line 45").
- Finding: one plain sentence of at most 25 words, from the finding's summary and evidence, with nothing they don't say.
- Ruling: `fix`, or `declined:` and the arbiter's reason in at most 10 words.
- Outcome: `fixed`, `no change needed`, `skipped:` and its reason in at most 10 words, `parked`, or `refuted`.
- The opening line's counts add up to the table's rows; a fix the arbiter raised itself counts as fixed.
- "to" for a range, never a dash.
