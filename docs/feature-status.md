# Feature status

Snapshot: 17 September 2026. Completed means implemented in the current source; validation scope is recorded in the devlog.

## Completed

| Area | Delivered |
| --- | --- |
| Editor | Local React/Three.js editor; Asset Designer branding; dark glass/teal styling; consistent toolbar icons and controls |
| Drawing | Rectangle and circle footprints, top-view drawing, roof surface elevation for circles |
| Geometry editing | Face-centre, edge and vertex handles; separate selection modes; world-axis constraints; invalid crossing rejection |
| Heights | Fractional floors, short extensions, explicit cylinder height, base elevations and uneven corner heights |
| Roofs | Flat/gable/lean-to; ridge direction/rise; independent ridge endpoints with inward/outward offsets and hipped ends |
| Cylinders | Independent top and bottom diameter for tapering |
| Transforms | Whole-part central Move handle with XYZ arrows; part rotation; uniform part/structure/group scaling |
| Snapping | Configurable cube size, whole/half/quarter/sixth subdivisions, nearby edge and height alignment |
| Editing safety | Undo/redo, drag cancellation, input validation, double-click ground returns to Select |
| Organisation | Scene model, connected structures, single-level groups, rename/expand/collapse, drag/drop membership, collection movement |
| Component UI | Floating draggable/minimisable panels, compact rows with counters, selection summary, context-sensitive settings |
| Views | Separate 2D/3D switch; five flat views and four isometric corners |
| Aspects | Eight directions; highest-container ownership; one effective green arrow |
| Guides | Estimated floor guides and independent terrain visibility toggle |
| Terrain | None/scene/collection layouts; margin; connected envelopes and merging of intersecting patches |
| Reference packs | Nine consistent PNGs, JSON plan, architectural brief and manifest, export options dialog |
| Persistence | SQLite projects/scenes, scene search and project filtering, JSON import/download, recovery, save status and switch prompts |
| Settings | Cog heading, project assignment, grid settings, optional rescale and explicit Save/Cancel |
| Project feedback | Visible empty projects, scene counters, creation confirmation and assignment guidance |
| Developer handover | Source documentation, feature register, dated devlogs and maintenance instructions |

## Known limits / not yet implemented

- Doors/windows and other opening markers or cutouts.
- Arbitrary concave footprints, mesh sculpting or a general roof-junction solver.
- Boolean merging, watertight guarantees, production meshes, UVs, textures, GLB or engine packaging.
- Whole-group rotation, nested groups and reusable linked building instances.
- Roads, terrain elevation sculpting, landscape painting and detailed level design.
- Project rename/delete and scene deletion in the library.
- Remote collaboration, authentication, cloud sync and standalone production backend.
- Integrated image generation or artwork sign-off.
- Automated end-to-end browser interaction coverage; current automated coverage is domain/persistence focused.

## Candidate next work (not committed scope)

1. Expand browser regression coverage for pointer editing, scene switching and export images.
2. Improve code separation in the large UI and viewport modules as new work touches them.
3. Add project/scene management actions with explicit safeguards for deletion.
4. Define opening markers and reusable building instances before richer scene composition.
5. Agree mesh formats, budgets and engine conventions before implementing structural mesh exports.

The initial implementation plan intentionally proposed a smaller single-building MVP. Current scenes, groups, free part rotation, fractional floors and SQLite supersede those original restrictions.

## Follow-up: Add primitives

Completed: cursor-preview placement for cube/cylinder/donut, open-bore ring geometry, height/inner/outer-diameter handles and numeric controls, persistence/brief/scaling support, header undo/redo and grouped view controls. Ring taper is implemented with independent inner/outer diameters at both ends. Hole-aware structure/terrain contact is not implemented. Automated suite now contains 31 tests.

## Handle visibility and X-ray

Circular diameter controls are available in every Select mode; donut controls identify both ends with labels. Editor-only X-ray sits beside terrain/floor guides and does not apply to reference exports. Automated suite: 32 tests.

Handle labels now use a content-width cursor tooltip shown only on hover, replacing persistent donut/move/rotate text.

Straight wall edges now highlight and accept dragging along their full length in Edges selection; corner elevations are reflected in sloping edge highlights.

Component Settings is wider and grouped into accordions, with a fixed action footer. Roof enable/disable removes/restores roof geometry without discarding its settings. Automated suite: 33 tests.

Subdivision body preview is available with local axis/circular counts and surface-patch estimates. Editable mesh conversion, roof subdivisions and UV export remain planned. Automated suite: 34 tests.
