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

### Hollow circular parts

Optional `innerDiameter` (metres) turns a circular part into a hollow cylinder. It must be positive, at least 0.1 m below the outer diameter, and use a flat roof. Optional `topInnerDiameter` defaults to `innerDiameter`; `topDiameter` defaults to `width`. Each end must maintain at least 0.1 m diameter difference. Both inner and outer walls taper linearly. All four diameters scale together. The field survives JSON/SQLite storage, is included in the architectural brief and scales in part, collection and module rescaling. Existing circular parts without this field remain solid.

Optional per-part `roofEnabled` defaults to true for legacy documents. False removes only the roof mesh/controls and roof height contribution; roof parameters remain available for re-enabling. The body stays capped. This state is included in JSON/SQLite and architectural briefs.

Optional `subdivisions: {enabled, x, y, z}` stores body-preview segment counts (integers 1–64; circular x minimum 3). Circular axes mean around/height/radial. Counts do not change with physical scaling. Settings persist in JSON/SQLite; guide lines are not exported in reference images. No editable mesh is stored yet.

Optional `bodyMaterial` and `roofMaterial` on parts, and `terrainMaterial` on plans, contain `{name: string, description: string}`. Legacy `materials` remains readable and serves as the body fallback until explicitly overridden; no automatic semantic split is attempted. Values are validated and stored with the plan. Manifest `materialAssignments` uses stable part IDs with body/roof roles; roof-disabled or terrain-excluded assignments are null. Descriptive metadata requires no UV coordinates. Individual face overrides are deferred.


### Openings and wall construction

Optional part fields: `hollowWalls` boolean, `wallThickness` in metres (default 0.4), and `openings[]`. Each opening has a stable `id`, `name`, `kind` (`door`, `window`, `arched-door`, `arched-window`, `circle-window`), `face` index 0–3, `x`, `y`, `width` and `height` in metres. Face i spans footprint corner i to (i+1)%4; x runs from its start, y is local component height. IDs are unique within a part. Duplication generates fresh child IDs. Openings are nested metadata, not independent top-level parts or grouping members.

Circular-window width/height must match. Openings must fit below both wall-top bounds, clear side edges by 0.05 m, and have 0.05 m bounding-box clearance from other openings on the same face. Door-base notches allow contact with a level wall base. Hollow thickness must retain a valid offset interior polygon; curved walls are unsupported. At most 100 openings per part are accepted.

Legacy documents omit these fields and stay solid. Hollow walls and solid recesses regenerate from editable contours. Normal dimension edits preserve opening metre dimensions; uniform scale operations scale dimensions, offsets and thickness. Invalid reductions are refused instead of deleting or silently moving openings. Reference manifests contain an explicit per-part openings/wall-construction section; plan JSON remains authoritative.

Opening.infill is optional (absence means Empty). It stores type, inset,
thickness, frameWidth, doubleDoor, bars mode, horizontal/vertical bar counts,
and doorMaterial/frameMaterial/glassMaterial descriptions. Existing plan JSON,
brief opening data and reference manifest opening data include these settings.
Infill geometry is derived rather than separately placed: child selection opens
the parent opening's settings. Scaling also scales its physical dimensions.

Infill.gapWidth is optional, defaults to 0.01 m and scales with the component.
Geometry caps the effective gap at 80% of opening width so narrow targets retain
door leaves. Bulk infill application copies settings independently without changing
target shape, position or dimensions. Similar-size matching checks both width and
height against the source within 20%; matching category follows opening kind.

Part.architecturalDetails and optional Opening.architecturalDetails contain the
feature flags, shared finish dimensions, widths/heights, seed and three material
descriptions. Opening.detailsMode is inherit/off/custom; absent means inherit.
Opening.thresholdLift records the last applied door lift. reconcileThresholds
adjusts y by new minus old lift on commit, so toggles are reversible and positions
remain standard wall coordinates. Physical sizes and thresholdLift scale with
components. Existing plans with no settings generate no details.
The plan, reference manifest and prompt brief include architectural detail settings.

ArchitecturalDetails.cillWidthAdjustment is an optional signed total-width delta
in metres; cills stay centred. Absent values use 2 × overhang for compatibility.
cillProjection optionally overrides shared projection. Both scale with the part.

ArchitecturalDetails optionally stores arches (default true), keystones (default
false), archWidth (fallback jambWidth) and keystoneExtra (fallback 0.08 m).
Explicit dimensions scale with the component. Existing enabled detail settings
therefore gain arch surrounds unless disabled.

Part.stoneClusters stores an optional enabled config and ordered cluster records
with stable IDs. Counts limited to 30 clusters × 60 requested stones. Per-cluster
seed, spread and optional size override persist. Part.stoneBands stores top/bottom
toggles and common cap-course settings. Both are absent on legacy plans.
Physical dimensions scale with the part; seeds/counts remain unchanged.
Plan JSON, reference manifest and brief include these settings.

StoneCluster.face optionally fixes wall index 0–3. Absence retains automatic
selection. Cylinder/donut clusters continue to use the outer curved wall.

StoneCluster.layout specifies a fixed row pattern or auto (the default when absent).
Auto uses the component seed, cluster ID and cluster seed to choose a weighted mix:
50% 1–2, 25% 2–3, 15% 2–3–2 and 10% 3–2–3. Legacy count remains readable
but no longer determines the pattern. Explicit fixed layouts are preserved.
Legacy spread remains readable but no longer drives scattering. StoneClusters.
clusterSpacing defaults to 0.6 m and scales with the component. Existing cluster
positions are regenerated by the new whole-patch algorithm.

StoneCluster.position optionally stores {face,u,y} as a manual anchor. Flat-wall u
is distance along its wall frame; circular u is arc distance at mid-radius. Both
u and y scale with the part. Absence retains automatic placement.

Part.roofDetails optionally stores thickness, sides/start/end overhangs, fascia
toggle/height/depth and ridgeCap toggle/capWidth/capHeight (metres). Absence keeps
legacy roof geometry. Dimensions scale with the part and are included in exports.

RoofDetails also accepts optional fasciaInset (metres), gableSeparate (boolean),
gableStart/gableEnd (hidden/wall/material), and gableStartMaterial/gableEndMaterial
(strings). Missing modes default to wall; missing separate flag shares start settings.
Only dimensional fields scale, preserving modes and material descriptions.

Optional sideFascia/endFascia objects hold height/depth/inset/drop in metres,
falling back to legacy fascia settings. Optional ridgeBeam enables a structural
beam; beamWidth/beamHeight default to 0.2/0.25 m, beamDrop to 0.15 m, and
beamStart/beamEnd extensions to zero. All dimensional fields scale.

sideFascia.lengthOffset is optional, signed metres per end (default zero). Positive
extends both ends, negative shortens. It scales with the component.

### Saved UV preparation
Optional `Plan.preparedUVs` stores records by part ID with positive `metresPerTile`
and `sourceKey` (the scene-parts geometry signature). These records roundtrip with
SQLite, recovery and JSON. Cleaner Save preparation saves the whole scene, including
current edits, through the normal optimistic-version persistence path. Export applies
only matching records; stale settings remain stored but are skipped and warned about.
The recipe regenerates UV buffers deterministically; no preview checker is persisted.

Optional `foundation` and `structureFoundations` store enabled/depth/margin/material
settings. Overrides use the existing connected structure IDs. Defaults are disabled;
changes in connectivity can change the structure ID, as with existing aspect overrides.
