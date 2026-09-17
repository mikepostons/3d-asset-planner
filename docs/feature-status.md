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

- Curved-wall and roof openings, door panels, frames and glazing.
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

Separate named body/roof/terrain descriptions now persist and export through JSON, architectural briefs and manifest assignments. Surface overrides, rendered materials and UV unwrapping remain unimplemented. Automated suite: 35 tests.


## Straight-wall openings

Completed: face activation/highlight, conditional Openings icon menu, five opening shapes drawn on wall planes, nested opening entries, numeric sizes/offsets, hollow walls with default 0.4 m thickness, reveals and floor slab, solid recesses, selected-opening depth outlines, persistence/brief/manifest support, undo and transform support. Invalid wall fits, overlaps and collapsed interiors are rejected. Automated suite: 38 tests.

### Direct opening editing
Select an opening on its wall or in the component tree. Drag the teal centre
handle to move it on that wall; amber edge/corner handles resize it. Changes snap
to grid increments; circular windows retain equal dimensions. Doors snap to the
wall base when close. A preview shows invalid wall bounds/collisions in red and
does not commit them. Escape cancels; a completed drag is one undo step.

Opening reveals now run perpendicular to the wall face: the inner contour keeps
the same size and alignment as the outer contour, including off-centre openings.

### Opening infills
Each opening can remain Empty or generate a fitted Door or Window child.
Doors support single/double leaves, inset and thickness. Windows include a
pane, frame and clipped bars, with size-based Auto or manual horizontal/vertical
counts. Circular Auto windows have no bars. All infills follow opening edits and
component scaling, and appear beneath their opening in the tree.

### Infill reuse and opening selection
Infill sections now separate Fit & depth, Door leaves/Frame & bars, Materials,
and Apply to other openings. Scene-wide copying offers all matching doors or
windows, or similar-sized openings (both dimensions within 20%), shows target
counts, replaces existing settings/materials and supports one-step Undo.
Double doors expose the gap between leaves. Existing infills default to 0.01 m.
Openings have a 10px border picking tolerance, hover outline and tooltip; only
solid meshes block picking, not decorative edge lines.

### Multiple openings
Shift-click canvas openings or their tree entries to toggle a same-wall selection.
Selected openings highlight together; centre dragging preserves their spacing.
Duplicate selected openings copies shapes/infills into available wall space and
selects the new IDs, ready to drag. Delete selected/keyboard delete removes the
set. Duplicate/move/delete are individual undo steps. Different-wall multi-select
and multi-resize are not included; numeric settings edit the active opening.

### Architectural details (first increment)
Component Settings → Architectural details generates straight-opening jambs,
lintels, cills/door thresholds and optional corner quoins. Shared projection,
chamfer, mortar gap, seeded width variation and dimensional controls drive the
meshes. Surround/cill/quoin material descriptions accompany exports. Opening
surrounds can inherit, disable or override component settings.
Door thresholds optionally raise the cut and infill while preserving clear height;
disabling/changing the threshold reverses the prior lift without accumulating it.
Arched openings receive straight jambs up to the spring; shaped arch heads,
circular surrounds and keystones are deferred. Close-set trims can overlap.

Cills/thresholds have independent total width adjustment (positive or negative)
and outward projection controls in Sizes, including per-opening custom settings.

### Arches and keystones
The earlier arch-head deferral is now resolved: arched doors/windows have
segmented stone heads and circular windows have complete surrounds. Arches and
Keystones toggles live in Architectural details, with surround width and keystone
extra size in Sizes. Per-opening overrides apply. Shared projection, mortar gap,
chamfer and surround materials are used. A keystone replaces the two crown sectors.

Quoins now form one continuous corner block per course, with long/short dimensions
swapped on successive courses. This replaces separate wall strips and fills the
previous indentation at the projecting outside corner.
