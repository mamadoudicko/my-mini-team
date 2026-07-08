---
sidebar_position: 2
title: Getting started
---

# Getting started

Two minutes: install `mmt`, create a team, run it.

## Install

Requires **Node 18+** and the **Claude Code CLI** (`claude`) logged in with your subscription.

```bash
npm i -g @mamadoudicko/mmt      # puts `mmt` on your PATH
# …or run it without installing:
npx @mamadoudicko/mmt
```

Installing runs a **postinstall** that sets up the runtime so everything works out of the box: it installs the `/mmt` slash command into `~/.claude/commands/` (the one that drives `mmt run`/`new`/`edit` inside a Claude Code session). It never touches your own teams, agents, or skills. Opt out with `MMT_NO_POSTINSTALL=1`.

<details>
<summary>Install from source (for contributing)</summary>

```bash
git clone https://github.com/mamadoudicko/my-mini-team
cd my-mini-team
npm link          # puts `mmt` on your PATH  (or just run: node bin/mmt …)
```

No dependencies to install — `mmt` is zero-dep Node.
</details>

Check it works:

```bash
mmt help
```

## Create a team

Your library starts empty — describe a workflow in plain words and Claude composes it:

```bash
mmt                       # home — your teams (empty on a fresh install)
mmt new team spec-to-prod "strategist plans, coder builds and opens a PR, reviewer loops with the coder until approved, then qa runs the tests"
```

Then look at what got composed:

```bash
mmt show team spec-to-prod # the full workflow
```

You'll see something like:

```
spec-to-prod   take an agreed spec to prod — plan, build, review loop, qa, audit (no spec challenging; we already know what we want)

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
mmt run spec-to-prod "ship https://notion.so/Booking-history-PDF-export-1a2b3c4" --sim
```

This plays a simulated tracker so you can feel the shape before spending anything.

## Run it for real

Drop `--sim` to run on your subscription. `mmt run` opens an interactive Claude Code session and executes the team as sub-agents:

```bash
mmt run spec-to-prod "ship https://notion.so/Booking-history-PDF-export-1a2b3c4"
```

You watch each member work live, with elapsed time and loop rounds.

## Next

- Understand the pieces → [Concepts](/concepts)
- Build your own → [Create your first team](/guides/create-your-first-team)
