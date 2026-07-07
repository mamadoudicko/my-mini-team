---
sidebar_position: 3
title: Concepts
---

# Concepts

`my-mini-team` is three stacked layers: native **skills** plug into **agents**, and agents compose into **teams** — mmt's own, proprietary layer. The whole model fits in one picture:

```
Team  (a named workflow)
 └─ steps  (ordered)
     ├─ Member   → a role + what it does + [skills] + optional model
     └─ Loop     → until <condition> · max_rounds → steps → Members
Skill  (a reusable capability, referenced by a member; lives in a shared library)
Team lead  (implicit, on top of every run: briefs the team, synthesizes the result)
```

## Team

A **team** is an ordered list of **steps**, saved as `<name>.team.yaml`. You name it and reuse it on any task. Teams live in two scopes:

- **global** (default): `~/.my-mini-team/teams/` — available anywhere.
- **local** (`mmt new team <name> --local`): `./teams/` — belongs to a project. A local team shadows a global one of the same name.

## Step: member or loop

A **step** is either a single **member** or a **loop** of members.

## Member

A **member** is a role with a job (`does`), the **skills** it plugs in, and optionally a **model** (`opus`/`sonnet`/`haiku`). At run time each member executes as a **fresh sub-agent** that receives the task, the team lead's brief, and everything earlier members produced.

```yaml
- member: reviewer
  does: review the diff for correctness bugs and real blockers
  skills: [github-comment]
  model: sonnet
```

## Loop

A **loop** repeats its inner members **until** a condition holds, capped by **max_rounds**. The first inner member is the **gate**: it ends its output with `VERDICT: APPROVE` (exit) or `VERDICT: CHANGES` (keep going). The classic use is a review→fix cycle.

```yaml
- loop:
    until: reviewer approves
    max_rounds: 3
    steps:
      - member: reviewer
        skills: [github-comment]
      - member: coder
        skills: [github-pr]
```

## Skill

A **skill** is a real, reusable capability defined in a `SKILL.md` file — not just a label. A member plugs a skill by name; editing the skill once updates it everywhere. Skills are discovered from your mmt library (`~/.my-mini-team/skills/`), your Claude Code skills (`~/.claude/skills/`), and the current project. Skills are strictly **opt-in per member** — nothing is applied to everyone by default. See [Skills](/layers/skills).

## The team lead

Every run has an implicit **team lead** on top. It **briefs** the members up front (what matters, what each should focus on), then **synthesizes** the final deliverable at the end. You don't add it — it's always there.

## Runs happen on your subscription

`mmt run <team>` opens an interactive Claude Code session (via the `/mmt` skill) and executes members as **in-session sub-agents** within it, so it uses your Claude subscription — not `claude -p` / the Agent SDK credit. More in [Running](/guides/running).
