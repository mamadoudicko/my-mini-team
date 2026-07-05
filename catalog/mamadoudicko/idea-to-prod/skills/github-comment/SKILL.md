---
name: github-comment
description: Post review comments on a GitHub PR (one per issue, with file/line context), and verify the PR title/description actually match the diff.
---

# github-comment

Post review comments directly on the GitHub PR, one per issue, with file and line context.

## Always check: does the PR description match the diff?

Before approving, verify the PR **title and description accurately describe the actual changes**. This is a required review step, not optional.

- Read the PR description/title, then compare against `gh pr diff <n>` and the changed-file list (`gh pr diff <n> --name-only`).
- **Flag any mismatch as a blocker**, for example:
  - the description names an approach/library/format that is **not** in the diff (e.g. it says "Mermaid" but the diff adds an image),
  - it claims a change the diff does not make, or
  - it omits a significant change the diff does make.
- A PR whose description misrepresents its contents is **not ready to merge** — request that the description be corrected (or correct it) so reviewers, the merge commit, and the history stay trustworthy.

Then post your review comments (the per-issue ones + any coherence issue) on the PR.
