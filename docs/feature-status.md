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

### Stone clusters and end bands
Component Settings has Stone clusters for all part shapes, plus Stone end bands
for cylinders/donuts. Clusters expose component seed, stone size/variation, edge
and opening clearance, projection, gap, chamfer/material; each cluster has its own
seed, count, spread, optional size override, regenerate/remove actions.
Placement excludes openings and conservative surround bounds, wall edges,
quoins and cylinder end margins. Curved stones map onto tapered outer walls;
donut interiors are excluded. Fit shortfalls are reported.

Top/bottom bands have independent toggles and shared height, overhang, count, gap,
variation, seed/material. Donut bores stay open; cylinders optionally fill the band
centre. Settings and meshes are included in reference exports.

New clusters target the active wall in Select → Faces; the Add button names the
face. Each cluster has a Placement face selector for correcting existing clusters.
Largest-exposed-space and connected-patch placement remain proposed work.

Cluster placement now excludes stone samples inside other scene components'
body or roof volumes, including touching extensions. Counts update automatically
when parts move; this does not yet rank the largest exposed wall patches.

Clusters now use whole staggered row patterns: 1–2, 2–3, 2–3–2 or 3–2–3.
Space between clusters is independent of stone mortar gaps. Whole-patch candidate
placement favours roomier positions and rejects any patch conflicting with edges,
surrounds, another cluster or covered surfaces. Individual stones no longer scatter.

Mixed cluster sizes are the default, weighted toward small 1–2 patches. The
Mix all cluster sizes button changes existing patterns to mixed; per-cluster fixed
patterns remain available. Regenerating seeds also regenerates mixed patterns.

Cylinder/donut patches wrap around the outer wall with locally sized stones on
tapers and seam-aware spacing. Add outer-wall cluster is available in Stone clusters.

Clusters can be selected/highlighted from their settings and repositioned with
horizontal/height fields (angle/height for circular parts). Each has Delete cluster;
Delete all clusters clears the current component. Both support scene undo.

### Roof construction and trim
Opt-in Roof construction & trim adds vertical thickness, shared side overhang and
independent end overhangs for pitched, lean-to and flat roofs. Fascia boards and
gable ridge strips have dimension controls. Trim shares the roof material.
Circular components retain their existing end-band controls.

Roof ridge caps now fold flush along both slopes. Fascia inset is configurable.
Gable ends support shared or independent hidden/wall-extension/separate-material
settings, defaulting to wall infill. Infill meshes remain separate from the base wall.

Side/end fascia groups independently control height, thickness, inset and drop;
boards start below the roof skin. Optional ridge beams support independent end
extensions and width/height/drop controls on gable roofs.

Side fascia boards have a signed length offset per end for extending or shortening
them independently of roof overhang and end-board settings.

Floor guide labels use compact F1 · 3 m text, content-sized backgrounds and smaller
badges offset from the selected component's corner.

### Structural 3D export
Export 3D model downloads a GLB ZIP with source plan and geometry report. Supports
scene or selected component/structure/group, optional configured terrain and centred
base origin. Named parts and placeholder material slots are retained. Editor aids
are excluded. UVs, textures, cleanup, collision and LOD generation remain pending;
this supersedes earlier statements that structural mesh export is only planned.

### Initial Model Cleaner
Model Cleaner opens an independent copy of the selection (or scene), reports mesh,
triangle, UV and degenerate-face counts, generates tiling projection UVs and previews
a checkerboard. A two-column modal puts controls on the left and the viewer on the
right. Save preparation persists UV settings with the scene; model and complete
exports apply them automatically. Missing or outdated preparation produces a warning.
Packed unwrap, curved mapping, merging and baking remain pending.
Export parent folders now organise openings/surrounds, quoins, clusters, bands and
roof assembly under named components and scene groups.

Unified Export dialog offers reference, model and complete scene packages. Complete
includes structural GLB plus references and current saved UV preparation.
Header save colour indicates dirty/saved state; Help is in the canvas footer.

New uses a circled-plus icon and always confirms before closing the current scene,
with cancel, continue without saving, and save-and-continue actions.

### Foundations
Scene defaults and connected-structure overrides control below-ground depth, outward
margin and material metadata. Included independently of terrain in renders and model
exports. Ground-level footprint sections remain separate; Boolean union is pending.

Scene Settings uses General, Terrain, Foundations and Export tabs, with a scrolling
content area and always-visible Save/Cancel footer.
