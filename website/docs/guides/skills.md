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

## Share one skill on its own

You don't need a team — or a fork — to hand someone a single skill. `mmt skill export`/`import` mirror the team `export`/`import` UX at the skill level.

```bash
mmt skill export github-pr        # prints:  mmt skill import 'mmts1:…'   (copy the whole line)
mmt skill import 'mmts1:…'        # recreate the skill anywhere
```

The token is deterministic and offline — `mmts1:` followed by base64 of `{name, content}` — so a copy-paste rebuilds the exact `SKILL.md`.

`mmt skill import` installs **one** skill from any of:

- a token (`mmts1:…`),
- a local `SKILL.md` file path,
- a catalog skill dir — `catalog/skills/<user>/<skill>/` or its `SKILL.md`.

```bash
mmt skill import catalog/skills/mamadoudicko/github-pr   # install from the catalog, no fork
mmt skill import ./my-skill/SKILL.md --local             # into ./.claude/skills instead of your library
```

It writes to `~/.my-mini-team/skills/<name>/SKILL.md` (or `./.claude/skills/<name>/SKILL.md` with `--local`). The name is sanitized against `[a-z0-9._-]` with no path traversal, and an identical existing skill is left untouched.

### The `catalog/skills/<user>/<skill>/` convention

Standalone, shareable skills live under `catalog/skills/<user>/<skill>/SKILL.md`. Add yours there and open a PR; the [Library](/library) page and the README regenerate automatically from the catalog.

## Skills travel with a team

When you share a team, its skills come along:

- `mmt export <team>` produces a token that **bundles** the referenced skill definitions.
- Importing that token (or a catalog folder) installs any missing skills into your library.

More in [Sharing](/guides/sharing).
