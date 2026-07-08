---
sidebar_position: 2
title: Agents
---

# Agents

The second layer. An **agent** is a role — a name, a model, and a default set of skills — that a team's steps reuse by name. Agents live as native `.claude/agents/<name>.md` files (local to a project or global under `~/.claude/agents/`), so they're the same primitive Claude Code itself uses.

## Create an agent

**By an agent (Claude-drafted)** — describe the role, Claude drafts it and auto-selects the skills that fit:

```bash
mmt new agent coder "implements a planned change cleanly and opens a PR"
```

**Manually (author it yourself)** — `--ui` opens the interactive Ink editor: description, model, and default-skills checkboxes:

```bash
mmt new agent coder --ui
```

## Edit an agent later

```bash
mmt edit agent coder "also run the test suite before opening the PR"   # bare — describe the change, Claude rewrites it
mmt edit agent coder --ui                                              # --ui — edit description / model / skills yourself
```

## Worked example: `coder`

The `coder` agent, at `.claude/agents/coder.md`:

```markdown
---
name: coder
description: Implements a planned change cleanly, follows repo conventions, and opens/updates a PR.
model: sonnet
skills: [github-pr]
---

# coder

Implement the plan for the current step, following the repo's conventions and CLAUDE.md. Keep the change minimal and focused. When opening or updating a pull request, apply the github-pr skill.
```

Frontmatter carries `name`, `description`, an optional `model`, and the default `skills:` the agent plugs in; the body is the role's instructions. A team step can add more skills on top of these defaults (see [Teams](/layers/teams)).

## Where agents live

Same two scopes as teams and skills:

- **local** — `./.claude/agents/<name>.md`, committed with the project.
- **global** — `~/.claude/agents/<name>.md`, available from any project.

List what you have:

```bash
mmt list agents          # alias: mmt agents
```
