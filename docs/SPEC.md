# my-mini-team - Technical Spec

> **Stop doing the work. Architect the team that does it.**

CLI binary: `mmt` · Product: `my-mini-team` · Runtime: Node 18+, zero deps · Teams are globally available (install once, use from any project)

## The idea

You own a topic and an epic. Today you personally walk it through the loop: tech strategy, gather context from Notion, code, open a PR, review, test locally. `my-mini-team` lets you **delegate that whole loop to a standing team** that works the way you would, while you supervise by exception.

You do not orchestrate the team by hand, and you do not rebuild it per task. You define a **roster** of members once. For each task, a **lead** picks the **lineup** (the members that actually fit this task) and runs it automatically, pausing only when it genuinely needs a human.

Teams are shareable (`@author/name`), installed globally, and each is navigable as a schema so you understand it before you run it. It is not dev-only: `create-prd`, `research`, `plan-sprint` are teams too.

## Agent-first (principle)

`my-mini-team` is agent-first in three senses, and this shapes every surface below:

1. **Creation is agentic, not a form.** You describe the team you want in plain language; an agent inspects your repo (stack, tests, CI, conventions, `CLAUDE.md`, connected MCP servers) and drafts the whole team: roster, members, contracts, and lead. You refine by talking to it. Hand-writing YAML is the fallback, not the default.
2. **Members are repo-aware contributors.** A member does not just follow instructions in a vacuum; it reads the codebase, follows its conventions, and contributes for real (branch, edit, run tests, open a PR). The repo is first-class context, not something you paste in.
3. **The CLI itself is drivable by an agent.** Every command runs headless (`--plain`, `--json`), so an agent (inside Claude Code or CI) can create, install, and run teams programmatically. A human uses the picker; an agent uses the same commands.

## Core concepts

### Member (the atom)
A typed agent-component. Same small vocabulary every time, which is what makes members composable and swappable:

- **feed** -> `consumes`: typed inputs it needs
- **teach** -> `knowledge`: docs, conventions, examples it loads
- **interact** -> `tools`: what it can touch (bash, edit, an MCP server, Notion)
- **guarantee** -> `produces`: typed outputs it promises
- **kind**: `worker | gate | loop | interactive | challenger | researcher`
- **applies_when**: relevance condition the lead uses to include or skip it

Members are the shared foundation. Namespaced (`@mamadoudicko/reviewer`) and reusable across teams.

### Team (the roster)
A roster of candidate members plus a lead. Not a fixed pipeline and not on/off toggles. It declares an `input` type and an `output` promise, and the members it can call on.

### Lead (the composer)
An agent that plays your role as topic owner. Per task it reads the INPUT (plus gathered context) and returns the lineup: which members fire, in what order, and why. It answers "do I need a QA on this one?" so you do not have to.

### Contract (the guardrail)
Members declare `consumes` / `produces` as typed artifacts. Contracts are **strict** but demoted to a guardrail: they do not dictate order, they verify a chosen lineup is coherent (every `consumes` satisfied by the `input` or an upstream `produces`, and the team's `output` promise is actually produced). A lineup that cannot satisfy the promise fails before running.

### Supervise (control): "supervise by exception"
Default is fully automatic.

- **auto** (default): lead composes the lineup and runs end to end, no checkpoints.
- **raise-hand** (always on): any member can pause for the human on ambiguity, a risky or irreversible action, or an author-defined checkpoint.
- **--supervise plan**: lead's lineup needs approval before running.
- **--supervise step**: approve each member.

### Two selections, two altitudes
1. The human picks the **team** (which playbook).
2. The lead picks the **lineup** (which members fire for this task).

Neither is manual toggling.

## UX (task-first)

```
$ mmt "add SMS reminders to booking confirmations"

  Who should run this?

  > ship-epic      spec -> shipped PR          @you      5 members
    create-prd     idea -> challenged PRD      @you      interactive
    research       question -> cited report    @mamadou
    + create a new team

  arrows navigate   right = preview roster   enter = run   n = new
```

Right-arrow expands a row into its schema (roster + flow), so you navigate architectures instead of guessing from names.

### Commands

| Command | Does |
| --- | --- |
| `mmt "INPUT"` | task-first picker, then run the chosen team |
| `mmt run <team> "INPUT"` | run a specific team, skip the picker |
| `mmt new team <name> "<description>"` | agent-assisted team builder: reads your repo, drafts the team |
| `mmt new --manual` | step-by-step manual builder (place every member by hand) |
| `mmt edit team <team>` | reopen the conversational builder on an existing team |
| `mmt edit team <team> --form` | structured field editor for the team and its members |
| `mmt set <team>[.member] <field> <value>` | change one parameter directly (scriptable) |
| `mmt get <team>[.member] [field]` | inspect current settings |
| `mmt fork @author/team` | copy a shared team into your namespace to customize |
| `mmt ls` | list installed teams with one-line signatures |
| `mmt show team <team>` | print a team's schema (mermaid, or `--ascii`) |
| `mmt check <team>` | strict contract validation of the roster |
| `mmt search <query>` | discover teams / members in the registry |
| `mmt install @author/name` | install a shared team globally, compiled in your context |
| `mmt update @author/name` | update an installed team and its members |
| `mmt uninstall @author/name` | remove an installed team |
| `mmt publish <team>` | push a team to the registry under your namespace |
| `mmt members` | list installed members (the shared building blocks) |
| `mmt runs` | list active and past runs |
| `mmt attach <run-id>` | reattach to a detached live run |
| `mmt resume <run-id>` | resume a run that parked waiting for you |
| `mmt logs <run-id>` | full transcript of a run |
| `mmt init` / `mmt doctor` | set up / health-check the global environment |

Flags: `--supervise auto|plan|step`, `--ascii`, `--plain` (line logs instead of the live view), `--json` (machine-readable output, for agents driving the CLI), `--dry-run` (show the lineup the lead would pick without running). Remembers the last team; `mmt run <team>` skips the picker.

## Creating a team (agent-first)

The default path is describe-and-build: an agent reads your repo and drafts the team. A manual wizard exists for full control.

### Agent-assisted (default)

```
$ mmt new team ship-epic "take an epic and ship a reviewed PR, using our Notion for context"

  reading the repo...
    stack: TypeScript + React Native (Expo) · tests: vitest · CI: EAS + fastlane
    context: Notion MCP connected · found CLAUDE.md, commit style, PR template

  proposed team: ship-epic          epic -> shipped
    lead (opus)         topic owner, composes the lineup per epic
    context-gatherer    pulls the epic + linked Notion spec        [reuse @you/context-gatherer]
    tech-strategist     epic -> strategy.md (task breakdown)       [new, drafted]
    coder               implements tasks, follows CLAUDE.md        [reuse @you/coder]
    reviewer (gate)     adversarial review                         [reuse @you/reviewer]
    qa (loop)           runs vitest, applies_when user-facing       [new, drafted]
    pr-opener           opens a PR with your template              [new, drafted]

  contracts: valid (epic -> ... -> shipped)
  tools this team will use: read, edit, bash(git, vitest), notion(mcp)

  refine in words, or  [a]ccept  [e]dit a member  [s]ave  [q]uit
> add a security reviewer that only runs when auth or payments change
  added security-reviewer (gate, applies_when: auth or payments touched)
> accept

  saved ~/.my-mini-team/teams/ship-epic.team.yaml  (+ 3 new members)
  compiled -> /ship-epic is ready. run it:  mmt run ship-epic "ENG-142"
```

Under the hood the creation agent:
- **scans the repo to ground its proposal**: stack, test runner, CI, conventions, `CLAUDE.md`, and connected MCP servers, so members fit your project instead of being generic.
- **reuses before it invents**: pulls matching members from your library and the registry, drafts only what is missing.
- **wires and validates**: fills `consumes` / `produces`, runs the strict contract check, and only shows you a lineup that can actually deliver the team's promise.
- **is transparent**: renders the live schema and the tool / permission footprint as it goes, so nothing is hidden.

### Manual (`mmt new --manual`)

A step-by-step wizard for people who want to place every member by hand: name and describe the team, add members (reuse `@ns/name`, or define inline: kind, consumes, produces, tools, knowledge, prompt, applies_when), set the lead, choose a supervise default. The schema redraws and the contract check runs after each change.

### Forking and contributing
- `mmt fork @author/team` copies someone else's team into your namespace to customize.
- `mmt publish <team>` turns a local team into a shareable `@you/team`; the agent helps write the description and reviews the manifest before publishing.

## Editing a team: change any setting, good CLI UX

**Everything is done through the CLI. You never have to open or hand-edit a YAML file.** The `.team.yaml` and `.member.yaml` files are an artifact the CLI writes and manages, not something you author by hand. Hand-editing is available for power users who want it, but it is optional, never required. The three ways below all go through the CLI.

Changing a team must be as easy as creating one. Every parameter is editable, three ways, so you pick your speed:

1. **Conversational** — `mmt edit team <team>` reopens the agent builder ("make qa a gate", "switch coder to cursor", "add a doc-writer"). Best for changes you can describe.
2. **Guided forms** — `mmt edit team <team> --form` opens a structured field editor: pick the team or a member, then edit fields with the right control for each (select for kind / engine / model, multi-select for tools / knowledge, tag input for consumes / produces, multi-line for prompt). The schema redraws and the strict contract check re-runs after every change.
3. **Direct set** (scriptable, agent-friendly) — change one parameter with no wizard:

```
mmt set ship-epic supervise plan
mmt set ship-epic.reviewer engine cursor
mmt set ship-epic.qa applies_when "user-facing change"
mmt get ship-epic reviewer            # inspect current values
```

Everything is editable:
- **team**: name, description, input, output, supervise, lead (model, prompt), roster (add / remove / reorder members)
- **member**: kind, consumes, produces, tools, knowledge, engine, model, applies_when, prompt

UX rules the editor follows (see the CLI-UX stack below):
- **Flags for everything**: any prompt can be skipped by passing the value, so the builder is scriptable and agent-drivable, never a dead end.
- **Validation inline**: a bad kind, an unknown tool, or a contract break is caught at the field, not after you finish.
- **Safe cancel and undo**: ctrl-c never leaves a half-written team; edits are staged and saved only on confirm; `mmt edit --revert` restores the last saved version.
- **Live feedback**: the schema and the contract check update on every change, so you always see the shape and whether it still holds.
- **Fast reorder and toggle**: move a member in the roster, flip a gate, or change supervise without retyping.

## Reading a team schema (capabilities, not just names)

The schema is not name-only. Every node shows what that member actually does, so you can audit a team before you run or install it. Each member node carries:
- its **kind** (worker / gate / loop / interactive / challenger / researcher)
- its **integrations and tools**: the concrete things it touches, for example `notion`, `jira`, `web`, `bash(git)`, `edit`, an MCP server. This is where you see "context-gatherer talks to Notion and Jira" or "researcher searches the web", not just a label.
- its **engine** if not Claude (e.g. `cursor`)
- its **applies_when** condition (so you know when it is skipped)

Edges are labeled with the **artifact** that flows (`consumes -> produces`), so the dataflow is explicit, not implied by ordering.

Example node text:

```
context-gatherer · researcher
notion · jira · web
epic -> context
```

Two views:
- `mmt show team <team>` prints the schema plus a capability table:

```
member            kind        engine   integrations          in -> out
context-gatherer  researcher  claude   notion, jira, web     epic -> context
tech-strategist   worker      claude   read                  context -> strategy
coder             worker      claude   edit, bash(git)       strategy -> changes
reviewer          gate        claude   read, grep            changes -> reviewed
qa                loop        claude   bash(vitest)          reviewed -> verified
pr-opener         worker      claude   bash(git), github     verified -> shipped
```

- The picker preview (right-arrow) shows the same, so you judge a team by what it does, not by its name.

The tool / permission manifest shown at install is generated from exactly this, so "what can this team touch" is answerable before you trust it.

## File formats

**Member** `members/<namespace>/<name>.member.yaml`

```yaml
member: reviewer
namespace: mamadoudicko
kind: gate
applies_when: any code changed
consumes: [changes]
produces: [reviewed]
knowledge: [team-conventions, security-checklist]
tools: [read, grep, bash]
engine: claude          # claude (default) | cursor | codex
model: sonnet
isolation: fresh        # fresh (default) | worktree
prompt: >
  Adversarially review the changes for correctness and simplicity.
  Return PASS or the specific blocking issues.
```

**Team** `teams/<name>.team.yaml`

```yaml
team: ship-epic
namespace: mamadoudicko
description: From an epic to a shipped, reviewed PR
input: [epic]
output: [shipped]
supervise: auto
lead:
  model: opus
  prompt: >
    You are the topic owner. Read the epic and any gathered context, then choose
    the lineup: which members to run, in what order, and why. Skip members whose
    applies_when does not hold. Keep it minimal.
roster:
  - mamadoudicko/context-gatherer   # researcher, pulls Notion/Jira context
  - mamadoudicko/tech-strategist
  - mamadoudicko/coder
  - mamadoudicko/reviewer           # gate
  - mamadoudicko/qa                 # loop, applies_when user-facing change
  - mamadoudicko/pr-opener
```

A roster entry is either a `@namespace/name` reference or an inline member object for one-offs.

## Runtime and execution

A team compiles to native Claude Code artifacts, so "running a team" is "invoking a skill and its orchestration under the hood".

1. `mmt "INPUT"` resolves the chosen team and its roster from the global library.
2. Launches the compiled **lead workflow** with `INPUT` as args.
3. The **lead** returns an ordered lineup with reasons.
4. `mmt` runs the **contract check** on that lineup; if it cannot satisfy the output promise, it asks the lead to revise or raises a hand.
5. Members execute in order, each fed the prior members' `produces`. `gate` members can stop the run, `loop` members repeat until their condition, `interactive` / `challenger` members raise a hand.
6. You get the artifact (PR, PRD, report) plus a short account of what ran and why.

## Context sharing (how a member gets enough to do its job)

Honest framing: subagents (and other engines) do **not** share a live context window. You cannot hand the orchestrator's memory to a member. This is where naive multi-agent systems fail: they pass nothing (the member is clueless) or dump the whole transcript (they blow the window and dilute focus). `my-mini-team` makes context sharing explicit and deliberate, on six mechanisms:

1. **A shared file workspace, not string-passing.** Each run has a working directory (the repo, plus a `.mmt/run/<id>/` scratch). Members produce **artifacts as files** (`strategy.md`, `changes.diff`, `review.md`). Downstream members read the files they need. Context passes by reference, not by cramming text into a prompt.
2. **Contracts scope what to pass.** A member's `consumes` already declares exactly which artifacts it needs. The runner assembles context from those, not from the whole history: `consumes: [strategy]` means the member gets `strategy.md`, not the epic plus the Notion dump plus every prior message.
3. **The lead writes a per-member brief.** The lead does not forward the raw transcript. Like a good manager writing a ticket, it distills a short, task-scoped brief for each member: the goal, the decisions that matter, pointers to the artifacts to read, constraints, and the definition of done. This is the "clever context" that makes a member effective. Distilled, not dumped.
4. **Repo is first-class context.** Members run against the real working tree, so they read code, conventions, and `CLAUDE.md` directly with their tools, pulling detail on demand instead of needing it pre-loaded.
5. **Shared decision log (team memory).** The lead maintains a running `decisions.md` (chosen approach, key tradeoffs). Cross-cutting context that many members need lives there once, instead of being re-passed to each.
6. **The member can say "not enough".** If it cannot proceed, a member raises a hand with `reason: insufficient-context`, naming exactly what it needs. The lead fills the gap (adds an artifact, expands the brief, or runs a context-gatherer) and retries. Briefing quality becomes observable and correctable, not a silent failure.

Net: a member gets its consumed artifacts (full), a distilled brief (task-scoped), the repo (on demand), and the decision log (shared). Enough to do the job, without drowning it or blowing the window.

## Isolation: a fresh, standalone subagent per subtask

Every member runs as a **brand-new subagent with a clean context window**. It sees only its brief, its consumed artifacts, and the repo. It does not inherit the lead's chain of thought or any sibling member's internal reasoning. This is deliberate:

- **No cross-contamination or bias**: a reviewer that never saw the coder's justifications reviews the actual diff, not the coder's rationalization. A fresh reviewer is a better reviewer.
- **Focused context**: the member's window holds only what its task needs, so nothing is diluted by unrelated history.
- **Only explicit artifacts cross the boundary**: internal reasoning stays local; the things that flow between members are the declared artifacts and the shared decision log, nothing implicit.

Isolation levels (per member):
- `fresh` (default): clean context, shared working tree.
- `worktree`: clean context plus its own git worktree, so members editing files in parallel do not collide and a member's changes stay contained until merged. Used automatically when the lead runs members in parallel.

On support: fresh-context subagents are the default execution model on Claude, and the worktree level is used where the runtime supports it. Non-Claude engines get fresh-process isolation via their own CLI invocation (a new process per subtask), which gives the same no-shared-memory property, with engine-specific limits on richer features.

## Engines: Claude-first, pluggable (Cursor, Codex, ...)

Members are not Claude-only. Each member declares an engine; Claude is the default, others are opt-in per member (or per step) for when a specific tool is better, cheaper, or already trusted for that step.

```yaml
member: coder
engine: claude        # claude (default) | cursor | codex | ...
model: sonnet
```

- **claude** (default): runs as a Claude Code subagent / Agent SDK call.
- **cursor**: runs via the Cursor CLI (`cursor-agent`).
- **codex**: runs via the OpenAI Codex CLI.
- more adapters over time (aider, etc.).

An **engine adapter** is a thin interface: given (brief, consumed artifact files, allowed tools, repo path), it invokes that engine in the run's working directory and captures the artifacts it produced. Because context is already file-based (artifacts + brief + repo), it crosses engines cleanly: you cannot share a Claude context window with Codex, but you can hand any engine the same files and the same brief. **The workspace design from the previous section is exactly what makes multi-engine possible.**

Notes:
- `mmt doctor` reports which engine CLIs are installed and authenticated.
- Interactivity (raise-hand) is richest on Claude; non-Claude adapters support artifact hand-off and a basic pause, with engine-specific limits surfaced at install time.
- The tool / permission manifest shown at install lists the engines a team uses, so you know up front if a team expects `cursor` or `codex` to be present.

## Sharing, install, general availability

Teams and members are globally available, not per-project.

- **Global library**: `~/.my-mini-team/` holds installed teams and members.
- **Global skills**: compiling installs the skill into `~/.claude/skills/<team>/` so `/team` and `mmt run <team>` work from any directory / project.
- **Install**: `mmt install @author/name` fetches the team + its member dependencies and compiles locally, so it adapts to your tools, models, Notion, repo.
- **Naming**: `@author/name` for both teams and members. Members are the primitive; a team is a curated bundle that reuses members.
- **Registry (v1)**: a git repo of `*.team.yaml` and `*.member.yaml`. Every team carries its auto-generated schema, so browsing the registry means reading real architectures.

## Compilation targets

```
~/.claude/skills/<team>/SKILL.md        the /<team> entrypoint
~/.claude/agents/<team>-<member>.md     one subagent per rostered member
~/.claude/workflows/<team>.js           lead + orchestration (raise-hand, gates, loops)
~/.my-mini-team/teams/<team>.team.yaml  source of truth
~/.my-mini-team/schemas/<team>.md       mermaid architecture
```

Runtime is chosen automatically: a roster with gates / loops / a real lead compiles to a Workflow; a trivial linear roster can compile to a plain skill.

## Module layout

```
my-mini-team/
  bin/mmt              CLI: picker, run, new, install, check, show, publish
  lib/yaml.js          zero-dep YAML subset parser
  lib/registry.js      resolve member + team refs (local + global library)
  lib/contract.js      strict validator: wire a lineup, check the output promise
  lib/lead.js          compile the lead workflow (roster + applies_when + raise-hand)
  lib/compile.js       roster -> skill + agents + workflow + schema
  lib/diagram.js       roster -> mermaid / ascii schema
  lib/picker.js        interactive TUI: task-first list + schema preview
  members/<ns>/*.member.yaml
  teams/*.team.yaml
```

## Tech strategy: the CLI UX stack

The builder, editor, and live view are the daily surface, so they get real UX investment. Based on current best practice (2026):

- **Prompts and forms** use **@clack/prompts**: minimal, styled, TypeScript-native, with grouped prompts, built-in cancellation, inline validation, and spinners. It handles the create / edit wizards cleanly and works across macOS Terminal, iTerm2, Windows Terminal, and Linux out of the box. (Enquirer is the fallback if we need exotic prompt types.)
- **The live run view and the animated schema** use **Ink** (React for the terminal), which is built for stateful, live-updating dashboards: per-member status, spinners, and the schema redrawing as the run progresses. This is where the earlier "zero deps" stance deliberately relaxes: a great live view is worth two well-chosen dependencies, while the compile / contract core stays dependency-light.
- **Command design follows the Command Line Interface Guidelines (clig.dev)** and common CLI-UX patterns: never require a prompt (always allow a flag), human-first output with a `--json` escape hatch for agents, guardrails through constrained choices, and clear validation so users never do a lot of work only to fail at the end.

Sources: [Command Line Interface Guidelines (clig.dev)](https://clig.dev/) · [Ink vs @clack/prompts vs Enquirer 2026 (PkgPulse)](https://www.pkgpulse.com/guides/ink-vs-clack-vs-enquirer-interactive-cli-nodejs-2026) · [UX patterns for CLI tools (Lucas F. Costa)](https://www.lucasfcosta.com/blog/ux-patterns-cli-tools) · [Elevate your CLI tools with @clack/prompts (Siamak Motlagh)](https://www.blacksrc.com/blog/elevate-your-cli-tools-with-clack-prompts)

## MVP scope

**In:** `mmt "INPUT"` picker + schema preview, direct run, `new` builder, typed members + roster teams, strict `check`, compile to skill + lead workflow, global install, two real teams (`ship-epic`, `create-prd`).

**Later:** remote registry install, `mmt publish`, Excalidraw export of schemas, visual drag-drop builder, lead auto-suggesting the best team for an INPUT, parallel / fan-out members.

## Installing my-mini-team (the CLI)

Prereqs: Node 18+, and the Claude Code CLI (`claude`), since teams run as Claude Code skills / workflows under the hood.

```
# recommended
npm install -g my-mini-team        # provides the `mmt` command

# or run without installing
npx my-mini-team "add SMS reminders"

# or bootstrap script
curl -fsSL https://mmt.sh/install | sh
```

First run triggers `mmt init`, which:
- creates the global library `~/.my-mini-team/` (teams, members, runs, schemas)
- verifies `claude` is installed and on PATH, warns if not
- registers the global skills path so compiled teams are visible from any project

`mmt doctor` re-checks the environment any time. Uninstall with `npm uninstall -g my-mini-team` (the library stays unless you run `mmt purge`).

## Installing a team (existing / shared)

```
mmt search prd                        # discover teams and members in the registry
mmt install @mamadoudicko/create-prd  # install a team plus its member deps
mmt install github:owner/repo         # install from any git repo
mmt install ./create-prd.team.yaml    # install from a local file
```

What install does:
1. Resolves the team and every member it references (its own and others' `@ns/name`).
2. Shows a **manifest** before writing anything: the roster, and the **tool / permission footprint** (which members use bash, edit, network, or MCP servers like Notion). You approve once. This is the trust boundary for shared teams: you see what a team can touch before it lands.
3. Compiles locally in your context into `~/.claude/skills/<team>/` (plus agents, workflow, schema). Because it compiles on your machine, it binds to your models, tools, and connected MCP servers.
4. The team is now usable from any project: `mmt run <team>` or `/team` inside Claude Code.

Manage with `mmt update`, `mmt uninstall`, `mmt ls`. Versioning: pin `@ns/name@1.2` or track latest (open question #3).

## Human input: how a team stops for you (the raise-hand protocol)

By default a run is automatic. It stops for you only in four cases:
- **ambiguity**: a member cannot proceed confidently (the spec is unclear).
- **risky or irreversible action**: about to push, deploy, delete, or send something external.
- **author checkpoint**: the team's author marked a required human step (create-prd pausing to ask you the positioning questions).
- **contract failure**: the lead cannot assemble a lineup that satisfies the team's promise.

Mechanism: a member returns its output plus an optional **pause signal**:

```yaml
pause:
  reason: ambiguity
  ask: choice            # text | choice | approve | confirm
  prompt: "Which channel should reminders use?"
  options: [SMS, email, both]
```

The runner suspends the run, renders the prompt in the terminal (or as an `AskUserQuestion` inside Claude Code), waits for your answer, feeds it back as context, and resumes exactly where it paused. `approve` / `confirm` are how gates and `--supervise plan|step` collect your yes / no.

If you step away, the run **parks** (state is persisted) instead of hanging. You resume later with `mmt resume <run-id>`. Authors can attach a safe default to a checkpoint that auto-applies after a timeout, so unattended runs still finish when it is safe to.

## Following a run: the live view (even in the CLI)

A run is watchable, not a black box. `mmt "INPUT"` opens a live view:

```
  ship-epic · "add SMS reminders to booking confirmations"        02:14

  [x] context-gatherer   pulled epic + Notion spec            0:22
  [x] tech-strategist    strategy.md (3 tasks)                0:41
  [>] coder              implementing task 2/3                0:51
  [!] reviewer           waiting: needs your input             --
  [ ] qa                 skipped (no user-facing change)
  [ ] pr-opener          queued

  lead: ran 4 of 6 · skipped qa (applies_when not met)
  press v to expand a member · s to change supervise mode · q to detach
```

It is the same schema you previewed in the picker, now with live state overlaid: done, running, looping, gate-blocked, waiting-for-you, skipped-with-reason. Expand a member (`v`) to see its live activity (tool calls, current step). When a member raises a hand, the view yields to the prompt, then returns.

- **Detach and reattach**: `q` detaches, the run keeps going, `mmt attach <run-id>` reattaches.
- **History**: `mmt runs` lists active and past runs, `mmt logs <run-id>` shows the full transcript, and each run ends with a **receipt** (what ran, what was skipped and why, artifacts produced, the PR link).
- **Plain / CI mode**: `--plain` streams line logs instead of the live view for non-interactive environments.

## Open questions

1. Registry hosting for v1: one community git repo, or per-author repos?
2. Context for the lead: just the INPUT, or does a `context-gatherer` always run first?
3. Member versioning: pin `@author/reviewer@1.2`, or always latest on install?
