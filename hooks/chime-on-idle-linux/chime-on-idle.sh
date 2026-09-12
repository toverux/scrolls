#!/usr/bin/env bash
# Version: 1.0.0

# Stop hook: chime only when the turn ends with nothing still running AND the
# wait was long enough to be worth announcing.
#
# Stop fires at the end of every turn, including the one that dispatches a
# background agent and hands control back while it works, and again each time
# a completion re-invokes the agent. background_tasks distinguishes "done"
# from "handed off"; the elapsed check distinguishes "you walked away" from
# "you are sitting here reading".
#
# Requires jq, pw-play (PipeWire), and a chime.wav beside this script, such as
# a copy of C:\Windows\Media\Windows Proximity Connection.wav.

min_seconds=300
dir=$(dirname "$0")

input=$(cat)
id=$(jq -r '.session_id // empty' <<<"$input" 2>/dev/null) || exit 0
pending=$(jq '[.background_tasks[]? | select(.status == "running")] | length' \
  <<<"$input" 2>/dev/null) || exit 0

# No stamp means a session older than this hook, or a Stop with no prompt
# behind it. Stay quiet rather than guess, since the whole point is less noise.
stamp="$dir/state/$id.start"
[ -n "$id" ] && [ -f "$stamp" ] || exit 0
elapsed=$(( $(date +%s) - $(cat "$stamp") ))

[ "$pending" -eq 0 ] && [ "$elapsed" -ge "$min_seconds" ] || exit 0

# Detached so the hook exits promptly while the sound plays out.
setsid -f pw-play "$dir/chime.wav" >/dev/null 2>&1 </dev/null

exit 0
