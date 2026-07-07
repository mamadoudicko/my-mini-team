---
sidebar_position: 3
title: Teams
---

# Teams

The third layer, and mmt's own — **proprietary** — contribution on top of native skills and agents. A **team** is a named, reusable workflow: an ordered list of steps, each a member (an agent, possibly with extra skills or an overridden `does`) or a loop of members that repeats until a gate approves.

## Create a team

**By an agent (Claude-drafted)** — describe the workflow in plain words; Claude composes the members and any loop/gate:

```bash
mmt new team spec-to-prod "strategist plans, coder builds and opens a PR, reviewer loops with the coder until approved, then qa runs tests"
```

**Manually (author it yourself)** — `--ui` opens the interactive Ink step editor (agent picker + skill checkboxes per step):

```bash
mmt new team spec-to-prod --ui
```

## Edit a team later

```bash
mmt edit team spec-to-prod "give the coder a deploy skill"   # bare — describe the change, Claude rewrites it
mmt edit team spec-to-prod --ui                              # --ui — edit the steps yourself
```

## Worked example: `spec-to-prod`

The real `spec-to-prod` team, at `teams/spec-to-prod.team.yaml`:

```yaml
team: spec-to-prod
about: take an agreed spec to prod — plan, build, review loop, qa, audit (no spec challenging; we already know what we want)
steps:
  - uses: strategist
    does: turn the spec into a short technical plan

  - uses: coder
    does: implement the plan and open a PR
    skills: [+ticket-status]     # coder's default [github-pr] + ticket-status

  - loop:
      until: reviewer approves
      max_rounds: 3
      steps:
        - uses: reviewer
          does: review the diff on the PR       # inherits [github-comment]
        - uses: coder
          does: address the review comments     # inherits [github-pr]

  - uses: qa
    does: run the tests and exercise the change
    skills: [+github-post]        # qa's default [run-tests] + github-post

  - uses: reporter
    does: publish a concise run audit as a collapsible comment on the PR  # inherits [publish-report]
```

Each step's `uses:` names an agent (see [Agents](/layers/agents)); `does` overrides the step's job for this team; `skills: [+name]` adds a skill on top of the agent's defaults (bare-replace with `skills: [name]` swaps them entirely). The `loop` repeats its inner steps until the first member (the gate, here `reviewer`) approves, capped by `max_rounds`.

## Run it

```bash
mmt run spec-to-prod "ship https://notion.so/Booking-history-PDF-export-1a2b3c4"
```

`mmt run <team>` is the one typeless verb — it spawns the team's agents as in-session Claude subagents on your subscription, via the `/mmt` skill. See [Running](/guides/running).
