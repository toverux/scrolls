#!/usr/bin/env bash
# frames.sh <video> <start> <duration> <w:h:x:y> <out.png> : stacks each frame of the cropped
# region that differs from the last one stacked, over the span, each stamped with its time in the
# video, to read exactly which frame an event lands on.
set -eu
[ $# -eq 5 ] \
  || { echo "usage: frames.sh <video> <start> <duration> <w:h:x:y> <out.png>" >&2; exit 2; }

font=$(fc-match -f '%{file}' 'DejaVu Sans')
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# mpdecimate keeps a frame once any 8x8 block differs from the last kept frame by over 2 per pixel
# on average: its default of 12 drops a faint change, such as a fade's first frame. select's scene
# score measures a cut, so steady change scores near 0.
ffmpeg -v error -ss "$2" -t "$3" -i "$1" -vf "crop=$4,mpdecimate=hi=128,\
drawtext=fontfile=$font:text='%{pts\:flt\:$2}':x=w-tw-6:y=6:fontsize=16:fontcolor=yellow:\
box=1:boxcolor=black@0.6" -fps_mode vfr "$tmp/%04d.png"

magick montage "$tmp"/*.png -tile 1x -geometry +0+2 "$5"
