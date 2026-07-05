---
name: spec-publish
description: Publish the finalized spec to the user's tracker of choice — GitHub Issues, Notion, Linear, Jira, etc. Detects or asks which tool the user uses and surfaces the choice; never silently GitHub-only.
---

# spec-publish

Publish the finalized spec (title, context, goal, scope, acceptance criteria,
pointers) to **whatever issue/spec tool the user actually uses** — this is not
hardcoded to GitHub.

## Supported destinations (extend as needed)
- **GitHub Issues** — `gh issue create`
- **Notion** — create a page in the user's specs/database (Notion API or MCP)
- **Linear** — create an issue (Linear API or MCP)
- **Jira** — create a ticket (Jira API or MCP)

## Make the tool visible — not "under the hood"
The whole point: the destination is **seen and chosen explicitly**, and the same
spec content lands wherever the user works.

1. **Detect** the likely tool from context — a GitHub remote on the repo, a
   connected Notion/Linear/Jira MCP or config, or a prior choice in this run.
2. **If the tool is ambiguous, ASK the user** which tracker to publish to —
   list the available options; do **not** silently default to GitHub. (In an
   mmt run, end with `NEEDS INPUT:` and the question so the runtime surfaces it,
   or run as an interactive member.)
3. **State plainly where you're publishing** before creating anything.
4. Create the item and **return its URL**.

Same spec, any tracker, and the user always sees which one.
