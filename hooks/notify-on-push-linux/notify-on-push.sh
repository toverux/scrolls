#!/usr/bin/env bash
# Version: 2.0.0

# PostToolUse hook on PushNotification: chime and show the agent's message as
# a desktop banner. Claude Code's own desktop notification only reaches a few
# terminals (Ghostty, Kitty, iTerm2), so this one goes through notify-send.
#
# Both follow the tool's verdict: localSent is false when the terminal has
# focus, so they fire only while you are away from it.
#
# The banner carries no desktop-entry hint. GNOME Shell destroys a
# notification tied to an app as soon as its sender leaves D-Bus, and
# notify-send exits right after sending, so the banner would never show.
#
# Requires jq, pw-play (PipeWire), notify-send (libnotify), and a chime.wav
# beside this script, such as a copy of
# C:\Windows\Media\Windows Proximity Connection.wav.

input=$(cat)
sent=$(jq -r '.tool_response.localSent // false' <<<"$input" 2>/dev/null)
[ "$sent" = true ] || exit 0

# Detached so the hook exits promptly while the sound plays out.
setsid -f pw-play "$(dirname "$0")/chime.wav" >/dev/null 2>&1 </dev/null

# GNOME renders body markup, so <, > and & are escaped. Transient keeps the
# banner out of the notification list once it times out.
project=$(jq -r '.cwd // "" | split("/") | last' <<<"$input" 2>/dev/null)
body=$(jq -r '.tool_input.message // ""
  | gsub("&"; "&amp;") | gsub("<"; "&lt;") | gsub(">"; "&gt;")' \
  <<<"$input" 2>/dev/null)
notify-send -e -a "Claude Code" "Claude needs you in ${project:-a session}" "$body" >/dev/null 2>&1

exit 0
