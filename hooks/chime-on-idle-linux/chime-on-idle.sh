#!/usr/bin/env bash
# Version: 1.1.0

# Stop hook: chime and show a desktop notification only when the turn ends
# with nothing still running AND the wait was long enough to be worth
# announcing.
#
# Stop fires at the end of every turn, including the one that dispatches a
# background agent and hands control back while it works, and again each time
# a completion re-invokes the agent. background_tasks distinguishes "done"
# from "handed off"; the elapsed check distinguishes "you walked away" from
# "you are sitting here reading".
#
# Requires jq, pw-play (PipeWire), notify-send (libnotify), and a chime.wav
# beside this script, such as a copy of
# C:\Windows\Media\Windows Proximity Connection.wav.

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

# A turn that already pushed a banner through notify-on-push.sh gets only
# the chime.
[ "$dir/state/$id.push" -nt "$stamp" ] && exit 0

# The body is the reply's first line. GNOME renders body markup, so <, > and &
# are escaped and Markdown emphasis is stripped. Transient keeps the banner
# out of the notification list once it times out.
project=$(jq -r '.cwd // "" | split("/") | last' <<<"$input" 2>/dev/null)
body=$(jq -r '.last_assistant_message // ""
  | [splits("\n") | select(test("\\S"))] | first // ""
  | gsub("[*`#]"; "") | .[0:200]
  | gsub("&"; "&amp;") | gsub("<"; "&lt;") | gsub(">"; "&gt;")' \
  <<<"$input" 2>/dev/null)
notify-send -e -a "Claude Code" "Claude finished in ${project:-a session}" \
  "$body" >/dev/null 2>&1

exit 0
