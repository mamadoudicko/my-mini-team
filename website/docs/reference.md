---
sidebar_position: 5
title: Reference
---

# Reference

## Commands

| Command | What it does |
| --- | --- |
| `mmt` | home — list your teams with `[local]`/`[global]` scope |
| `mmt list teams\|agents\|skills` | list what you have (aliases: `mmt teams` · `mmt skills` · `mmt agents`) |
| `mmt run <team> "task"` | run on your subscription (opens a Claude Code session) |
| `mmt new team\|agent\|skill <name> [text]` | create one — bare = describe it, Claude drafts it; `--ui` = author it yourself |
| `mmt edit team\|agent\|skill <name> ["change"]` | update one — bare = describe the change; `--ui` = edit it yourself |
| `mmt show team\|agent\|skill <name>` | print one |
| `mmt delete team\|agent\|skill <name>` | delete one (alias: `rm`) |
| `mmt export <team> [dir]` | write a reviewable bundle: `team.yaml` + `agents/` + `skills/` (`--force` to overwrite) |
| `mmt import <dir>` | install a bundle after a manifest + consent (or legacy `mmt import '<token>'` / `<file>`) |
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
team: spec-to-prod            # name (matches the file)
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
