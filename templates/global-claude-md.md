<!--
Version: 1.3.0
User-global CLAUDE.md template. It contains stuff I can't put anywhere else and still want to share.
Copy only what is needed.
-->

# Global instructions

## Who am I

I am Morgan (@toverux), a developer with a passion for open source and modding.
Here are some projects of mine, so when you encounter one of those referenced from another, you know you can act on it and they are /compound candidates for improvements.

- toverux/cantrips: my agentic development loop, you can propose updates to IDEAS.md when issues are encountered with its skills.
- toverux/scrolls: my templates for global or project-scoped agent files, code styles, reusable hooks. Might want to update when a local fork is updated.
- toverux/blanc-hopital-config: my configs for TypeScript and oxc linter/formatter. They can be updated from outside when performing dependencies upgrade.
- toverux/HallOfFame: my main Cities Skylines 2 mod, can be used as a reference for good practices when working on another mod's setup.
- CitiesSkylinesModding/agents-plugins: you can propose updates to ROADMAP.md from a mod repo when you have issues/gaps with the skills and MCP servers it provides (gameface, unity-devtools, cs2-modding).

## Memory

- Consider your auto memory to be readonly, only the user can tell you when you can write it.
- You can still remove or edit stale memories implicitly.
- Auto memory _is_ a /compound candidate.
- Do not store narration in memory, only long-term facts about personal repo preferences I cannot store elsewhere.
- Use /writing-for-agents when editing memory.

## Recommendations

- Recommend the option with the best outcome; state cost and scope as facts beside it.

## Subagents

- Never pass run_in_background: false, including where the agent's result is the next thing needed. Block on the notification rather than on the call.
- Pass model: "opus" on Agent dispatches for review work — finders, verifiers and sweep agents.
- All other subagents stay on the default model unless the user says otherwise.
- Write no scaffolding files to brief them. Put the briefing in the prompt, however many agents repeat it.

## Editing files

- Apply text edits with your native editing tools rather than shell script, heredoc or other workaround.
- You can however ignore the previous instruction when the edit is bulk and mechanical.

## Linux/Unix environment

- Commands run under zsh: quote globs in arguments, and hold path lists in arrays.

## Windows environment

- In Git Bash, `sed` silently no-ops when the pattern contains emoji or other multibyte characters; use the editing tool instead for such lines.
- Node cannot read a Git Bash POSIX path (`/tmp/x.ts`, `$PWD`); pass a real Windows path from `pwd -W`. A tool that bows out quietly on an unreadable file will make every case look like it passed.
- Git Bash `ln -s` copies the target instead of linking it unless the command carries `MSYS=winsymlinks:nativestrict`; confirm with `ls -la` that the entry shows `-> target`, since a silent copy looks right until git records a regular file.
- Python's text-mode write rewrites every line ending to CRLF: `io.open(p, 'w', encoding='utf-8')` turns an LF file into a CRLF one while applying the intended edit correctly, so a bulk edit lands as a whole-file diff on a tracked file. Open in binary, or pass `newline=''`.
- In PowerShell, `gh api --jq` fails when the expression carries backslash-escaped quotes (`select(.type==\"blob\")`) — jq receives the literal backslashes and errors on `unexpected token "\"`. Write the expression quote-free (`.tree[].path`) or run the command through the Bash tool.
- `pwsh -Command "…"` needs `&` before a quoted program path, since a quoted first token parses as an expression, and a trailing `; exit $LASTEXITCODE` to preserve the exit code — the wrapper reports every non-zero exit as 1, silently breaking any protocol keyed on a specific code.
- `bash` on the Windows PATH is the WSL stub, not Git Bash: Git for Windows puts only its `cmd` directory there, with `bash.exe` in the sibling `bin`. Name it by full path; WSL bash sees a Linux filesystem and cannot reach Windows paths at all.

## Git commits

- Do not hard-wrap commit message lines to a fixed width; let lines run their natural length.
- Do not add Co-Authored-By trailers to commits.
