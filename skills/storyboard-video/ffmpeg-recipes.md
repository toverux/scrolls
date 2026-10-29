# ffmpeg recipes

Building blocks for the compose step, assembled into one filter graph per segment, each kept in a file and passed with `-/filter_complex graph.txt` (ffmpeg 7.1 and later; older builds take `-filter_complex_script graph.txt`).

## Inputs

- A take: `-i take.mkv`.
- A still card held for `D` seconds: `-loop 1 -t D -framerate 60 -i card.png`, at the takes' frame rate so segments chain.
  Laid over a take, it keeps the overlay running to its own end, freezing the take's last frame: give that `overlay` `shortest=1`.

## Align a take on its event

Cut each take so its event lands at the same time `L` (the lead-in) in every segment:

```
[0:v]trim=start=<event time - L>:duration=<segment length>,setpts=PTS-STARTPTS[a]
```

## Crop and place

Crop to the region and overlay it on a background card drawn with empty frames where the takes go:

```
[1:v]trim=…,setpts=PTS-STARTPTS,crop=W:H:X:Y[a];
[2:v][a]overlay=OX:OY[bg1];
```

A crop at 1:1 stays sharp; scaling a small region up blurs text, so frame the shot large in the app instead (enlarge the panel, zoom the UI) before recording.

On 4:2:0 frames `crop` rounds an odd X or Y down, onto the window's border: crop after `format=yuv444p`, then `fillborders=left=1:right=1:mode=smear` over the content column each side the border's colour bleeds into.

## Running timer

A timer counting from `T0` and freezing after `D` seconds, two drawtexts: white while running, a colour once done.

```
drawtext=fontfile=F:fontsize=130:x=X:y=Y:y_align=font:fontcolor=white:enable='between(t,T0,T0+D)':text='%{eif\:floor(min(max(t-T0,0),D))\:d}.%{eif\:mod(floor(min(max(t-T0,0),D)*100),100)\:d\:2} s',
drawtext=…same…:fontcolor=0x6fdc8c:enable='gte(t,T0+D)'
```

- Inside the single quotes, commas and semicolons are safe, but each `:` that separates a `%{…}` function's own arguments needs `\:`. A bare colon there fails with "No option name near …".
- Use a font with tabular digits, or the text jitters as it counts. Check it: `magick -font F -pointsize 120 label:"0.00 s" -format %w info:` gives the same width for `1.11 s` and `7.63 s`. drawtext applies no `tnum` feature, so for a font without such digits, save a copy with fontTools whose digit glyphs share the widest digit's advance, each centred in it.
- `y_align=font` holds the line still: the default aligns each frame to its tallest glyph, and round digits overshoot flat ones by a few pixels. It sets the text about 0.35 × the font size lower than the default.
- `D` comes from the frames (event frame minus start frame), never from a log: the viewer sees the frames.

## Faster waits

Where a take waits between actions, play the waits faster and the actions at their pace: split the take, then `trim=start=B:end=E,setpts=(PTS-STARTPTS)/K` each span with its speed `K`, and `concat=n=N:v=1` the spans. A timer over a span played at `K` counts `(t-T0)*K` and freezes at `T0+D/K`: drawtext's `t` is output time once `setpts` has run.

## Chain segments

Render each segment to its own file (`-crf 10`), then chain the files. One graph over every take decodes them all from the start and queues the later takes' frames until their segment plays: with 4K takes that ran out of memory.

`xfade` joins two streams of the same size, frame rate and pixel format (end each segment with `format=yuv420p,fps=60`). Each offset is the running total of the earlier segments' lengths minus the earlier transitions:

```
[s1][s2]xfade=transition=fade:duration=0.5:offset=<len1 - 0.5>[x1];
[x1][s3]xfade=transition=fade:duration=0.5:offset=<len1 + len2 - 1>,fade=t=in:d=0.4,fade=t=out:st=<total - 0.6>:d=0.6[out]
```

## Encode

```
ffmpeg -v error -y <inputs> -/filter_complex graph.txt -map '[out]' -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart out.mp4
```

`-pix_fmt yuv420p` keeps the file playable on phones: a filter such as `xfade` can hand the encoder 4:4:4 frames, which libx264 then encodes as High 4:4:4 Predictive, a profile phone hardware decoders reject (a black frame in Discord's mobile app) while desktop browsers decode it in software.

1080p60 with mostly static cards comes to a few MB for half a minute.

A video for a GitHub README is an upload through one of GitHub's editors, under 10 MB, which then renders as a player where its asset URL stands on its own line: a 1280-wide copy at `-crf 23` holds two minutes of terminal footage in that.

## Shell

zsh reads `$4:t` as `$4` with the `:t` modifier, which happens when a filter string is built from positional parameters in an inline zsh function. Brace them: `${4}:text=…`. A bash script (`#!/usr/bin/env bash`) is free of it.
