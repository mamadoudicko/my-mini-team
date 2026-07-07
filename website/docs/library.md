---
sidebar_position: 6
title: Library
---

# Library

Community mini-teams from the [`catalog/`](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog). Install any of them with one command:

```bash
mmt import catalog/<user>/<team>
```

Directory import installs the whole bundle — the team's `agents/` and `skills/` come with it. See [Sharing](/guides/sharing) for how it works.

## Available teams

<!-- mmt:catalog:start -->
- [mamadoudicko/idea-to-prod](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/idea-to-prod/) — take a raw idea all the way to prod — publish the issue as a first draft early, iterate it in place with a challenger, get explicit user validation, then build, review, qa, audit
  - `mmt run idea-to-prod "add SMS reminders to booking confirmations"`
- [mamadoudicko/idea-to-spec](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/idea-to-spec/) — formulate a raw idea into a clear, implementable spec (in your tracker of choice — GitHub, Notion, …), challenged until it's right first-try
  - `mmt run idea-to-spec "we keep losing customers after their first booking — figure out what to build"`
- [mamadoudicko/spec-to-prod](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/spec-to-prod/) — take an agreed spec to prod — plan, build, review loop, qa, audit (no spec challenging; we already know what we want)
  - `mmt run spec-to-prod "ship https://notion.so/Booking-history-PDF-export-1a2b3c4"`
<!-- mmt:catalog:end -->

> This list is auto-generated from the catalog by `scripts/gen-catalog.js` — do not hand-edit between the markers.

## Contribute your team

1. Add `catalog/<your-handle>/<team>/` — your `<team>.team.yaml` plus its `skills/`.
2. Open a PR. Once merged, this page and the README regenerate automatically.

:::warning Trust
Installing a shared team runs its members' prompts with your tools (`bash`, `gh`, edit). Review a team's members and skills before running it.
:::
