#!/usr/bin/env bash
# rec.sh start <out.mkv> [fps] | stop | check <file>
# Records the whole screen with gpu-screen-recorder (Flatpak com.dec05eba.gpu_screen_recorder)
# through the desktop portal, reusing the session the user approved once. REC_CURSOR=yes shows
# the pointer. stop signals the recorder itself and waits until it has closed the file: the
# Flatpak wrapper does not forward SIGINT, and a recorder left running keeps writing.
set -u
log=${TMPDIR:-/tmp}/rec-sh.log

case "${1:-}" in
start)
  [ $# -ge 2 ] || { echo "usage: rec.sh start <out.mkv> [fps]" >&2; exit 2; }
  out=$(realpath -m "$2")

  # The Flatpak sandbox has its own /tmp, so a file written there never reaches the host.
  case "$out" in
  /tmp/* | /var/tmp/*)
    echo "write the recording under \$HOME, the sandbox hides /tmp" >&2
    exit 2
    ;;
  esac

  if pgrep -x gpu-screen-reco >/dev/null; then
    echo "a recorder is already running: rec.sh stop first" >&2
    exit 1
  fi

  flatpak run --command=gpu-screen-recorder com.dec05eba.gpu_screen_recorder -w portal \
    -restore-portal-session yes -cursor "${REC_CURSOR:-no}" -f "${3:-60}" -c mkv -q very_high \
    -o "$out" >"$log" 2>&1 &

  # The first run waits on the portal's share dialog until the user approves it.
  for _ in $(seq 600); do
    grep -q "update fps" "$log" && break
    kill -0 $! 2>/dev/null || break
    sleep 0.1
  done

  if ! grep -q "update fps" "$log"; then
    # A share dialog approved after this point would start a recording nothing stops.
    p=$(pgrep -n -x gpu-screen-reco) && kill -INT "$p"
    echo "the recorder did not start, see $log" >&2
    exit 1
  fi

  echo "$out" >"$log.out"
  pgrep -n -x gpu-screen-reco
  ;;
stop)
  p=$(pgrep -n -x gpu-screen-reco) || { echo "no recorder running"; exit 0; }
  kill -INT "$p"

  while kill -0 "$p" 2>/dev/null; do
    sleep 0.2
  done

  out=$(cat "$log.out" 2>/dev/null)
  [ -s "$out" ] && echo "stopped: $out" || echo "stopped, but no file at $out" >&2
  ;;
check)
  [ $# -ge 2 ] || { echo "usage: rec.sh check <file>" >&2; exit 2; }
  echo "decode errors: $(ffmpeg -v error -i "$2" -f null - 2>&1 | wc -l)"
  ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate \
    -of compact=p=0 "$2"
  ;;
*)
  echo "usage: rec.sh start <out.mkv> [fps] | stop | check <file>" >&2
  exit 2
  ;;
esac
