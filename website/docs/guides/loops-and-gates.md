---
sidebar_position: 3
title: Loops & gates
---

# Loops & gates

A **loop** lets a team repeat work until it's good enough — the review→fix cycle, the test→fix cycle, the challenge→refine cycle.

## Anatomy

```yaml
- loop:
    until: reviewer approves        # the exit condition (human-readable)
    max_rounds: 3                   # hard cap — the loop can't run forever
    steps:
      - member: reviewer            # the GATE (first inner member)
        skills: [github-comment]
      - member: coder               # runs only if the gate asks for changes
        skills: [github-pr]
```

## How the gate decides

The **first inner member is the gate.** Each round it ends its output with exactly one of:

- `VERDICT: APPROVE` → the loop **exits** (remaining inner members are skipped — not needed).
- `VERDICT: CHANGES` + the specifics → the other inner members run (e.g. the coder fixes), then the next round starts.

The loop stops on approval or when it hits `max_rounds`.

:::tip The gate is chosen by name, not position
The gate is the member referenced in `until` (e.g. `reviewer approves`), so a `[coder, reviewer]` ordering still gates on the reviewer. Keep the `until` clause pointing at your reviewing member.
:::

## Where loops shine

- **Ship code:** `[reviewer → coder]` until approved.
- **Harden:** `[qa → coder]` until tests pass.
- **Sharpen a spec:** `[challenger → writer]` until there's enough context to build first-try.

## Tune the rounds

`max_rounds` is a default (3), set per team and editable:

```bash
mmt edit team spec-to-prod "make the review loop max 5 rounds"
```

You see the current round live while a run executes (`loop round 2/3`), and each round's verdict in the run report.
