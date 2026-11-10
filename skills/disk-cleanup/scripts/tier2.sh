#!/usr/bin/env bash
# Tier-2 candidates: dependency/build dirs in projects idle for 30+ days.
# Usage: tier2.sh <du-file> <home> [excluded-prefix…]. Prints "KB<TAB>path<TAB>idle since <date>" lines.
set -u
du_file=$1 home=$2
shift 2
excludes=$(printf '%s\n' "$@")
cutoff=$(( $(date +%s) - 30*86400 ))
names='node_modules|\.venv|venv|target|bin|obj|dist|build|\.next|\.turbo|\.parcel-cache|\.gradle|Library'

# Candidate dirs: matching basename, not nested in another candidate, outside hidden trees, ~/snap and the excluded prefixes.
awk -F'\t' -v h="$home/" -v ex="$excludes" '
  BEGIN { n = split(ex, E, "\n") }
  index($2, h) == 1 { for (i = 1; i <= n; i++) if (E[i] != "" && index($2, E[i]) == 1) next; print $1 "\t" $2 }
' "$du_file" \
  | grep -P "\t.*/($names)$" \
  | grep -vP "\t$home/(\.|snap/)" \
  | grep -vP "/($names)/" \
  | sort -t$'\t' -k1,1nr \
  | while IFS=$'\t' read -r kb dir; do
      (( kb < 51200 )) && continue                      # skip under 50 MB
      parent=${dir%/*} base=${dir##*/}
      case $base in
        target) [[ -e $parent/Cargo.toml || -e $parent/pom.xml ]] || continue ;;
        bin|obj) compgen -G "$parent/*.*proj" >/dev/null || continue ;;
        Library) [[ -d $parent/Assets && -d $parent/ProjectSettings ]] || continue ;;
      esac
      if root=$(git -C "$parent" rev-parse --show-toplevel 2>/dev/null); then
        git -C "$parent" check-ignore -q "$dir" || continue
        last=$(git -C "$root" log -1 --format=%ct 2>/dev/null || echo 0)
        newest=$(git -C "$root" ls-files -co --exclude-standard -z | (cd "$root" && xargs -0 -r stat -c %Y 2>/dev/null) | sort -n | tail -1)
      else
        case $base in dist|build) continue ;; esac
        root=$parent last=0
        newest=$(command find "$root" \( -name node_modules -o -name .git -o -name "$base" \) -prune -o -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
        newest=${newest%.*}
      fi
      active=$(( ${last:-0} > ${newest:-0} ? ${last:-0} : ${newest:-0} ))
      (( active < cutoff )) || continue
      printf '%s\t%s\tidle since %s\n' "$kb" "$dir" "$(date -d @"$active" +%F)"
    done
