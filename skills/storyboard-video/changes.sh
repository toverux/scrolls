#!/usr/bin/env bash
# changes.sh <video> <w:h:x:y> [min] : prints "<seconds> <diff>" for each frame where the cropped
# region differs from the frame before by more than min (mean luma difference on 0-255, default
# 0.3). Text appearing scores about 1, a redrawn list 10 or more; video noise stays under 0.3.
set -eu
[ $# -ge 2 ] || { echo "usage: changes.sh <video> <w:h:x:y> [min]" >&2; exit 2; }

ffmpeg -v error -i "$1" -vf "crop=$2,format=gray,tblend=all_mode=difference,signalstats,\
metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - \
  | paste -d' ' - - \
  | awk -v min="${3:-0.3}" '{
      split($3, t, ":"); split($4, d, "=");
      if (d[2] > min) printf "%s %.2f\n", t[2], d[2]
    }'
