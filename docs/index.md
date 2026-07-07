# my-mini-team

Compose your own agent **workflows** (teams), run them on any task, and share them. CLI: `mmt`.

> Stop doing the work. Architect the team that does it.

[Repo on GitHub](https://github.com/mamadoudicko/my-mini-team)

---

## Commands

| Command | What it does |
| --- | --- |
| `mmt` | home — list your teams (with `[local]`/`[global]` scope) |
| `mmt list teams\|agents\|skills` | list what you have (aliases: `mmt teams` · `mmt skills` · `mmt agents`) |
| `mmt run <team> "task"` | run it (auto-opens a Claude Code session on your subscription) |
| `mmt new team\|agent\|skill <name> [text]` | create one — bare = describe it, Claude drafts it; `--ui` = author it yourself |
| `mmt edit team\|agent\|skill <name> ["change"]` | update one — bare = describe the change; `--ui` = edit it yourself |
| `mmt show team\|agent\|skill <name>` | print one |
| `mmt delete team\|agent\|skill <name>` | delete one (alias: `rm`) |
| `mmt export <team> [dir]` | write a reviewable bundle: `team.yaml` + `agents/` + `skills/` (`--force` to overwrite) |
| `mmt import <dir>` | install a bundle after a manifest + consent (or legacy `mmt import '<token>'`) |
| `mmt help` | list everything |

**Flags for `run`:** `--model opus\|sonnet\|haiku` (override), `--sim` (offline preview, no cost).

---

## Practical tips

- **It runs on your subscription.** `mmt run` auto-opens an interactive Claude Code session and executes the team as subagents — no `claude -p`, no separate billing.
- **Pick the model per member.** Add `model: opus` (or `sonnet`/`haiku`) on a member; override the whole run with `mmt run … --model sonnet`. Precedence: `--model` → member `model:` → team `model:` → default.
- **Preview for free.** `mmt run <team> "…" --sim` plays a simulated tracker with no Claude calls — handy to check the flow.
- **Members can ask you.** Mark a member `interactive: true` (or name it like `clarifier`) and it pauses to ask you questions mid-run. Any member can also end with `NEEDS INPUT:` to wait for you.
- **Local vs global teams.** Global is the default (`~/.my-mini-team/teams/`, available anywhere); `mmt new team <name> --local` scopes to `./teams/`. A local team shadows a global one of the same name; the home list tags each.
- **Loops converge on a verdict.** A loop repeats until its gate member emits `VERDICT: APPROVE`, capped by `max_rounds`. The gate is picked by the member named in `until` (not by position).
- **Share a team.** `mmt export <team> [dir]` writes a reviewable directory bundle (`team.yaml` + `agents/` + `skills/`) into `dir`.
  The recipient runs `mmt import <dir>` to review the manifest and install it; a base64 token shared out-of-band still works as a legacy inbound `mmt import '<token>'` form.
- **Opt-in run audit.** Add a `reporter` member (plugging `publish-report`) or set `report: github`, and a run posts a concise audit — steps, per-member time, rounds, verdicts, total, link to the full report — as a collapsible PR comment. Strictly opt-in.

---

## mmt library

Community mini-teams, auto-generated from the [`catalog/`](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog) folder (see [#8](https://github.com/mamadoudicko/my-mini-team/issues/8)). **Do not hand-edit between the markers** — the generator rewrites this list (and the README) from the catalog.

<!-- mmt:catalog:start -->
- [mamadoudicko/idea-to-prod](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/idea-to-prod/) — take a raw idea all the way to prod — publish the issue as a first draft early, iterate it in place with a challenger, get explicit user validation, then build, review, qa, audit
- [mamadoudicko/idea-to-spec](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/idea-to-spec/) — formulate a raw idea into a clear, implementable spec (in your tracker of choice — GitHub, Notion, …), challenged until it's right first-try
- [mamadoudicko/spec-to-prod](https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/mamadoudicko/spec-to-prod/) — take an agreed spec to prod — plan, build, review loop, qa, audit (no spec challenging; we already know what we want)
<!-- mmt:catalog:end -->

**Share yours** via PR: add `catalog/<user>/<team>/` (your `<team>.team.yaml` + its `skills/`) — the index above (this page **and** the README) regenerates automatically. Install a catalogued team with `mmt import catalog/<user>/<team>/<team>.team.yaml` (bundled skills come with it).

> Heads-up on trust: installing a shared team runs its members' prompts with your tools (bash, `gh`, edit). Review what a team's members and skills do before running it.
