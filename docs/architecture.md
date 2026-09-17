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
