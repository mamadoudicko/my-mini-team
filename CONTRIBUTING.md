# Contributing

## Contribute a team to the catalog

The catalog (`catalog/<your-handle>/<team>/`) is a PR-driven collection of shareable
mini-teams. Anyone can install a catalogued team with `mmt import` — bundled skills
included. To add yours:

1. **Drop your team (and its skills) into `catalog/`.**

   ```bash
   mkdir -p catalog/<your-handle>/<team>/skills
   # emit the team yaml (its file name must match the team: field and the dir):
   mmt export <team> --raw > catalog/<your-handle>/<team>/<team>.team.yaml
   ```

   Then copy every `SKILL.md` your team references into
   `catalog/<your-handle>/<team>/skills/<skill>/SKILL.md` (one folder per skill).
   Only include the skills that team's members actually use.

2. **Regenerate the README.**

   ```bash
   npm run catalog
   ```

   This rewrites the `## Catalog` section of `README.md`, adding your team's
   one-line entry. Never hand-edit between the `<!-- mmt:catalog:start -->` and
   `<!-- mmt:catalog:end -->` markers — the generator owns that region. The
   one-liner comes from your team's `about` field, so write a good one.

3. **Open a PR** with your `catalog/` files and the regenerated `README.md`.

4. **Others install your team** by pulling and importing the yaml — which also
   picks up the team's bundled skills:

   ```bash
   git pull
   mmt import catalog/<your-handle>/<team>/<team>.team.yaml
   ```
