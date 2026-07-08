---
slug: /
sidebar_position: 1
title: What is my-mini-team?
---

# my-mini-team

**Compose your own agent workflows, run them on any task, and share them.** The CLI is `mmt`.

> Stop doing the work. Architect the team that does it.

## The idea in 30 seconds

`my-mini-team` is three stacked layers: native **skills** (`SKILL.md` capabilities) plug into **agents** (roles with a model and a default skill set), and agents compose into **teams** — mmt's own, proprietary layer — as ordered steps and loops. Instead of prompting one agent over and over, you **describe a team once** and then **run that team on any task**. `mmt run <team>` spawns the team's agents as in-session Claude subagents on your subscription — via the `/mmt` skill, not `claude -p` — and you watch every step.

```
mmt run <team> "add SMS reminders to booking confirmations"
```

A team is just a small, readable file. You compose it by talking, reuse it by name, and share it so others can install it in one command.

## Why it's different

- **Your way, encoded.** A team captures *how you ship* — plan, code, review, test — as a reusable object, not a one-off prompt.
- **Legible.** `mmt show team <team>` prints the whole workflow: who does what, which skills, which loops.
- **On your subscription.** Runs execute as sub-agents inside an interactive Claude Code session — no separate API billing.
- **Shareable.** `mmt export <team> <dir>` writes a reviewable directory bundle.
  Hand the dir to someone who runs `mmt import <dir>`.

## What you'll learn here

1. [Getting started](/getting-started) — install and run your first team in two minutes.
2. [Concepts](/concepts) — the model: team → members / loops → skills, and the team lead.
3. [Create your first team](/guides/create-your-first-team) — compose, refine, and run your own.
4. [Skills](/layers/skills), [Loops & gates](/guides/loops-and-gates), [Running](/guides/running), [Sharing](/guides/sharing).
5. [Reference](/reference) — every command and the team-file format.

New here? Start with [Getting started →](/getting-started)
