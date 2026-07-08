---
sidebar_position: 5
title: Sharing teams
---

# Sharing teams

Teams are portable objects. Share a **directory bundle** — quick, one person to another.

## Directory bundle: export / import

```bash
mmt export my-team ./my-team             # writes my-team.team.yaml + agents/ + skills/
```

`mmt export <team> [dir]` writes a reviewable directory bundle — `<team>.team.yaml` plus its `agents/*.md` and `skills/<name>/SKILL.md` — into `dir` (defaults to `./<team>`). It's deterministic: it ships the team's actual definition, not an agent re-derivation.
Hand the directory to the recipient; they review it, then install it:

```bash
mmt import ./my-team                     # prints a manifest, asks for consent, then installs
```

A base64 token shared out-of-band still works as a legacy inbound form: `mmt import '<token>'`. There is no way to export one — `mmt export` always writes a bundle.

## Contribute your team

A shareable team library is being redesigned — for now, share a directory bundle directly (see above), or open a PR against the repo to propose a team for wider distribution.

:::warning Trust
Installing a shared team means running its members' prompts with **your** tools (`bash`, `gh`, edit). Review what a team's members and skills do before you run it — that's exactly what the PR review is for.
:::
