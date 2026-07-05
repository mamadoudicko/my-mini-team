---
name: publish-report
description: Post a concise, collapsible run audit (steps, per-member time, rounds, verdicts, total, link to full report) as a comment on the current PR via gh.
---

# publish-report

Publish a concise **audit** of a my-mini-team run as a single comment on the
current pull request, wrapped in a collapsible `<details>` block so it never
clutters the PR. This is an outward action and is strictly **opt-in** — it only
runs when a team includes a `reporter` member (or `report: github`).

You are given the run's tracked data (from the `/mmt` runtime): an ordered list
of steps with `{ step, member, model, elapsed, result-or-verdict }`, the loop
rounds used and whether the gate approved or hit `max_rounds`, the total elapsed
time, and the path to the full report (`~/.my-mini-team/runs/<team>-<ts>.md`).

## What to post

Build a compact markdown body:

1. A one-line header, e.g. `**mini-team run · <team> · <total elapsed>**`.
2. A compact table with one row per step:

   ```
   | step | member | model | elapsed | result / verdict |
   |------|--------|-------|---------|------------------|
   ```

3. A line for each loop: rounds used and the gate outcome — either
   `approved at round N` or `hit max_rounds (N)`.
4. Total elapsed time.
5. A reference to the full report path (`~/.my-mini-team/runs/<team>-<ts>.md`).

Wrap the **entire** body in a collapsible block:

```markdown
<details>
<summary>🤖 mini-team run audit · <team> · <total elapsed></summary>

...table + rounds + total + full-report reference...

</details>
```

## How to post

- Identify the current PR: `gh pr view --json number,url` (or the PR the run has
  been working on).
- Write the body to a temp file and post with
  `gh pr comment <number> --body-file <file>` (prefer `--body-file` — the body is
  multiline and contains markdown/HTML).
- **Degrade gracefully:** if there is no current PR (e.g. `gh pr view` finds
  none), do NOT fail the run. Skip posting and note in your output that there
  was no PR to comment on. Never block or error the run over a missing PR.

Keep it to a single comment. Do not paste the full report inline — link to it.
This skill is distinct from `github-post` (a generic status stub); `publish-report`
posts the structured, collapsible run audit specifically.
