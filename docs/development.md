# Development workflow

## Setup

Use Node >=22.13.0 and npm. From the repository root:

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/`. The macOS `Start Asset Designer.command` launcher installs missing dependencies and starts this server. `Start Asset Planner.command` is retained as a legacy launcher. Stop the server with Ctrl-C. The application needs the local API server for library operations; a static build alone is insufficient.

## Checks

```sh
npm test
npm run build
```

Build runs TypeScript checking and Vite bundling. Tests cover geometry invariants, shape validation, serialization, transforms, connection/group rules, handle selection, snapping, terrain, views and temporary SQLite persistence/conflicts. Use `http://127.0.0.1:5173/?test=1` for manual browser checks to isolate the user's scene/library.

For changes affecting interaction, manually check the relevant tool in 2D and 3D, cancel/undo/redo, save/reopen, and exported reference behaviour as applicable. Do not claim a manual check passed unless it was performed. Record failures and limitations. A large-bundle warning is currently expected; it is not a build failure.

## Maintenance rules

- Keep the typed document authoritative; avoid storing duplicate mesh-derived dimensions.
- Validate imported and saved plans. Add optional fields compatibly or design an explicit schema migration.
- Keep browser recovery and SQLite explicit saves separate.
- Never use the real user database or active scene as a test fixture.
- Preserve purposeful overlaps; do not introduce destructive mesh merging implicitly.
- Follow existing metre, axis, floor and main-aspect conventions.
- Commit source and documentation, not generated builds, dependencies, local databases, credentials or unrelated artwork.

## Documentation cadence

At the end of each meaningful feature or fix, and before its commit:

1. Add a dated entry under `docs/devlogs/`, or append a clearly titled entry to that day's log.
2. Describe the problem, delivered behaviour, affected modules, decisions, validation actually run, and remaining limits.
3. Update `docs/feature-status.md` when capabilities change.
4. Update architecture/data documentation for schema, API, storage or workflow changes.
5. Update the user README for changed controls/workflows and link new logs from the devlog index.

Do this during development rather than through a separate background schedule. Keep historical entries factual; mark retrospective records as such. Do not invent dates, test evidence or completed tasks. `AGENTS.md` makes this cadence part of future coding tasks.
