---
name: disk-cleanup
description: Free disk space on a Linux machine in three tiers (obvious prunes, idle rebuildable dirs, then your rm/trash/keep calls), reporting free space before and after.
disable-model-invocation: true
version: 1.0.0
---

# Disk cleanup

A run frees space on `/` in three **tiers**, each gated on the user:

- **Tier 1, prune**: data nothing uses (temp leftovers, superseded versions, logs, package caches of installed packages).
- **Tier 2, rebuildable**: dependency and build dirs of projects idle for 30 days, git-ignored, or outside git a known dependency or build dir name.
- **Tier 3, the user's call**: everything else worth a look, including cache _wipes_ that cost a re-download.

Run root commands the way the user's instructions say, batched into one call per step; where they say nothing, hand the user one `! sudo sh -c '…'` line.
Give snap tools their full path (`/snap/bin/docker`), since a root `PATH` often lacks `/snap/bin`.
The trash is never emptied: the run trashes into it.

## The machine database

`local.md`, beside this file, holds what is true of this machine only: the spots to leave alone, extra known spots for each tier with their check and command, the prefixes tier 2 excludes, and environment gotchas.
Read it before step 1, and follow it wherever it adds to or overrides a step.
Where it is absent, create it with the headings `## Leave alone`, `## Tier 1 spots`, `## Tier 2 excludes`, `## Tier 3 spots`, `## Environment`, and fill it in step 5.

## 1. Scan

1. Save the starting free space: `mkdir -p /tmp/diskscan; df -B1 --output=avail / | tail -1 > /tmp/diskscan/start.avail`, and show it.
2. In one root call: `du -x -k / > /tmp/diskscan/root.du`, `journalctl --disk-usage`, `docker system df` where Docker is installed, then `chown` the outputs back to the user.
   `-x` keeps the walk on `/`, off network and other mounts.
3. Rank folders from the scan, never re-walking the disk: `awk -F'\t' '{printf "%.1fG\t%s\n",$1/2^20,$2}' root.du | sort -rn`, filtered by depth with `awk -F/ 'NF<=n'`.
   `du` lists folders only: a folder big in total but with no big child holds many small entries, so `ls | wc -l` it and look at a few.

**Done when** the top 40 folders are known down to the level where each one's owner and purpose is clear.

## 2. Tier 1

Check each known spot, `local.md`'s included, then whatever the scan turned up that nothing uses:

| Spot                     | Check                                                                                                          | Command                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Old JetBrains data       | Keep each installed IDE's `dataDirectoryName` from `~/.local/share/JetBrains/Toolbox/apps/*/product-info.json` | `rm -rf ~/.local/share/JetBrains/<IDE><version>` for the others |
| Data of uninstalled apps | The app is absent from `flatpak list`, `snap list` and `PATH`                                                  | `rm -rf` its `~/.local/share` folder                            |
| Disabled snap revisions  | `snap list --all \| grep disabled`                                                                             | `snap remove <name> --revision=<rev>` (root)                    |
| Journal                  | Above 500 MB                                                                                                   | `journalctl --vacuum-size=500M` (root)                          |
| apt cache, crash reports | Size of `/var/cache/apt/archives`, `/var/crash`                                                                | `apt-get clean; rm -f /var/crash/*` (root)                      |
| Dangling Docker images   | `docker images -f dangling=true -q`                                                                            | `docker image prune -f` (root for snap Docker)                  |
| Flatpak                  | —                                                                                                              | `flatpak uninstall --unused -y`                                 |

Present a numbered table (item, size, why it is safe) and wait for one "go"; the user may name rows to keep.

**Done when** every approved row ran, its root rows in one call.

## 3. Tier 2

Run `scripts/tier2.sh /tmp/diskscan/root.du "$HOME"` from this skill's folder, followed by `local.md`'s tier 2 excludes as extra arguments: it prints `KB<TAB>path<TAB>idle since <date>` for each candidate.
Drop any row inside an installed application rather than a project, and add its prefix to `local.md`'s excludes in step 5.
Present a numbered table and wait for one "go", as in tier 1.
Then run `pnpm store prune` where pnpm is installed, which frees the store packages those deletions left unreferenced.

**Done when** every approved folder is deleted and the store is pruned.

## 4. Tier 3

Build the list from the scan's biggest folders not covered above, and from these known spots, `local.md`'s included:

- Data of removed packages: `dpkg -l | grep ^rc` and its data folder, such as `/var/lib/docker` left by an apt Docker (snap Docker keeps its data in `/var/snap/docker`); name the volumes it holds.
- Steam games by `LastPlayed` in `steamapps/appmanifest_<id>.acf`, removed with `steam steam://uninstall/<id>`, which opens a confirmation in Steam.
- Unity Hub editors no project's `ProjectSettings/ProjectVersion.txt` names.
- Wipes: `~/.nuget/packages`, `bun pm cache rm`, `~/.npm`, `uv cache clean`, `~/.cargo/registry`.
- rustup toolchains other than `rustup show active-toolchain` and the default; a version manager such as mise pins the active one through `RUSTUP_TOOLCHAIN`.
- Docker images no container or compose file uses, Ollama models, benchmark installs.

Present at most 10 items as a numbered list sorted by size descending, each with path, size, what it is, and a recommendation among rm, trash, keep; root-owned items offer rm or keep.
Before running a trash answer, add the items' size to the trashed total, then `gio trash` them.

**Done when** every item has the user's answer and every rm and trash answer ran.

## 5. Improve this skill

Fold this run's new findings in: a new waste spot with its check and command, a gotcha that cost a retry, an exclusion the user set.
A finding true of this machine only goes to `local.md`; one that would help on any machine goes to this file or its script, bumping `version`.
A machine-only finding that needs script logic becomes a generic argument or check in the script, which `local.md` then turns on.
Keep what will recur; drop a spot that no longer exists.

**Done when** the two files hold every finding a future run would act on.

## 6. Report

Show the starting and ending free space, then `X GB reclaimed, Y GB trashed`, where X is the free-space gain and Y the trashed total.
Close with one line, or up to three bullets, naming what step 5 changed in this skill and in `local.md`.
