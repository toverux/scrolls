#!/usr/bin/env bash
# Version: 1.0.0

# UserPromptSubmit hook: stamp when the user last typed, so the Stop hook can
# tell a long wait from a quick reply. Fires once per prompt, not once per
# turn, so the elapsed time spans a whole dispatch-and-report agent chain.
#
# Requires jq.

id=$(jq -r '.session_id // empty' 2>/dev/null) || exit 0
[ -n "$id" ] || exit 0

dir="$(dirname "$0")/state"
mkdir -p "$dir"
date +%s > "$dir/$id.start"

# Sessions never announce that they are gone, so stamps are pruned by age.
find "$dir" -name '*.start' -mmin +10080 -delete 2>/dev/null

exit 0
