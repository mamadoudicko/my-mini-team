# my-mini-team

Compose your own agent **workflows** (teams), run them on any task, and share them. CLI: `mmt`.

> Stop doing the work. Architect the team that does it.

[Repo on GitHub](https://github.com/mamadoudicko/my-mini-team)

---

## Commands

| Command | What it does |
| --- | --- |
| `mmt` | home — list your teams (with `[local]`/`[global]` scope) |
| `mmt show <team>` | full workflow: steps, skills, loops, models |
| `mmt run <team> "task"` | run it (auto-opens a Claude Code session on your subscription) |
| `mmt new ["describe it"]` | compose a team from a plain-language description (`--local` for this folder) |
| `mmt edit <team> ["change"]` | change a team by describing it in words |
| `mmt delete <team>` | delete a team (all copies) |
| `mmt skills` | list reusable skills you can plug into a member |
| `mmt skill new\|edit\|show <name>` | create / edit / view a skill definition |
| `mmt export <team> [--raw]` | portable token (bundles skill definitions) or `--raw` yaml |
| `mmt import '<token>'` | recreate a team from a token, yaml, or file |
| `mmt help` | list everything |

**Flags for `run`:** `--model opus\|sonnet\|haiku` (override), `--sim` (offline preview, no cost), `--headless` (off-subscription `claude -p`).

---

## Practical tips

- **It runs on your subscription.** `mmt run` auto-opens an interactive Claude Code session and executes the team as subagents — no `claude -p`, no separate billing. `--headless` is the only path that uses the Agent SDK credit; avoid it unless you mean to.
- **Pick the model per member.** Add `model: opus` (or `sonnet`/`haiku`) on a member; override the whole run with `mmt run … --model sonnet`. Precedence: `--model` → member `model:` → team `model:` → default.
- **Preview for free.** `mmt run <team> "…" --sim` plays a simulated tracker with no Claude calls — handy to check the flow.
- **Members can ask you.** Mark a member `interactive: true` (or name it like `clarifier`) and it pauses to ask you questions mid-run. Any member can also end with `NEEDS INPUT:` to wait for you.
- **Local vs global teams.** Global is the default (`~/.my-mini-team/teams/`, available anywhere); `mmt new --local` scopes to `./teams/`. A local team shadows a global one of the same name; the home list tags each.
- **Loops converge on a verdict.** A loop repeats until its gate member emits `VERDICT: APPROVE`, capped by `max_rounds`. The gate is picked by the member named in `until` (not by position).
- **Share a team.** `mmt export <team>` prints an `mmt import '…'` token that bundles the skill definitions, so it recreates exactly on another machine. `--raw` gives readable YAML instead.
- **Opt-in run audit.** Add a `reporter` member (plugging `publish-report`) or set `report: github`, and a run posts a concise audit — steps, per-member time, rounds, verdicts, total, link to the full report — as a collapsible PR comment. Strictly opt-in.

---

## mmt library

Starter teams (run with `mmt run <team> "your task"`):

| Team | What it does |
| --- | --- |
| `ship-feature` | from a task to a shipped, reviewed PR |
| `dev` | plan → code → review/fix loop → qa (generic coding task) |
| `pr-review` | review the open PR, address the feedback, loop until approved, then qa |
| `idea-to-issue` | turn a raw idea into a well-scoped GitHub issue, challenged until it is implementable right the first time |

**Get more / share yours.** Teams are shareable objects. `mmt export <team>` gives a copy-paste token; `mmt import '<token>'` installs it (skills included). The community library grows by **PR**: add your team (its export token + a one-line description) and, once reviewed, others install it in one command.

> Heads-up on trust: installing a shared team runs its members' prompts with your tools (bash, `gh`, edit). Review what a team's members and skills do before running it.
