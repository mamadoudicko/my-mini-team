# Contributing

## Contribute a team to the catalog

The catalog (`catalog/<your-handle>/<team>/`) is a PR-driven collection of shareable
mini-teams. Anyone can install a catalogued team with `mmt import` — bundled skills
included. To add yours:

1. **Drop your team (and its skills) into `catalog/`.**

   ```bash
   mmt export <team> catalog/<your-handle>/<team>
   ```

   This writes the whole bundle in one shot — `<team>.team.yaml`, `agents/*.md`, and
   `skills/<skill>/SKILL.md` for every skill the team references — straight into the
   catalog path. Pass `--force` if you're re-exporting over an existing dir.

2. **Regenerate the README.**

   ```bash
   npm run catalog
   ```

   This rewrites the `## Catalog` section of `README.md`, adding your team's
   one-line entry. Never hand-edit between the `<!-- mmt:catalog:start -->` and
   `<!-- mmt:catalog:end -->` markers — the generator owns that region. The
   one-liner comes from your team's `about` field, so write a good one.

3. **Open a PR** with your `catalog/` files and the regenerated `README.md`.

4. **Others install your team** by pulling and importing the bundle directory —
   which also picks up the team's bundled agents and skills:

   ```bash
   git pull
   mmt import catalog/<your-handle>/<team>
   ```

   Directory import installs the whole bundle (`team.yaml` + `agents/` + `skills/`);
   the file form (`…/<team>.team.yaml`) only carries the yaml and its sibling skills.
