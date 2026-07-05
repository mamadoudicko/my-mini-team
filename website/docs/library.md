---
sidebar_position: 6
title: Library
---

# Library

Community mini-teams from the [`catalog/`](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog). Install any of them with one command:

```bash
mmt import catalog/<user>/<team>/<team>.team.yaml
```

Bundled skills come with the team. See [Sharing](/guides/sharing) for how it works.

## Available teams

<!-- mmt:catalog:start -->
- [mamadoudicko/pr-review](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/pr-review/) — review the open PR, address the feedback, loop until approved, then qa
<!-- mmt:catalog:end -->

> This list is auto-generated from the catalog by `scripts/gen-catalog.js` — do not hand-edit between the markers.

## Contribute your team

1. Add `catalog/<your-handle>/<team>/` — your `<team>.team.yaml` plus its `skills/`.
2. Open a PR. Once merged, this page and the README regenerate automatically.

:::warning Trust
Installing a shared team runs its members' prompts with your tools (`bash`, `gh`, edit). Review a team's members and skills before running it.
:::
