---
sidebar_position: 5
title: Sharing teams
---

# Sharing teams

Teams are portable objects. Share them two ways: a **token** (quick, one person to another) or the **catalog** (a PR-reviewed library others browse and install).

## Token: export / import

```bash
mmt export spec-to-prod          # prints:  mmt import 'mmt2:…'
```

The token is deterministic and **bundles the team's skill definitions**, so it recreates exactly on another machine. Send the whole `mmt import '…'` line; the recipient runs it:

```bash
mmt import 'mmt2:…'              # recreates the team + installs its skills
```

`mmt export <team> --raw` gives readable YAML instead of a token.

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
mmt import catalog/<user>/<team>/<team>.team.yaml
```

Bundled skills in the team's `skills/` folder come with it.

## Contribute your team

1. Add your team under `catalog/<your-handle>/<team>/` (the yaml + its `skills/`).
2. Open a PR. Once reviewed and merged, the README **and** this docs library regenerate automatically — no hand-editing any list.

:::warning Trust
Installing a shared team means running its members' prompts with **your** tools (`bash`, `gh`, edit). Review what a team's members and skills do before you run it — that's exactly what the PR review is for.
:::
