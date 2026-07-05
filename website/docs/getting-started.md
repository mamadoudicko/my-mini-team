---
sidebar_position: 2
title: Getting started
---

# Getting started

Two minutes: install `mmt`, look at a team, run it.

## Install

Requires **Node 18+** and the **Claude Code CLI** (`claude`) logged in with your subscription.

```bash
git clone https://github.com/mamadoudicko/my-mini-team
cd my-mini-team
npm link            # puts `mmt` on your PATH
```

No dependencies to install — `mmt` is zero-dep Node. (`npm link` just symlinks the CLI. Or run it as `node bin/mmt …`.)

Check it works:

```bash
mmt help
```

## Look at a team

`mmt` ships with example teams. List them, then inspect one:

```bash
mmt                       # home — your teams
mmt show ship-feature     # the full workflow
```

You'll see something like:

```
ship-feature   from a task to a shipped, reviewed PR

1. strategist      turn the task into a short technical plan
2. coder           ·github-pr ·ticket-status  implement the plan
   ┌ loop · until reviewer approves · max 3
   │ 3. reviewer    ·github-comment  review the diff
   │ 4. coder       ·github-pr  address the comments
   └
5. qa              ·run-tests  run the tests
```

Each numbered line is a **member** (a role). The `·chips` are **skills** it uses. The bracket is a **loop** that repeats until a condition.

## Run it (offline first)

Preview the flow with **no cost** using `--sim`:

```bash
mmt run ship-feature "add a dark mode toggle" --sim
```

This plays a simulated tracker so you can feel the shape before spending anything.

## Run it for real

Drop `--sim` to run on your subscription. `mmt run` opens an interactive Claude Code session and executes the team as sub-agents:

```bash
mmt run ship-feature "add a dark mode toggle"
```

You watch each member work live, with elapsed time, loop rounds, and — when a member needs you — a pause for your input.

## Next

- Understand the pieces → [Concepts](/concepts)
- Build your own → [Create your first team](/guides/create-your-first-team)
