#!/usr/bin/env bash
# card.sh <in.html> <out.png> [WxH] : renders an HTML card to a PNG of the video's size (default
# 1920x1080) with headless Chrome or Chromium, one CSS pixel to one video pixel.
set -eu
[ $# -ge 2 ] || { echo "usage: card.sh <in.html> <out.png> [WxH]" >&2; exit 2; }

size=${3:-1920x1080}
browser=$(command -v google-chrome || command -v chromium || command -v chromium-browser) \
  || { echo "no Chrome or Chromium found" >&2; exit 1; }

# Chrome exits 0 even when it writes nothing, so only a fresh file proves the render.
rm -f "$2"
"$browser" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="${size/x/,}" --screenshot="$(realpath -m "$2")" "file://$(realpath "$1")" \
  2>/dev/null

[ -s "$2" ] || { echo "no screenshot written" >&2; exit 1; }
