# 17 September 2026 — Initial baseline and editor evolution

## Record scope

This is a retrospective baseline assembled from the current source, original plan and development conversation. Work began with the 16 September MVP and evolved through 17 September. Individual feature timestamps were not recorded; the sections below describe development order, not exact delivery times. This is the repository's initial source-control baseline.

## Purpose and initial implementation

The original requirement was a simple foundation/grid planner for buildings used in a Cornish mining game. Direct 3D extrusion was brought into the MVP so one parametric document could generate reliable views for artwork prompts. The initial implementation introduced React/TypeScript, Three.js, a configurable 3 m module, rectangular parts, floor/eaves heights, simple roofs, browser recovery, JSON exchange and reference packs.

## Geometry and interaction expansion

- Renamed the tool Asset Designer and replaced the early UI with dark glass panels and teal controls.
- Added floating panels, face-centre handles, edge/corner footprint editing, fine snapping and alignment to adjacent parts.
- Allowed shorter extensions, fractional floor estimates and explicit physical heights.
- Added floor guides, axis-constrained editing, independent wall-corner heights and editable ridge endpoints.
- Added circular parts, rooftop placement, cylinder taper and part rotation.
- Separated Move from geometry selection; introduced Vertices/Edges/Faces modes, selectable ridge edges and uniform scaling.
- Enabled outward ridge extension for overlapping roofs while retaining separate volumes.

Principal modules: `model.ts`, `geometry.ts`, `editing.ts`, `stage.ts`, `main.tsx`, shared styles/icons.

## Scene composition and reference consistency

- Promoted documents from one building assembly to scenes with parts, derived connected structures and named groups.
- Added hierarchy selection, rename, collapse, drag/drop membership and collection move/scale.
- Allowed detached components and purposeful overlaps in exports.
- Introduced nine camera presets and a matching multi-view reference pack.
- Added optional scene/collection terrain with footprint merging and independent viewport visibility.
- Restricted main aspects to eight compass directions, owned by the highest container, with one effective green arrow.
- Refined toolbar sizing, component counters, settings overlays and floor estimates.

Principal modules: `SceneTree.tsx`, `views.ts`, `terrain.ts`, model/stage/UI.

## Local library

Added a SQLite service through Vite, persistent projects/scenes, searchable Library, save status, first-save dialog, portable JSON backups/import and save/discard/cancel prompts before scene changes. Revision checks prevent overwriting a scene saved by another editor tab. Temporary/in-memory test libraries isolate tests from user work.

A reported project-saving problem was traced to an existing saved project with an unfiled scene. The library now displays empty projects and scene counts, confirms creation, and explains how to assign the current scene. Header Settings now has a cog title and project selector; Save settings persists assignment and scene edits along with grid changes.

Principal modules: `server/library.ts`, `vite.config.ts`, `library.ts`, `SceneLibrary.tsx`, `main.tsx`.

## Documentation and source-control preparation

Added the `/docs` architecture, data/persistence, feature-status and development guides, this devlog and an index. Added repository instructions requiring updates alongside meaningful changes. Updated stale README wording and marked the original plan historical. Local databases, dependencies and generated builds are excluded from the initial commit.

## Validation

Before this documentation pass, all 28 automated tests and the production build passed. The Settings heading/project fields and Library project-list controls were checked in the isolated browser test mode. SQLite tests verify persistence after reopening, scene updates, invalid saves and revision conflicts. This does not constitute exhaustive browser or export-image testing.

Final pre-commit checks on 17 September 2026: `npm test` passed all 28 tests; `npm run build` passed TypeScript checking and production bundling. The existing large-bundle warning remains. Documentation links were checked locally and the commit excludes the local database and generated files.

## Remaining limits

See the [feature register](../feature-status.md). The main constraints are separate overlapping meshes, restricted convex footprints, simple roof geometry, no openings or production mesh export, and a local-only library. A Vite bundle-size warning remains; no performance target has yet been measured. The original plan's aspirational items are not completion claims.
