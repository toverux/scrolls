# Research brief

The prompt each release-notes research agent runs, one agent per package or tool.
Hand it the name, the current and target versions, the repository URL, and the repo root, and mark a tool as `toolchain`.

## The brief

> You are reading the release notes for **`<name>`** moving from **`<current>`** to **`<target>`** in the repo at `<repo root>`, and reporting what that upgrade means for _this_ codebase.
>
> **Find the notes**, taking the first rung that yields them:
>
> 1. `gh release list --repo <owner>/<repo>` and `gh release view`, restricted to the releases between the two versions.
>    `<repo url>` arrives in registry form (`git+https://github.com/owner/repo.git`); strip it to `owner/repo` for `gh`.
>    A repository hosted anywhere but GitHub skips straight to rung 3.
>    In a monorepo, releases are tagged per package (`@scope/pkg@1.2.3`) — filter on this package's tag prefix and ignore its siblings.
> 2. The repository's `CHANGELOG.md`, via `gh api repos/<owner>/<repo>/contents/CHANGELOG.md`, reading the sections covering the span.
>    In a monorepo, the changelog next to the package's own `package.json`.
> 3. A `curl` of the project's documentation or releases page, since `WebFetch` summarizes a long page and loses items.
>
> Read the notes to their end, in parts when they are long, and name anything left unread under **Notes**.
> When no rung yields notes, say so and report nothing else; a guessed verdict is worse than none.
>
> **Then grep this repo for what breaks.**
> A breaking change matters only where the code touches it.
> Search for the imports, exports, config keys, and CLI flags the notes mention, and record the call sites you find with `file:line`.
> A change to a module this repo's code never names can still reach it through a dependency: run `bun pm why <module>` on each such module the notes name, and record the chain.
> This pass is done when every breaking change in the notes has its call sites or a search that found none.
>
> **Then hunt adoptions.**
> A feature this repo has not adopted is absent from it under its own name, so search by problem: for each feature in the notes, ask what code it makes needless, and search for that shape.
> Report every candidate of these kinds:
>
> - **replace**: hand-written code the feature does
> - **drop**: a dependency, polyfill, shim, `patches/` entry, `@ts-expect-error`, or workaround it makes needless, including the workarounds in `docs/agents/dependency-updates.md`
> - **config**: an option, default, or flag this repo should set
> - **capability**: something this repo lacks and the feature gives it
>
> The sweep's lead ranks the candidates, so state each one's gain and size and leave the verdict on its worth to them.
>
> **For a `toolchain` unit, hunt its current documentation too**, past the version span: a runtime or build tool may already ship what a `package.json` dependency or hand-written code does here, and features older than `<current>` appear in no span you will read.
>
> **Report exactly this shape, and nothing more:**
>
> ```markdown
> ## <name> <current> → <target>
>
> - **Notes**: <where they came from, or "none found">
> - **Risk**: none | low | breaking
> - **User-visible only**: yes | no ← yes when the change shows up in rendering, styling, or animation rather than in a typecheck or a test
> - **Breaking changes**: for each, one line naming the change and the call sites in this repo (`file:line`), or "none affecting this repo"
> - **Deprecations now warning**: same shape, or "none"
> - **Adoptions**: for each, one line naming its kind, the feature, where it lands (`file:line` or a package name), its gain in one clause, a size estimate in files touched, and what only a trial can settle, or "none"
> - **Peer coupling**: packages that must move in the same batch, or "none"
> - **Migration size**: trivial | small | large, in one clause
> ```
>
> Keep every line to a claim you verified: for an adoption, that you read where it lands.
> Report a candidate however small, and zero rather than one with nowhere to land.
