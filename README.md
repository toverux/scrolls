# scrolls

A set of configs, skills, rules, etc. that I use everywhere and want to keep in sync and track
version changes for easier updates across projects.

They are mainly intended for agents, or both users and agents (ex. a C# code cleanup profile).

Copy and adapt files as needed in each project.

Skills are the exception to "per project": each `skills/<name>/` directory is copied whole (SKILL.md
plus its reference files) into `~/.claude/skills/`, where it is available in every project at once.
