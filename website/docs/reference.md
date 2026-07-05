---
sidebar_position: 5
title: Reference
---

# Reference

## Commands

| Command | What it does |
| --- | --- |
| `mmt` | home — list your teams with `[local]`/`[global]` scope |
| `mmt show <team>` | full workflow: steps, skills, loops, models |
| `mmt run <team> "task"` | run on your subscription (opens a Claude Code session) |
| `mmt new ["describe it"]` | compose a team from a description (`--local` for this folder) |
| `mmt edit <team> ["change"]` | change a team by describing it |
| `mmt delete <team>` | delete a team (all copies) |
| `mmt skills` | list plug-in skills (all sources) |
| `mmt skill new\|edit\|show <name>` | create / edit / view a skill |
| `mmt export <team> [--raw]` | portable token (bundles skills) or raw yaml |
| `mmt import '<token>' \| <file>` | recreate a team (token installs bundled skills) |
| `mmt help` | list everything |

### `run` flags

| Flag | Effect |
| --- | --- |
| `--model opus\|sonnet\|haiku` | override the model for the whole run |
| `--sim` | offline simulated preview (no Claude calls, no cost) |
| `--headless` | run via `claude -p` — **off-subscription** (Agent SDK credit) |

## Team file format

A team is `<name>.team.yaml`:

```yaml
team: ship-feature            # name (matches the file)
about: from a task to a reviewed PR
model: sonnet                 # optional default model for all members
lead: >                       # optional custom lead instructions
  You are the topic owner. Keep the team focused and ship.
steps:                        # ordered
  - member: strategist
    does: turn the task into a short plan

  - member: coder
    does: implement and open a PR
    skills: [github-pr, ticket-status]
    model: opus               # optional per-member model
    interactive: false        # optional — true = this member asks the user

  - loop:
      until: reviewer approves
      max_rounds: 3
      steps:
        - member: reviewer
          skills: [github-comment]
        - member: coder
          skills: [github-pr]

  - member: qa
    skills: [run-tests]

  - member: reporter          # optional — posts an audit comment on the PR
    skills: [publish-report]
```

### Member fields

| Field | Meaning |
| --- | --- |
| `member` | the role name |
| `does` | one line describing its job |
| `skills` | list of skills it plugs in |
| `model` | `opus` / `sonnet` / `haiku` (optional) |
| `interactive` | `true` = the member pauses to ask you (optional) |

### Loop fields

| Field | Meaning |
| --- | --- |
| `until` | exit condition; also names the gate member |
| `max_rounds` | hard cap on iterations |
| `steps` | the members that repeat (first = gate) |

### Team-level

| Field | Meaning |
| --- | --- |
| `team` | name |
| `about` | one-line description |
| `model` | default model for members |
| `lead` | custom team-lead instructions (optional) |
| `report: github` | opt-in: post a run audit to the PR |

## Skill file format

A skill is `<name>/SKILL.md`:

```markdown
---
name: run-tests
description: Run the test suite, report pass/fail, surface failing cases.
---

# run-tests

Run the project's tests, summarize pass/fail, and list any failing cases.
```

## Files & locations

| Path | What |
| --- | --- |
| `~/.my-mini-team/teams/` | your global teams |
| `./teams/` | project-local teams (`--local`) |
| `~/.my-mini-team/skills/` | your mmt skill library |
| `~/.my-mini-team/runs/` | full run reports |
| `catalog/<user>/<team>/` | shared teams in the repo |
