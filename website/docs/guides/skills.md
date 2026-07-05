---
sidebar_position: 2
title: Skills
---

# Skills

A **skill** is a reusable capability — a real `SKILL.md` definition, not a label. A member plugs a skill by name; edit it once and every member that uses it gets the change.

## Where skills live

`mmt` discovers skills from three sources (first match wins):

1. `./.claude/skills/<name>/SKILL.md` — the current project
2. `~/.my-mini-team/skills/<name>/SKILL.md` — your **mmt library**
3. `~/.claude/skills/<name>/SKILL.md` — your Claude Code skills (reused automatically)

List everything you can plug in:

```bash
mmt skills
```

Out of a fresh clone only `publish-report` ships in the repo's `skills/` dir, so that's all `mmt skills` finds at first. The rest (`github-pr`, `github-comment`, `github-post`, `github-issue`, `run-tests`, `ticket-status`, …) live inside catalog teams — you get them when you `mmt import` a catalog team, which installs its bundled skills into your library.

:::note Opt-in only
Skills are **never applied to everyone by default.** A member has only the skills in its `skills: [...]`. What every sub-agent gets for free is baseline *tools* (read/edit/bash) — that's tool access, not a skill.
:::

## Plug a skill into a member

By talking:

```bash
mmt edit task-shipper "give the coder a deploy skill"
mmt edit task-shipper "the reviewer should also post on github"
```

Or in the team file:

```yaml
- member: coder
  skills: [github-pr, ticket-status]
```

## Create or edit a skill

```bash
mmt skill new deploy        # scaffold + open in your editor
mmt skill edit github-pr    # edit the definition (updates everywhere it's used)
mmt skill show github-pr    # view it
```

A skill file is small:

```markdown
---
name: deploy
description: Deploy the current branch to staging and report the URL.
---

# deploy

Run the project's deploy command for staging, wait for it to finish,
and return the deployment URL.
```

## Skills travel with a team

When you share a team, its skills come along:

- `mmt export <team>` produces a token that **bundles** the referenced skill definitions.
- Importing that token (or a catalog folder) installs any missing skills into your library.

More in [Sharing](/guides/sharing).
