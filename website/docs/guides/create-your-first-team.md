---
sidebar_position: 1
title: Create your first team
---

# Create your first team

You don't fill in a form — you **describe the workflow in plain words** and an agent composes it. Then you refine by talking.

## 1. Describe it

```bash
mmt new
```

It opens your editor. Write how your team works, in one paragraph. Example:

```
a strategist plans the work, a coder implements it and opens a PR and updates
the ticket, a reviewer comments on github and loops with the coder until
approved, then qa runs the tests
```

Save and close. The agent composes the team and shows it:

```
spec-to-prod   take an agreed spec to prod — plan, build, review loop, qa, audit (no spec challenging; we already know what we want)

1. strategist
2. coder        ·github-pr ·ticket-status
   ┌ loop · until reviewer approves · max 3
   │ 3. reviewer   ·github-comment
   │ 4. coder      ·github-pr
   └
5. qa           ·run-tests
```

Everything you described — the members, the skills, the review loop — is inferred. You do not add a "lead"; it's implicit.

## 2. Refine by talking

At the prompt, describe any change (or press enter to save):

```
add a security reviewer after the reviewer, only comments on github
```

The team redraws. Keep going until it's right, then save.

You can also give the description inline:

```bash
mmt new "researcher gathers sources, writer drafts, editor loops with the writer until clean"
```

Use `--local` to save it to the current project's `./teams/` instead of your global library.

## 3. Look and run

```bash
mmt show my-team
mmt run my-team "a real task" --sim     # free preview
mmt run my-team "a real task"           # for real, on your subscription
```

## Edit an existing team

Same idea, by talking:

```bash
mmt edit spec-to-prod "run the coder on opus and the reviewer on sonnet"
mmt edit spec-to-prod "make qa a loop that retries until tests pass"
```

## Pick models per member

Add a `model:` to any member, or override a whole run:

```bash
mmt run spec-to-prod "…" --model sonnet
```

Precedence: `--model` (run) → member `model:` → team `model:` → your default. See [Running](/guides/running).

## Next

- Give members real capabilities → [Skills](/guides/skills)
- Repeat-until-good → [Loops & gates](/guides/loops-and-gates)
- Share it → [Sharing](/guides/sharing)
