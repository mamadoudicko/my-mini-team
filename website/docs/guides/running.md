---
sidebar_position: 4
title: Running a team
---

# Running a team

```bash
mmt run <team> "your task"
```

## It runs on your subscription

`mmt run` **auto-opens an interactive Claude Code session** and executes the team's members as **sub-agents** inside it. That means it uses your **Claude subscription**, not `claude -p` / the Agent SDK credit.

- Inside a Claude Code session you can also run it directly: `/mmt run <team> "task"`.
- From a plain terminal, `mmt run …` launches that session for you (one command).

## Choose the model

```bash
mmt run spec-to-prod "…" --model opus        # force one model for the whole run
```

Precedence: `--model` → member `model:` → team `model:` → your default. Set per-member models for cost/speed (e.g. reviewer on `sonnet`, coder on `opus`).

## Preview for free

```bash
mmt run spec-to-prod "…" --sim
```

A simulated tracker with **no Claude calls** — handy to check the shape and timing of a workflow.

## Watch it work (observability)

While a team runs you see, live:

- **who is active** — the team lead vs a specific member,
- **elapsed time** total and per member,
- the **loop round** it's on,
- steps that are pending, done, or skipped.

Every real run also writes a full report to `~/.my-mini-team/runs/<team>-<timestamp>.md`.

## Opt-in run audit on the PR

Add a `reporter` member (plugging the `publish-report` skill) or set `report: github` on a team, and a run posts a concise, collapsible **audit** — steps, per-member time, rounds, verdicts, total, and a link to the full report — as a comment on the PR. It's strictly opt-in: teams without it post nothing.

## Off-subscription escape hatch

`--headless` runs via `claude -p` instead. This draws from the **Agent SDK credit / API**, not your subscription — avoid it unless you specifically want headless/automated execution.
