# Benchmark section

The numbers of a branch that has them, added to any shape: after the change in a single change, first in a measured series.

## Skeleton

```markdown
## <Numbers | Before and after>

<Conditions: the hardware and its pinning, the data sizes, what was timed from where to where, how many runs, what was held still.>

|                   | <scale A> | <scale B> |
| ----------------- | --------- | --------- |
| <measure>, before |           |           |
| <measure>, after  |           |           |

<A video or screenshot, where one exists.>
```

## Rules

- The conditions precede the table, as the record states them; a number without its conditions is left out.
- Each table names its own baseline (`against main`, `against the first commit`); "measured the same way" under a second table reads as the first table's baseline.
- Rows pair before and after per measure, or the columns do (`main` against the branch) when every row has one scale.
- A range (`75-77 ms`) stands where the runs spread; a single figure where they agreed.
- Memory and allocation counts sit beside the timings when the record has them.
