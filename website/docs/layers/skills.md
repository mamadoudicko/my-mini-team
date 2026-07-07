---
sidebar_position: 1
title: Skills
---

# Skills

The first (bottom) layer. A **skill** is a reusable capability — a real `SKILL.md` definition, not a label. It's the native Claude Code primitive: an agent plugs a skill in by name, and editing the skill once updates it everywhere it's used.

## Where skills live

`mmt` discovers skills from three sources (first match wins):

1. `./.claude/skills/<name>/SKILL.md` — the current project
2. `~/.my-mini-team/skills/<name>/SKILL.md` — your **mmt library**
3. `~/.claude/skills/<name>/SKILL.md` — your Claude Code skills (reused automatically)

List everything you can plug in:

```bash
mmt list skills          # alias: mmt skills
```

Out of a fresh clone your library starts empty, so `mmt list skills` finds nothing at first. Skills like `github-pr`, `github-comment`, `github-post`, `github-issue`, `run-tests`, `ticket-status`, … come bundled with specific teams — importing a team bundle (see [Sharing](/guides/sharing)) installs its skills into your library alongside it.

:::note Opt-in only
Skills are **never applied to everyone by default.** An agent has only the skills in its `skills: [...]`. What every sub-agent gets for free is baseline *tools* (read/edit/bash) — that's tool access, not a skill.
:::

## Create a skill

**By an agent (Claude-drafted)** — describe it, Claude drafts the `SKILL.md`:

```bash
mmt new skill deploy "deploy the current branch to staging and report the URL"
```

**Manually (author it yourself)** — `--ui` opens `$EDITOR` on a scaffolded `SKILL.md` so you write it by hand:

```bash
mmt new skill deploy --ui
```

## Edit a skill later

```bash
mmt edit skill github-pr "also request review from the codeowners"   # bare — describe the change, Claude rewrites it
mmt edit skill github-pr --ui                                        # --ui — edit it yourself in $EDITOR
```

Both update the definition wherever it's plugged in — no need to touch each agent that uses it.

## Plug a skill into an agent or team member

By talking:

```bash
mmt edit team spec-to-prod "give the coder a deploy skill"
mmt edit team spec-to-prod "the reviewer should also post on github"
```

Or in the team file:

```yaml
- uses: coder
  skills: [+deploy]
```

## Worked example: `github-pr`

The `coder` agent plugs in a `github-pr` skill shaped like this:

```markdown
---
name: github-pr
description: Open a pull request on GitHub, keep it updated with new commits, and set a clear title and description.
---

# github-pr

Open a pull request on GitHub, keep it updated with new commits, and set a clear title and description.
```

Frontmatter carries `name` and `description`; the body is the instruction the agent follows whenever it applies the skill.

## Skills travel with a team

When you share a team, its skills come along:

- `mmt export <team> [dir]` writes a directory bundle that includes `skills/<name>/SKILL.md` for every skill the team's agents reference.
- `mmt import <dir>` installs any missing skills into your library along with the team.

More in [Sharing](/guides/sharing).
