#!/usr/bin/env bash
# pane.sh <session> <text> : types the text into the tmux session one character every 90 ms at
# a human pace, sends Enter, waits until the app is idle, then prints the pane without blank lines.
# pane.sh <session> --keys <key>... : sends tmux key names (Down, Enter, Escape) instead, for a
# dialog, then waits the same way.
# PANE_BUSY is the grep pattern of the app's busy markers; the default matches Claude Code's
# spinner line and its "esc to interrupt" hint.
set -u
[ $# -ge 2 ] || { echo "usage: pane.sh <session> <text> | pane.sh <session> --keys <key>..." >&2; exit 2; }
T=${TMUX_BIN:-/usr/bin/tmux}
s=$1
shift
busy=${PANE_BUSY:-"s · ↓\|s · ↑\|thought for\|esc to interrupt\|…"}

if [ "$1" = "--keys" ]; then
  shift

  for k in "$@"; do
    $T send-keys -t "$s" "$k"
    sleep 0.4
  done
else
  text=$1

  for ((i = 0; i < ${#text}; i++)); do
    $T send-keys -t "$s" -l "${text:i:1}"
    sleep 0.09
  done

  sleep 0.8
  $T send-keys -t "$s" Enter
fi

sleep 8

for _ in $(seq 150); do
  $T capture-pane -p -t "$s" | grep -q "$busy" || break
  sleep 4
done

$T capture-pane -p -t "$s" | grep -v '^\s*$'
