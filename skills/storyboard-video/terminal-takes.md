# Terminal takes

A take of a terminal app, Claude Code in a checkout among them, driven through a tmux pane the app's window attaches to.

## The window

- Record the window, not the screen: `REC_PORTAL_RESTORE=no rec.sh start` opens the share dialog once, where the user picks the window; later starts reuse it. A screen share records whatever the user reads in front of the window and loses the take. The window stays open and unresized for every take of the video: a resize changes the crop, a close ends the share.
- The pane is a tmux session the window attaches to: `tmux new-session -d -s <name> -x <cols> -y <rows> -c <dir>`, `tmux set -t <name> status off`, then the app attaches (Warp: a launch configuration whose pane runs `tmux attach -t <name>`). Size the window in cells for the output: 100 columns read at 1280 wide, 160 do not.
- The user sets the window up by hand (size, font) and says when it is set; `tmux list-clients -t <name>` prints the cells.

## Typing

`pane.sh <session> <text>` types the text one character every 90 ms, sends Enter, waits until the app is idle, and prints the pane; `pane.sh <session> --keys <key>...` sends key names (Down, Enter, Escape) for a dialog. Read the pane with `tmux capture-pane -p -t <session>` before each answer instead of guessing the state.

Answer within seconds of the app asking: Claude Code prints a recap line after a long idle, which shows in the take.

## Claude Code in a checkout

- `claude` in the checkout; the folder trust dialog is the one first-start prompt (Down, Enter). The state Claude Code keeps per path (trust, MCP toggles, project-scope plugin installs) survives a re-clone at the same path.
- The checkout's `AGENTS.md` carries the demo's instructions: no notifications, concise messages, the repository's housekeeping (a dirty tree, a commit a step needs) handled silently and never mentioned.
- Turn off what a viewer would not have before the take, and put it back after: the status line, personal plugins and MCP servers in the user settings, user-scope installs of the plugins the take is meant to show installing (`~/.claude/plugins/installed_plugins.json` and `enabledPlugins`). Keep a note of each change in the work folder.
- A retake needs a fresh checkout at the same state: delete it and clone again, the demo's `AGENTS.md` edit committed into it so the tree starts clean.

## Reading the take

Events land in the file about 1 s after their wall-clock time from `rec.sh start` returning; every cut time comes off the frames.
