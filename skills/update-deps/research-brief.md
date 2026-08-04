# Research brief

The prompt each release-notes research agent runs, one agent per package.
Hand it the package name, the current and target versions, the repository URL, and the repo root.

## The brief

> You are reading the release notes for **`<package>`** moving from **`<current>`** to **`<target>`** in the repo at `<repo root>`, and reporting what that upgrade means for _this_ codebase.
>
> **Find the notes**, taking the first rung that yields them:
>
> 1. `gh release list --repo <owner>/<repo>` and `gh release view`, restricted to the releases between the two versions.
>    `<repo url>` arrives in registry form (`git+https://github.com/owner/repo.git`); strip it to `owner/repo` for `gh`.
>    A repository hosted anywhere but GitHub skips straight to rung 3.
>    In a monorepo, releases are tagged per package (`@scope/pkg@1.2.3`) — filter on this package's tag prefix and ignore its siblings.
> 2. The repository's `CHANGELOG.md`, via `gh api repos/<owner>/<repo>/contents/CHANGELOG.md`, reading the sections covering the span.
>    In a monorepo, the changelog next to the package's own `package.json`.
> 3. A `WebFetch` of the project's documentation or releases page.
>
> When no rung yields notes, say so and report nothing else; a guessed verdict is worse than none.
>
> **Then grep this repo** for what the notes name.
> A breaking change matters only where the code touches it, and a new API matters only where the old one is used.
> Search for the imports, exports, config keys, and CLI flags the notes mention, and record the call sites you find with `file:line`.
>
> **Report exactly this shape, and nothing more:**
>
> ```markdown
> ## <package> <current> → <target>
>
> - **Notes**: <where they came from, or "none found">
> - **Risk**: none | low | breaking
> - **User-visible only**: yes | no ← yes when the change shows up in rendering, styling, or animation rather than in a typecheck or a test
> - **Breaking changes**: for each, one line naming the change and the call sites in this repo (`file:line`), or "none affecting this repo"
> - **Deprecations now warning**: same shape, or "none"
> - **New APIs worth adopting**: for each, one line naming it, the call sites it would replace (`file:line`), and a size estimate in files touched, or "none"
> - **Peer coupling**: packages that must move in the same batch, or "none"
> - **Migration size**: trivial | small | large, in one clause
> ```
>
> Keep every line to a claim you verified.
> Report zero findings rather than plausible ones.
