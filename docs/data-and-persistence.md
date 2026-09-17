# Data and persistence

## Scene document

`src/model.ts` is the authoritative schema and validator. The current format is `schemaVersion: 1`, `units: "metres"`. Additive optional fields preserve older plans.

| Area | Fields |
| --- | --- |
| Identity | `id`, `name`, `schemaVersion`, `units` |
| Grid/orientation | `moduleSize`, `subdivision`, `front` |
| Art intent | `terrain`, `notes` |
| Components | `parts` with stable IDs, names, roles, positions, sizes, rotation, floor values, roof controls and materials |
| Optional geometry | `wallHeight`, `footprint`, `shape`, `topDiameter`, `baseY`, `cornerHeights`, `cornerBases`, `ridgeEnds` |
| Organisation | `groups`, per-part `groupId`, `structureNames`, `structureAspects` |
| Generated terrain | `terrainLayout`, `terrainMargin` |

Footprint X/Z coordinates are normalized to part width/depth. Corner elevations are local metre values. Ridge endpoint triples mix normalized local X/Z with a metre offset above nominal eaves. Preserve these distinctions when scaling. Legacy `main`/`extension` roles remain metadata; multiple main parts and detached parts do not block scene export.

Project membership is database metadata, not a field inside portable plan JSON. Importing JSON gives the scene a new identity to avoid overwriting an existing saved scene. Validation must succeed before replacing the current document.

## SQLite library

Location: `data/scenes.sqlite`, resolved from the server working directory. The launcher changes into the repository directory first. `data/` is ignored by Git.

- `projects`: `id` primary key, `name`.
- `scenes`: `id` primary key, `name`, nullable `project_id` foreign key, `plan` JSON, integer `version`, `updated_at` ISO timestamp.
- Foreign keys enabled, 3-second busy timeout, database `user_version=1`.
- Saves validate the document and project, use a transaction and check the supplied revision against the stored revision. Conflicts fail without overwriting the newer scene.
- Creating a project persists it immediately but does not automatically move the open scene. Settings → Project → Save settings assigns and saves that scene.
- Empty projects remain visible with a zero scene count. Project rename/delete is not currently implemented.

## API

Normal prefix: `/api/library`. Test prefix: `/api/test-library`.

| Method/path | Request | Result |
| --- | --- | --- |
| GET `/projects` | — | Projects sorted by name |
| POST `/projects` | `{name}` | Created project; trimmed nonempty name, up to 150 characters |
| GET `/scenes` | — | Scene summaries, newest update first |
| GET `/scenes/:id` | — | Plan and save metadata, or 404 |
| PUT `/scenes/:id` | `{plan, projectId, version}` | New revision and timestamp |

New scenes use revision 0. Subsequent saves use the last returned revision. Writes require JSON and have a 2 MB request limit. Responses disable caching. Middleware rejects a supplied Origin that differs from the local host. This is a local tool, not an authenticated multi-user service; keep its server on loopback.

## Recovery, saving and backups

Browser recovery holds recent working state separately from the database. The saved-status badge compares the working document to its last saved snapshot. Save settings also saves current scene edits. New/open/import prompts offer save, discard or cancel when work is unsaved.

Use Library → Download current JSON for portable scene backups. For the whole library, stop the server and copy `data/scenes.sqlite`; retain the data folder when moving the installation. Do not run concurrent installations against a Dropbox-synchronised database. Browser recovery is not a durable backup and Git does not contain the library.

`?test=1` uses a separate browser recovery key and an in-memory library. That library resets when the server restarts. Automated SQLite tests use temporary directories, never the user's library.
