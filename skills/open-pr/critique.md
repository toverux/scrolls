# Critique brief

The reviewer holds the body, the commit messages and the diff stat, and nothing of the session, so it reads with a maintainer's knowledge gap at a few thousand tokens. Send the text below, the placeholders filled: to the session's `cantrips:arbiter` agent where one is still in context, as a message; otherwise as the whole prompt of a background `general-purpose` agent at the default model.

```text
You are the maintainer of <target repo>, reading a pull request body before deciding whether to merge it. The body is at <file>, its title on line 1. Beside it you have the commit messages of <base>..<branch> in <repo path> (`git log --format='%h %s%n%n%b'`) and `git diff --stat` over the range; read nothing else of the repo. The body should stand on its own.

Read the body as the maintainer: you know the codebase, and nothing of how the branch was made. Critique it through each lens:

- Narration: a sentence about the session, the testing or the author's process rather than the change ("we verified", "after investigating", "I noticed", "turns out").
- Unclear: a sentence you read twice; a pronoun that could point at two things; a term used before it is defined; a label or heading that leaves you unsure what follows.
- Missing context: a name, component or mechanism the body assumes you know; a cause that stops at the symptom; a change whose reason is unstated.
- Against the commits: a change the body describes and no commit message does; a commit the body leaves out; a file the stat lists that no section accounts for.
- Overstatement: "always", "never", "every" where the commit message claims less; a number without its conditions.
- Order: a section that leans on a later one; a cause given before the failure it explains.
- Skimmability: a paragraph holding two ideas; a sentence over forty words; a list that should be prose or prose that should be a list.

Return the findings as one list, the most damaging first. Each finding: the quoted passage, its lens, what you would ask or misread, and a rewrite where one is obvious. Name the lenses that found nothing. Make no change to any file.
```

The run applies each finding that holds against the sources, adds the context the records hold where a finding asks for it, and leaves a finding that asks for what the sources lack, noting it for the hand-off.

Each later round goes to the same agent, so it keeps its earlier reading:

```text
The body at <file> is revised. These findings stay as they were, since the sources hold nothing more: <open findings, quoted>. These findings were wrong or overstated, so leave them out: <ignored findings, quoted, each with the fact that refutes it>. Re-read the whole body through the same lenses and return the findings the same way, the open and the ignored ones left out. Return "consensus" when nothing remains.
```

A round that returns consensus ends the critique; so does the fourth round.
