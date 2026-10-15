#!/usr/bin/env bash
# Version: 1.0.0

# PostToolUse hook on PushNotification: show the agent's message as a desktop
# banner. Claude Code's own desktop notification only reaches a few terminals
# (Ghostty, Kitty, iTerm2), so this one goes through notify-send.
#
# The banner follows the tool's verdict: localSent is false when the terminal
# has focus, so the banner appears only while you are away from it.
#
# The banner carries no desktop-entry hint. GNOME Shell destroys a
# notification tied to an app as soon as its sender leaves D-Bus, and
# notify-send exits right after sending, so the banner would never show.
#
# Each push stamps the session, so chime-on-idle.sh leaves its own banner out
# of a turn that already pushed one.
#
# Requires jq and notify-send (libnotify).

input=$(cat)
sent=$(jq -r '.tool_response.localSent // false' <<<"$input" 2>/dev/null)
[ "$sent" = true ] || exit 0

id=$(jq -r '.session_id // empty' <<<"$input" 2>/dev/null)
if [ -n "$id" ]; then
  mkdir -p "$(dirname "$0")/state"
  touch "$(dirname "$0")/state/$id.push"
fi

# GNOME renders body markup, so <, > and & are escaped. Transient keeps the
# banner out of the notification list once it times out.
project=$(jq -r '.cwd // "" | split("/") | last' <<<"$input" 2>/dev/null)
body=$(jq -r '.tool_input.message // ""
  | gsub("&"; "&amp;") | gsub("<"; "&lt;") | gsub(">"; "&gt;")' \
  <<<"$input" 2>/dev/null)
notify-send -e -a "Claude Code" "Claude needs you in ${project:-a session}" "$body" >/dev/null 2>&1

exit 0
