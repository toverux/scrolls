#!/usr/bin/env bash
# sheet.sh <video> <out.png> <seconds>... : a two-column contact sheet of the frames at the given
# times, each scaled to 960 px wide, to review a render in one image.
set -eu
[ $# -ge 3 ] || { echo "usage: sheet.sh <video> <out.png> <seconds>..." >&2; exit 2; }

video=$1
out=$2
shift 2
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

i=0
for t in "$@"; do
  i=$((i + 1))
  f=$tmp/$(printf %04d $i).png
  ffmpeg -v error -y -ss "$t" -i "$video" -frames:v 1 -vf scale=960:-1 "$f"

  # ffmpeg exits 0 on a time past the end, and a missing tile would shift every later one.
  [ -s "$f" ] || { echo "no frame at $t s" >&2; exit 1; }
done

magick montage "$tmp"/*.png -tile 2x -geometry +4+4 "$out"
