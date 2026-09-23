# Architecture

## Product and stack

A single-user local browser editor built with TypeScript, React 19, Three.js and Vite. JSZip packages reference exports. Node's built-in SQLite module provides persistent projects and scenes. Node 22.13 or newer is required. Dependencies are installed locally; there is no required hosted service or image-generation API.

The browser connects to a loopback Vite server. The same server serves the local library API through a custom plugin. A static deployment of `dist/` alone cannot provide persistent library operations.

## Source map

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | React application, active document, undo/redo, selection, dialogs, saving and reference-pack orchestration |
| `src/model.ts` | Typed scene/part contract, validation, defaults, coordinate helpers, structures/groups, transforms and generated architectural brief |
| `src/geometry.ts` | Mesh construction from parametric parts and edited roof/corner geometry |
| `src/editing.ts` | Editing-handle selection rules and snapping helpers |
| `src/stage.ts` | Three.js viewport, cameras, pointer interaction, handles, guides, terrain and image rendering |
| `src/views.ts` | Named orthographic and isometric view definitions |
| `src/terrain.ts` | Terrain footprint generation and merging |
| `src/SceneTree.tsx` | Expandable component hierarchy, naming, selection and drag/drop grouping |
| `src/SceneLibrary.tsx` | Searchable local scenes, project creation and project counts |
| `src/library.ts` | Typed browser API client and test-library routing |
| `src/ToolIcon.tsx`, `src/style.css` | Shared icons and dark/teal interface styling |
| `server/library.ts` | SQLite schema, validated persistence and optimistic save revisions |
| `vite.config.ts` | Local API middleware for development and preview servers |
| `src/*.test.ts` | Domain, geometry, editing, terrain and persistence regression tests |

## Data flow

1. The active `Plan` is the authoritative editable document, not a serialized Three.js scene.
2. UI actions and pointer edits change parametric values; committed edits participate in undo/redo.
3. Meshes, guides, hierarchy and text references derive from the document.
4. Browser recovery preserves working state separately from explicit SQLite saves.
5. Export builds a plan, brief, manifest and nine images from the same scene geometry.

Selection, hover state, camera and dialogs are editor state. They do not represent architectural facts. Camera movement must never change geometry. Modal overlays disable background editing; failed saves leave work available.

## Geometry conventions

- Units are metres; X/Z is the ground plane and Y is height.
- Default major grid module is 3 m; default snapping is one sixth (0.5 m).
- Module size is distinct from per-part floor height. Grid-only changes preserve existing dimensions; explicit rescaling changes physical part dimensions and placement.
- Parts support convex quadrilateral footprints and 32-segment circles. Walls are vertical; arbitrary concave mesh editing is excluded.
- Flat, gable and lean-to roofs derive from each part. Ridge endpoints can move inward, outward, sideways and vertically.
- Cylinders have independent end diameters and base elevation; they are solid blockout volumes.
- Floor counts are estimates from wall height and per-part floor height, excluding roof rise.
- Intentional intersections are allowed. Overlapping parts remain separate meshes; no boolean union occurs.

## Scene organisation

Connected parts are detected as structures using footprint contact and overlapping vertical extents with 2 cm tolerance. This is an approximation, not exact roof-triangle intersection analysis. Structures are derived; names and aspect overrides are retained in the document.

Groups are single-level organisational containers. Moving or scaling a group/structure transforms members together. Rotation currently targets individual parts. Grouping a connected part includes its structure. Connections across groups inherit the first existing group in scene order.

Main aspect has eight compass directions. North is −Z and east is +X. The highest container owns the direction: a group overrides child structures, otherwise the structure or isolated part controls it. A single green arrow displays the effective aspect. Export cameras share the scene-wide front orientation.

## Terrain and exports

Terrain can be absent, one connected scene surface, or per collection. Convex envelopes connect footprints. Touching/overlapping patches merge, avoiding stacked child terrain. Courtyards are filled by the envelope; this is not terrain sculpting.

The export dialog controls terrain inclusion independently of viewport visibility. The ZIP contains a versioned plan, Markdown brief, manifest and nine clean 1400 × 1200 PNGs: front/back/left/right/top plus four isometric corners. Images use a shared orthographic scale and exclude editing handles, grid and guides. Top appears once.

The blockout is structural authority for downstream artwork. Materials and atmosphere remain art-direction concerns. There is no direct AI generation, asset approval system or finished mesh export inside this tool.

## Generic shape placement

Add mode selects a cube, cylinder or hollow ring from `primitive()` in the model. The stage builds a disposable translucent preview outside the document, then commits a fresh part on click and returns to Faces selection. Placement samples the first surface hit, or the ground plane, with X/Z subdivision snapping. Preview geometry is cleared on cancellation, tool changes, pointer leave and reference capture.

Hollow rings use connected annular surfaces with a real hole through wall and cap geometry; independent top/bottom inner and outer diameters define linear taper. They remain circular parts with an optional `innerDiameter`; diameter and height edits use the existing component/undo pipeline. Their outer footprint remains the approximation used for structures and terrain, so a part in the bore may be considered connected.

X-ray is transient editor state: rebuild applies transparency to component materials and clears edge depth testing. Reference capture rebuilds opaque components, hides aids, then restores the previous X-ray state. Circular radius controls bypass Select submode filtering because circular parts do not expose footprint-corner vertices.


## Wall openings

`src/openings.ts` owns opening types, shape contours, local wall frames, validation, scaling and body geometry with apertures. The existing geometry dispatcher selects this builder for hollow parts or parts with openings. It triangulates planar wall contours with holes; doors touching a level base become boundary notches. Hollow parts add offset interior wall surfaces, reveals, top wall strips and a floor slab. Solid parts add reveal sides and a back surface for shallow recesses. Roof construction stays independent.

Stage face selection records the component and wall index. Drawing projects pointer rays onto that wall's plane and converts world points into local wall coordinates. Invalid candidates show red and cannot commit. Active-face highlights reuse exterior wall triangles so they do not cover cutouts. Opening outlines and selected depth guides live in editor aids, omitted from reference capture. SceneTree shows nested opening entries; the React sidebar edits their parameters using the normal validated history pipeline.

These cuts do not use accumulated destructive CSG. Wall topology regenerates on each change. This is not yet a general-purpose boolean editor, arbitrary face topology editor or UV workflow.

Opening selection projects the pointer onto each opening's wall-local plane,
checks its actual outline and excludes occluded openings unless X-ray is active.
Selected opening handles take priority over ordinary component editing handles.
Opening drag previews share the creation preview path; the document changes only
on a valid pointer release. The pure editOpening helper implements snapping and
opposite-edge anchoring, including equal-diameter circular window resizing.

Hollow-wall opening reveals use a constant offset along the wall normal. Inner
wall boundaries retain their mitered corners, but inner cut contours preserve
the exterior opening coordinates and are triangulated separately.

src/infills.ts generates separate door leaf, frame, bar and pane meshes in the
parent part's local wall coordinates. Convex outline clipping fits bars and split
door leaves to rectangle, arched and circular contours. Meshes live in the solids
group, so they appear in reference captures and participate in X-ray rendering.
The pane is an opaque blue-grey blockout surface, not simulated transparent glass.
Material descriptions are metadata and do not change viewport shading.

Opening multi-selection is transient UI state, scoped to one part/wall. Stage
chooseOpening implements Shift toggling; group move previews derive all selected
positions from one snapped delta and validate the entire candidate plan.
opening-groups.ts duplicates with fresh IDs, deep-copied infills and a shared
translation, searching candidate positions before committing. No overlapping
temporary copies enter persisted state; undo/deletion prunes stale selected IDs.

architectural-details.ts creates derived chamfered stone meshes in wall-local
coordinates. Seed+opening ID+course index makes jamb variation stable; quoins use
corner/course indices and alternate widths along adjacent faces. Width variation
extends outwards from opening clearance. Quoin blocks overlapping cut clearance
are omitted. Geometry is blockout dressing, not a merged watertight masonry mesh.
ArchitecturalControls is shared by component defaults and opening overrides.
Threshold reconciliation runs before document commit validation; failures retain
the previous document. Render meshes are children of the component in solids,
participating in reference rendering and X-ray mode.

Arch generation matches the opening's 16-segment half-ellipse or 32-segment circle.
Inner stone boundaries interpolate the original faceted contour, preserving cut
clearance. Mortar gaps trim sector ends; front bevel rings provide chamfers.
Keystones combine the two crown sectors, increasing radial thickness and projection.
These are derived meshes with the same persistence/material flow as other details.

Quoin blocks use the intersection of the two outward-offset wall planes and
extend along both adjoining wall directions. One mesh wraps each corner/course;
alternating long and half-length sides produce the rotated bond. Seed variation
is shared across both faces of each stone. Opening clearance suppresses the whole
block when either side conflicts.

stone-dressing.ts performs seeded wall-local cluster sampling with bounded retries,
conservative opening/surround exclusions and intra-cluster spacing. Anchors depend
only on the component seed, cluster ID and cluster seed. Whole-patch candidates are scored for separation; an entire patch is omitted
when no clear placement fits. Rounded stone geometry maps
through wall frames or the tapered cylinder outer surface. No roof/internal
surface scattering. End bands use annular sectors; a chord correction preserves
the donut bore at low segment counts. Optional solid centre meshes apply only
to cylinders. These derived meshes are children of the part in the solids group,
so transforms, X-ray and reference captures include them.

Cluster placement receives all scene parts. It builds temporary transformed
body/roof meshes with bounding-box rejection and ray-parity point containment.
A grid of samples across each proposed stone's footprint/projection excludes
covered wall regions. Temporary geometry/materials are disposed after placement.
The controls and viewport use the same scene-aware calculation.

Curved cluster coordinates store angles as mid-radius arc lengths. Row offsets
and stone geometry use the radius at their own height to preserve physical widths;
separation uses the smaller of the two local radii across the circular seam.

roof-details.ts derives a closed roof skin from upper triangles of base roof
geometry, adds perimeter fascia and a gable ridge beam, and merges those meshes
for the standard roof rendering/material path. Disabled roofs bypass detailing.

Material-only edits update Stage.plan without reconstructing geometry; geometry-key.ts
excludes descriptive material fields while retaining dimensions and display state.
StoneDressingControls memoizes placement by geometry content. Recovery writes are
debounced 500 ms and flushed on pagehide/hidden visibility.

model-export.ts produces isolated mesh-only export objects and GLB encoding with
GLTFExporter. Stage.modelExport temporarily builds the chosen part subset and then
restores the live viewport before asynchronous serialization. Export copies own
geometry/materials and dispose them after encoding. The source plan is unchanged.

ModelCleaner.tsx owns an isolated Three.js preview and disposes its export copy on
close. model-cleaner.ts generates per-triangle dominant-axis UV projection in local
metres and computes diagnostics. UV generation preserves positions but expands
indexed meshes to support projection seams. Checkers are preview-only; GLB retains
the original material placeholders. No source model mutation is performed.

Saved UV recipes are applied to independent export copies by `applyPreparedUVs`.
`preparationStatus` checks requested part IDs against a scene-wide geometry signature.
ModelCleaner receives a save callback; main.tsx persists the recipe in the scene and
applies it in both standalone-model and complete-package exports.

MaterialDesigner.tsx owns a separate preview. texture-materials.ts resolves named
surface bindings and prepares Three.js materials for preview and export. Metadata
validation lives separately in texture-material-model.ts for browser/server reuse.
Materials are loaded through the local library API; scene geometry keys exclude
assignments to avoid invalidating UVs or rebuilding procedural geometry.

### Live material preview

Stage refreshes saved material assignments separately from geometry-change detection. It prepares projection UVs and materials on disposable copies, then transfers them to live meshes only if its request is still current. Rebuilds and disposal invalidate pending loads. Reference capture rebuilds plain geometry; X-ray retains its translucent editing appearance. Material Designer thumbnail selection applies immediately, while Save assignments persists the scene.

MaterialsManager has browse/edit/create states. The browser grid and edit drawer
scroll independently; save actions stay outside the scroll region. Dirty drafts
require an explicit discard when navigating away. MaterialDesigner numeric placement
inputs hold text locally and commit valid numbers on blur or Enter.

Wall builders emit outward-facing exterior triangles (including opening reveals/interiors with appropriate orientation). Projection UVs derive their horizontal axis from the geometric normal, so winding must match gable infills. Cleaner preparation mapping version 3 invalidates results produced before the wall-winding correction.

`detailedRoof` records named triangle ranges; `splitRoofSurfaces` separates them for the stage without changing vertex positions. Each named mesh receives its own stable material surface key in the existing preview/export pipeline. Parametric geometry consumers can still use the complete merged roof geometry.

Detailed gable walls now use `end-walls.ts` and extended opening contours instead of stage-level convex gable infills. Continuous exterior walls triangulate directly to the roof profile. `platforms.ts` derives full-width end platforms and named material meshes from optional roof-detail settings. `EndWallControls.tsx` edits these settings; numeric changes commit on blur/Enter. Cleaner preparation version 4 reflects the changed wall topology.
