---
sidebar_position: 5
title: Sharing teams
---

# Sharing teams

Teams are portable objects. Share them two ways: a **directory bundle** (quick, one person to another) or the **catalog** (a PR-reviewed library others browse and install).

## Directory bundle: export / import

```bash
mmt export spec-to-prod ./spec-to-prod   # writes spec-to-prod.team.yaml + agents/ + skills/
```

`mmt export <team> [dir]` writes a reviewable directory bundle — `<team>.team.yaml` plus its `agents/*.md` and `skills/<name>/SKILL.md` — into `dir` (defaults to `./<team>`). It's deterministic: it ships the team's actual definition, not an agent re-derivation.
Hand the directory to the recipient; they review it, then install it:

```bash
mmt import ./spec-to-prod                # prints a manifest, asks for consent, then installs
```

A base64 token shared out-of-band still works as a legacy inbound form: `mmt import '<token>'`. There is no way to export one — `mmt export` always writes a bundle.

## Catalog: the shared library

The repo has a `catalog/` folder. Each team lives at:

```
catalog/<user>/<team>/
  <team>.team.yaml
  skills/            # the skills this team references (optional)
    <skill>/SKILL.md
```

Browse it on GitHub, or in the [Library](/library) page (auto-generated). Install a catalogued team:

```bash
mmt import catalog/<user>/<team>
```

Directory import installs the whole bundle — the team's `agents/` and `skills/` folders come with it.

## Contribute your team

1. Add your team under `catalog/<your-handle>/<team>/` (the yaml + its `skills/`).
2. Open a PR. Once reviewed and merged, the README **and** this docs library regenerate automatically — no hand-editing any list.

:::warning Trust
Installing a shared team means running its members' prompts with **your** tools (`bash`, `gh`, edit). Review what a team's members and skills do before you run it — that's exactly what the PR review is for.
:::
