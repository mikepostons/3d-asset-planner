# Asset Designer development

Read `docs/README.md` and the relevant architecture/data documentation before substantial changes. `docs/feature-status.md` describes delivered capabilities; `PLAN.md` is historical.

## Keep documentation current

For every meaningful feature or fix, update the relevant docs and add or extend a dated file in `docs/devlogs/` before committing. Record the user-facing change, affected modules, important decisions, tests actually run, and remaining limitations. Update the devlog index and feature register when appropriate. Do not invent test results or historical dates.

## Implementation and validation

Keep the parametric Plan authoritative, preserve metre/XZ-ground/Y-height conventions, validate persisted/imported documents, and maintain compatibility with existing schema-version-1 plans. Intentional overlapping blockout volumes are supported.

Run `npm test` and `npm run build` for code changes; manually verify affected browser interactions when relevant. Use `?test=1` and temporary databases for checks. Never edit or replace the user's real scene library as test data.

Do not commit `data/`, database files, `node_modules/`, `dist/`, credentials or unrelated artwork. This tool exports structural references, not finished game assets.
