---
name: storyboard-video
description: Make a video from screen recordings on GNOME Wayland, a before/after comparison or a demo, from scripted takes, HTML cards and ffmpeg.
argument-hint: '[what the video shows, free text]'
disable-model-invocation: true
version: 1.1.1
---

# Storyboard video

A video is a **storyboard** of segments, each a **take** (a screen recording of one scripted run) or a **card** (a still rendered from HTML), composed into one file by ffmpeg.
Everything lives in one work folder (`.scratch/video/` in a repo, or one the user names): the cards' HTML and PNGs, the segments' graphs, and a `render.sh` that rebuilds cards and video in one command, so every later change is an edit and a rerun.
The takes go there too, so the work folder sits under `$HOME`: the recorder's sandbox hides `/tmp`.

The scripts beside this file do the mechanical parts; each shell script prints its usage when run without arguments:

- `rec.sh start <out.mkv> [fps] | stop | check <file>`: records the whole screen.
- `changes.sh <video> <w:h:x:y> [min]`: lists the times a region changes.
- `frames.sh <video> <start> <duration> <w:h:x:y> <out.png>`: stacks a span's distinct frames, each stamped with its time.
- `card.sh <in.html> <out.png> [WxH]`: renders a card.
- `sheet.sh <video> <out.png> <seconds>...`: a contact sheet of a render.
- `pane.sh <session> <text> | --keys <key>...`: types into a tmux pane at a human pace and waits for the app to go idle.
- `pointer.py`: moves the real pointer through a virtual one on `/dev/uinput`, reading `move X Y [seconds]`, `click` and `sleep` lines on stdin (its header has the rest).

## 1. Storyboard

Write the segments in order: what each shows, its length, and every number or label on screen with its source.
Show what a viewer of the video notices, the effect a user sees, and leave internals to the cards when the user asks for them.
For a comparison, each variant gets its own take of the same scripted run from the same starting state, all recorded in one sitting, and the segments align on the event the comparison is about (the result appearing, the action finishing).
The arguments, when given, say what the video shows; the conversation supplies the rest.
Where the request leaves the shape open (length, variants, which numbers), put the storyboard to the user before recording.

**Done when** every segment names its take or card, and every on-screen number its source.

## 2. Preflight

The pipeline needs the Flatpak `com.dec05eba.gpu_screen_recorder` (its portal capture is the path on GNOME Wayland that runs unattended; ffmpeg's grabbers and wf-recorder cannot capture it), ffmpeg with `drawtext`, ImageMagick, and Chrome or Chromium. Ask the user to install what is missing.

Record a test of a few seconds with `rec.sh start`, `rec.sh stop`, then `rec.sh check`.
The first run opens GNOME's share dialog: ask the user to pick the screen and click Share. Later runs reuse that session with no dialog.

**Done when** the test decodes with 0 errors at the screen's resolution.

## 3. Takes

Drive the app from a script (its UI automation, a devtools protocol, a CLI), so the input and its pace are the same in every take: text typed one character at a time at a steady human pace, fixed waits between steps.
Show the cursor (`REC_CURSOR=yes`) and drive it with `pointer.py`, so clicks and hovers land and show as a user's.
A terminal app, Claude Code in a checkout among them, is driven through a tmux pane and recorded as a window share: [`terminal-takes.md`](terminal-takes.md).
The user keeps off the mouse and keyboard during takes, and whatever the app does with stray input (edge scrolling, keyboard shortcuts) is frozen first.
Each take: `rec.sh start`, a 2 s lead-in, the scripted run, the result plus a 2 s tail, `rec.sh stop`, `rec.sh check`.
Schedule takes after any measurement has finished, as the encoder shares the machine.
Retake one where anything outside the script shows in its frame: a notification, an overlay still fading, a panel in another state.

**Done when** every take checks clean and shows its event in full.

## 4. Locate

- **Crop.** Grab a frame (`ffmpeg -ss 1 -i take.mkv -frames:v 1 frame.png`), zoom on the window's corner (`magick frame.png -crop 120x120+X+Y +repage -scale 500% zoom.png`) to read where its content starts, then add the app's own element coordinates, times the display scale on a scaled screen. The capture holds every window on screen, so each take shows only its crop.
- **Events.** `changes.sh` over the region where the event shows (the input box, the result area) gives candidate times, and only there: a keystroke barely moves a whole frame's mean, so a whole-frame scan lists the redraws alone; `frames.sh` over the span confirms the exact frame: the last keystroke, the first frame of the result.

**Done when** each take has its crop and its event times, each read off a frame.

## 5. Cards

Load the `frontend-design` skill, and give the cards the visual language of the product the video shows: its font, colours and panel shapes.
One HTML file per card, sharing one CSS file, sized in CSS pixels to the video and rendered by `card.sh`.
A scene that holds takes gets a background card with its labels and an empty frame where each take goes; timers are drawn over it by ffmpeg.
On-screen text is prose for human viewers: run each string through the `humanizer:humanizer` skill, where installed, whenever one is added or changed.
The HTML files are the single source of every string; when the user asks for the list, read it from them.

**Done when** every card renders and you have looked at each PNG.

## 6. Compose

Write one graph per segment and `render.sh` from [`ffmpeg-recipes.md`](ffmpeg-recipes.md) (beside this file): aligning takes on their event, crop and overlay, running timers, faster waits, segments rendered apart then chained, the encode.

**Done when** `render.sh` runs clean.

## 7. Review

Run `sheet.sh` at the key times (each segment, just before the event, just after the first variant finishes, the end) and look at it: each timer stops on its event's frame, labels sit in their frames, and nothing outside a crop shows.
Send the video to the user with what each number on screen is and where it comes from: read off the takes, or quoted on a card from elsewhere.
After each change the user asks for, rerun `render.sh`, review the changed segment, and send it again.

**Done when** the user accepts the video.
