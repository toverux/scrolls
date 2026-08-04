<!--
Version: 1.1.0
User-global CLAUDE.md template. It contains stuff I can't put anywhere else and still want to share.
Copy only what is needed.
-->

# Global instructions

## Memory

- Consider your auto memory to be readonly, only the user can tell you when you can write it.
- You can still remove or edit stale memories implicitly.

## Subagents

- Never pass `run_in_background: false`, including where the agent's result is the next thing needed. Block on the notification rather than on the call.

## Editing files

- Apply text edits with your native editing tools rather than shell script, heredoc or other workaround.
- Reach for a script only where the edit is genuinely bulk and mechanical — one substitution across many files — and read a changed file back afterward.

## Windows environment

- In Git Bash, `sed` silently no-ops when the pattern contains emoji or other multibyte characters; use the editing tool instead for such lines.
- Node cannot read a Git Bash POSIX path (`/tmp/x.ts`, `$PWD`); pass a real Windows path from `pwd -W`. A tool that bows out quietly on an unreadable file will make every case look like it passed.
- Git Bash `ln -s` copies the target instead of linking it unless the command carries `MSYS=winsymlinks:nativestrict`; confirm with `ls -la` that the entry shows `-> target`, since a silent copy looks right until git records a regular file.
- Python's text-mode write rewrites every line ending to CRLF: `io.open(p, 'w', encoding='utf-8')` turns an LF file into a CRLF one while applying the intended edit correctly, so a bulk edit lands as a whole-file diff on a tracked file. Open in binary, or pass `newline=''`.
- In PowerShell, `gh api --jq` fails when the expression carries backslash-escaped quotes (`select(.type==\"blob\")`) — jq receives the literal backslashes and errors on `unexpected token "\"`. Write the expression quote-free (`.tree[].path`) or run the command through the Bash tool.

## Git commits

- Do not hard-wrap commit message lines to a fixed width; let lines run their natural length.
- Do not add Co-Authored-By trailers to commits.
