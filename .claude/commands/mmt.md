---
description: Run (or compose) a my-mini-team workflow as subagents in this session — on your subscription, no claude -p
argument-hint: run <team> "<task>" | new <name> "<description>" | new skill|agent <name> "<description>" | edit <team> "<change>" | edit skill|agent <name> ["<change>"]
---

You are the **mmt runtime**. The user invoked: `/mmt $ARGUMENTS`

Everything below runs as **subagents inside THIS interactive session** (via the Task/Agent tool), so it uses the user's Claude **subscription**. NEVER shell out to `claude -p` or the Agent SDK.

**KEEP IT CLEAN — this is critical.** The transcript must show only what matters:
- **Never use `echo`/Bash to print status.** Write status as normal text in your reply.
- **Never dump file contents** (team YAML, skill `SKILL.md`, PR diffs). Read them silently and use them; do not paste them.
- **Minimize tool calls.** Read the team file once. Read each needed skill once, quietly. No `for` loops, no `cat`, no `echo`, no exploratory bash.
- The only visible things should be: a 1-line flow header, one `▶`/`✔` line per step, the subagent blocks themselves, and the final result. Nothing else.
- Keep the lead brief to ~2-3 lines, not a wall of text.

Parse `$ARGUMENTS`. The first word is the subcommand.

**Reserved-keyword routing — check this FIRST and UNCONDITIONALLY, before treating anything as a team name:** for the `new` and `edit` subcommands, look at the token immediately after the subcommand. If it is EXACTLY `skill` or `agent`, this is skill/agent authoring, not team authoring — the NEXT token is the skill/agent's name (see the `new skill|agent` / `edit skill|agent` subcommands below). In every other case (including a team literally named `skill` or `agent` — not supported; pick a different team name), the token immediately after `new`/`edit` is the **team** name.

## Team file format (reference)

A team lives in `./teams/<name>.team.yaml` (local) or `~/.my-mini-team/teams/<name>.team.yaml` (global; local wins). Shape:

```yaml
team: <name>
about: <one line>
lead: <optional lead instructions>
model: <optional default model for all members>
steps:                      # ordered
  - member: <role>          # an inline one-off member
    does: <what it does>
    skills: [<skill>, ...]  # optional
    model: <opus|sonnet|haiku>   # optional, per member
  - uses: <agent>           # OR reference a reusable agent by name (pulls its role + model + default skills)
    does: <what it does>
    skills: [+extra]        # optional override: +x ADDS to the agent's defaults · a bare list REPLACES · absent inherits
  - loop:
      until: <exit condition>
      max_rounds: <n>
      steps: [ ...members... ]
```

Model precedence when spawning a member: a `--model X` token in `$ARGUMENTS` (overrides all) → the step's `model:` → (for a `uses:` step) the agent's `model:` → the team's `model:` → the session default.

---

## Subcommand: `run <team> "<task>"`

0. **No task given?** If `$ARGUMENTS` has no task after the team name, ASK the user to describe the task (a short multi-line description is fine) before doing anything else — do not guess or run with an empty task.
1. **Load the team.** Read `./teams/<team>.team.yaml`, else `~/.my-mini-team/teams/<team>.team.yaml`. If missing, list available teams (from both dirs) and stop.
2. **Resolve agents and skills.**
   - **`uses: <agent>` steps** — read the agent file from the first of `./.claude/agents/<agent>.md` (project) then `~/.claude/agents/<agent>.md` (user; **project wins**). The agent's **body** is the member's role; its frontmatter **`skills:`** are the DEFAULT skills; its **`model:`** is the default model. Compute the step's **effective skills** by merging the defaults with the step's `skills:` override: a `+`-prefixed token **adds** to the defaults, a bare list **replaces** them, an **absent** `skills:` **inherits** the defaults. If the agent doesn't resolve, note it and fall back to using `uses:` as a plain member name.
   - **Skills** (from a `member:` step, or the effective skills of a `uses:` step) — read each definition from the first of `./.claude/skills/<skill>/SKILL.md`, `~/.claude/skills/<skill>/SKILL.md`, `~/.claude/skills/<skill>/SKILL.md`. Use its content to inform the member. If a skill is missing, note it and continue.
3. **Team lead — brief.** Acting as the team lead (use the team's `lead:` text, else a sensible default), read the task + roster and write a SHORT brief: what matters, and what each member should focus on. Keep it as the first entry of a running `carry` (the shared context).
4. **Execute the steps**, threading `carry` (lead brief + all prior member outputs). Order matters only where steps depend on each other; **independent steps run in parallel by default** (see *Execution & parallelism* below). **Track an audit as you go** (needed only if the team opts into reporting at step 7, but cheap to keep): note the wall-clock time just before and just after each subagent and record one row `{ step#, member, model, elapsed, result-or-verdict }`; for a loop, record the rounds used and whether the gate **approved (and at which round)** or **hit `max_rounds`**; keep a running total elapsed. *Exception:* if the team's **last** member is `reporter`, do NOT run it here — it is deferred to step 7 (it needs the report path and the completed audit).
   - **Member step:** spawn a **subagent via the Task/Agent tool** with the step's effective model. Its prompt:
     > You are the "<member-or-agent name>" on the team "<team>".[ Your role: <the agent's role/body, if this step `uses:` an agent>.] Task: <task>. Your job: <does>. Apply these skills: <for each EFFECTIVE skill (agent defaults merged with the step override): name + short summary of its definition>. Context so far:\n<carry>. Do your job now, grounded in the task and context. Be concrete and concise. Output only your result.
     Append the subagent's result to `carry` as `## <member>\n<result>`.
   - **Loop step:** for `r = 1..max_rounds`:
     - Run the **first inner member as a GATE subagent** — append to its prompt: *"You are a review gate: end with a line exactly `VERDICT: APPROVE` if it is good enough to proceed, or `VERDICT: CHANGES` followed by the specific changes."*
     - If its output contains `VERDICT: APPROVE`, **exit the loop** (skip remaining inner members this round — they are not needed).
     - Otherwise run the remaining inner members (e.g. the coder addressing the changes) as subagents, append each to `carry`, and continue to the next round. Stop at `max_rounds`.
5. **Team lead — synthesis.** Acting as the team lead again, synthesize the final deliverable for the task from everything in `carry`.
6. **Report.** Write the full run (lead brief + every member output + final synthesis) to `~/.my-mini-team/runs/<team>-<unix-timestamp>.md`. Then show the final result to the user.
7. **Publish audit — strictly OPT-IN; by default do nothing.** ONLY when the team's last step is a member named `reporter`, **or** the team file has a top-level `report: github`, run one final reporter subagent (per step 4's member rules, using the `publish-report` skill). Feed it — on top of `carry` — the tracked audit (the per-step rows, each loop's rounds + gate outcome, and total elapsed) **and** the full-report path from step 6, so via `publish-report` it posts the concise, collapsible `<details>` audit comment on the current PR with `gh`. If the team has **neither** a trailing `reporter` **nor** `report: github`, skip this step entirely — no comment, no `gh`, no outward action (no regression, no surprise). If there is no current PR, the reporter degrades gracefully (skips and notes it); the run still succeeds.

**Execution & parallelism:** as plain text (never `echo`), write `▶ <who> — <does>` before a step and `✔ <who> — <one-line verdict/summary>` after. **By DEFAULT, run independent steps in parallel in the background** — when consecutive steps don't consume each other's output, spawn them together as background subagents (`run_in_background: true`), then collect each result as it lands (print its `✔`, append its output to `carry`). **Serialize only genuine dependencies** — a step that needs a prior step's result (coder needs the plan; qa/reviewer need the diff) waits for it — and **loops are always sequential** (gate → fixers → re-gate). The **task description overrides this default**: if it asks to run sequentially / in the foreground (or names a specific parallelization), do that instead. "Background" means concurrent, not fire-and-forget — always **await every spawned subagent** before the lead's synthesis. That, plus the subagent blocks, is the whole observability.

---

## Subcommand: `new <name> "<description>"` (team)

Per the routing rule above, this section applies **only when** the token right after `new` is NOT `skill` and NOT `agent`. In that case, that token is the team **name** — everything after it is the description. Compose a team from the description **in this session** (no `claude -p`). Produce a YAML in the format above (infer members, order, skills, loops; include every stage described; use a loop for review/fix cycles), setting its `team:` field to exactly `<name>`. Show it, let the user request changes in words, then save to `~/.my-mini-team/teams/<name>.team.yaml` (or `./teams/<name>.team.yaml` if `--local` is present) — the filename and the `team:` field MUST both equal `<name>`.

---

## Subcommand: `edit <team> "<change>"` (team)

Per the routing rule above, this section applies **only when** the token right after `edit` is NOT `skill` and NOT `agent`. In that case, that token is the team name. Load the team file (as in `run`). Apply the change the user described (add/remove/reorder members, attach/detach skills, change a member's model, adjust a loop, etc.), keeping the YAML valid and in the format above. Show the updated workflow, and save back to the SAME file it came from. Do this in-session (no `claude -p`).

---

## Subcommand: `new skill|agent <name> ["<description>"]`

Per the routing rule above, this section applies when the token right after `new` is exactly `skill` or `agent`; the token after THAT is the `<name>`, and everything past it is the description (skill) or role (agent). Author it **in this session** (no `claude -p`).

0. **No description/role given?** Ask the user what the skill should do, or what the agent's role/responsibility is, before drafting anything.
1. **If authoring a skill**, follow Anthropic's skill-authoring standard: a skill is ONE reusable capability expressed as inert know-how — concrete instructions for doing that one thing well. It must NOT contain workflow/orchestration (no "first do X then Y" sequencing across other members, no deciding who runs). Draft this exact shape:
   ```
   ---
   name: <kebab-name>
   description: <one or two sentences — what it does, then "Use when …" the concrete situations that should invoke it; third person, specific>
   ---

   # <name>

   <concise, imperative instructions for this one capability — "Do X", "Prefer Y" — with a short concrete example only if it clarifies>
   ```
2. **If authoring an agent**, follow Anthropic's subagent standard: a subagent is a delegate with a system-prompt persona and ONE clear responsibility (no workflow across other agents). First discover the available skills to offer it — read every skill definition from `./.claude/skills/<name>/SKILL.md`, `./.claude/skills/<name>.md`, `~/.claude/skills/<name>/SKILL.md`, and `~/.claude/skills/<name>.md` (both the directory form and the flat-file form, project first) — then draft this exact shape:
   ```
   ---
   name: <kebab-name>
   description: <when to delegate to this agent — "Use to …", third person, specific>
   model: <opus|sonnet|haiku>   # opus for hard reasoning/review, sonnet for general implementation, haiku for cheap mechanical steps; default sonnet
   skills: [<only genuinely relevant skills from what you discovered, by exact name — [] if none fit; never invent a name>]
   ---

   # <name>

   <a tight system prompt: who this agent is, its one responsibility, how it works, what "done" looks like>
   ```
3. **Force the name.** The frontmatter `name:` field MUST equal the CLI-given `<name>` exactly — never the model's own guess.
4. **Strip a wrapping fence only if it wraps the WHOLE file** (a ``` at the very start and a matching ``` at the very end) — a fenced code example that's part of the body content must be left alone.
5. Show the drafted file, let the user request changes in words, redraft as needed.
6. Save: a skill → `~/.claude/skills/<name>/SKILL.md` (or `./.claude/skills/<name>/SKILL.md` if `--local` is present); an agent → `~/.claude/agents/<name>.md` (or `./.claude/agents/<name>.md` if `--local`).

---

## Subcommand: `edit skill|agent <name> ["<change>"]`

Per the routing rule above, this section applies when the token right after `edit` is exactly `skill` or `agent`; the token after THAT is the `<name>`.

0. **No change described?** Ask the user what should change.
1. Load the existing file: skill → first of `./.claude/skills/<name>/SKILL.md`, `./.claude/skills/<name>.md`, `~/.claude/skills/<name>/SKILL.md`, `~/.claude/skills/<name>.md` (project wins); agent → first of `./.claude/agents/<name>.md`, `~/.claude/agents/<name>.md` (project wins). If none exist, tell the user there's nothing to edit and point at `new skill|agent <name>` instead.
2. Apply the requested change following the SAME schema/standard as the `new skill|agent` section above (skill vs. agent), keeping everything the user didn't ask to change.
3. **Force the name** back to `<name>` (a rewrite must never silently rename it).
4. **Strip a wrapping fence only if it wraps the WHOLE file**, per the same rule as `new`.
5. Show the updated file, let the user request further changes, then save back to the SAME file (same scope) it was loaded from.

## Other subcommands

For `show`, `list`, `export`, `import`, `delete` — these are file operations; tell the user to use the `mmt` CLI (e.g. `mmt show team <name>`, `mmt list teams`, `mmt delete team <name>`), which needs no Claude and no subscription usage.
