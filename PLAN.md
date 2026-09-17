# Asset Designer — implementation plan

> Historical proposal. For implemented behaviour and remaining work, see [current feature status](docs/feature-status.md) and [development logs](docs/devlogs/README.md). Scenes, groups and SQLite now supersede several original MVP restrictions.

Status: first working implementation completed, 16 September 2026. Includes direct 3D extrusion, configurable cubic grid units, attached parts, roof controls and one building assembly per export. See README.md for current usage and limitations. The remaining sections retain the design plan; they are not a claim that every future or optional feature is implemented.

## Purpose

Build a local browser tool for drawing a building's structure and exporting a reliable reference pack for the Mining Game art skill. It should make footprints, floor counts, extensions and roof directions explicit. Later, reuse those buildings to plan settlements and levels.

The planner owns structural geometry; the image skill supplies materials, age, vegetation and atmosphere. Its front/rear blockout exports come from one geometry model, although generated artwork can still deviate from that reference.

## Recommended first release

A simple 3D blockout editor with a top-down drawing mode. Draw rectangular footprints on the ground plane, pull a height handle upward in whole-floor steps, and adjust a simple roof ridge. Numeric controls remain available for every drag action. Assign parts as main building or attached extension. L/T-shaped buildings can be assembled from rectangles without requiring a general-purpose roof solver. This is constrained parametric editing, not arbitrary mesh sculpting.

## Modular grid

- Default major cell/cube: **3 × 3 × 3 metres**, a practical planning module rather than a claim that every historic floor is 3 m high. The user can set its physical size when creating a plan.
- One major vertical cube represents one default storey. The same module defines width and depth.
- Fine horizontal/roof snapping: whole, half, quarter or sixth of a module; default sixth (0.5 m at the default module). Strong major grid lines and subtle subdivisions avoid visual clutter.
- Door/window placement will use subdivisions. A normal doorway can occupy part of a cell; a broad double-door opening may occupy a full cell. Opening dimensions remain adjustable and are not forced into cubic proportions.
- Store geometry in metres with explicit per-part floor heights. Module size is a document setting, distinct from the view's grid visibility and snap subdivision.
- Changing module size after editing opens a clear choice: **rescale the whole blockout proportionally** (positions, footprints, heights and roofs), or **change the grid/defaults only** (preserve existing geometry and part floor heights). Show the resulting dimensions, make either change undoable, and never silently resize. Subdivision changes never resize geometry.
- MVP: one building assembly per document/export, composed of a main part and attached extensions. Design the schema for multiple assemblies; detached annexes and multiple buildings within one scene are a near-term follow-up. Do not force users to merge separate structures to export them later.

### First-use workflow

1. New building: enter a short name and choose grid/floor-height settings.
2. Drag a rectangle on the plan. Its dimensions appear beside it. The first part is the main structure.
3. Add another rectangle as an extension; snap its edges to the main part. Attached extensions belong to the same building assembly; detached annexes are a planned follow-up.
4. Pull the selected part’s height handle upward in floor-sized steps. Choose a roof, toggle ridge direction and drag its ridge/high-edge handle to set roof rise. Labels, dimensions and numeric controls update live.
5. Mark the front direction with an arrow. All main/reverse exports use this orientation.
6. Choose simple material notes and terrain intent, then export a reference pack.

Example: a 9 × 6 m two-storey main house (3 × 2 grid modules, 2 modules high) with a 3 × 3 m one-storey rear lean-to. The preview shows both volumes, the roof direction and their physical relationship before artwork is generated.

## Interface

- Top toolbar: Select, Draw part, Undo/Redo, Save, Open, Export.
- Left: named parts list; role indicated by icon and restrained colour.
- Centre: large 3D viewport with a Top/3D switch. In Top mode draw and resize footprints on the ground plane; in 3D mode select a part and use clear constrained handles. Optional ground-plane drawing in 3D uses ray/plane intersection; no drawing on arbitrary faces.
- Right: selected-part properties with ordinary labels: Width, Depth, Floors, Floor height, Roof type, Ridge direction, Roof rise, Materials.
- Camera buttons: orbit, reset, main, reverse and top. Disable orbit during a geometry drag; release restores it. Handles show the current dimension. Escape cancels the drag, pointer release commits one undo action. Camera movement must never modify the building.
- Clear states: selected part highlight, dimensions, attachment warnings and unsaved status. Escape cancels an unfinished drawing. Delete removes only the selected part and is undoable.
- Numeric inputs provide precise alternatives to dragging. Avoid relying on keyboard shortcuts or colour alone.

## Scope and acceptance criteria

### P0: geometry and editing

- Rectangular parts with grid-snapped draw, move, resize, duplicate and delete; undo/redo for committed edits.
- One designated main part per assembly; attached extensions have names and stable IDs; detached annex roles are reserved for the scene follow-up. A role change does not move geometry. Removing a main part prompts designation of another before export.
- Floor count is a positive integer. Wall height derives from floors × floor height. Per-part floor height is available when required; display total wall/eaves height separately from roof height.
- Default rotation increments of 90 degrees within an assembly. Free rotation and diagonal footprints are deferred.
- Flag overlaps and disconnected extensions; allow purposeful overlap as a blockout with a clear warning. Never silently trim volumes or claim a watertight model.
- Plan dimensions and 3D geometry derive from the same data. Editing display settings cannot alter physical size. Module-size changes follow the explicit rescale/grid-only choice above.
- Height extrusion handle snaps in the selected part’s floor-height increments, changes integer floor count and respects a one-floor minimum. Side handles resize rectangular footprints on the chosen horizontal snap. All actions have numeric alternatives and undo/redo. No individual cube objects are needed: modules guide dimensions of continuous volumes.

### P0: simple roofs

- Flat, gable and lean-to roofs for rectangular parts.
- Gable: ridge along local width or depth, chosen by a 90-degree toggle; numeric roof rise controls pitch. Display derived angle to make the effect understandable.
- Lean-to: choose the high edge and roof rise; show low/high eaves heights. Keep positive roof height and do not modify floor counts to accommodate a roof.
- Include a vertical ridge drag handle for gables and a high-edge handle for lean-tos in P0. Snap roof rise to fine module subdivisions, independently of floor increments; numeric controls remain available. Flat roofs have no ridge handle.
- Adjacent intersecting roofs remain separate blockout volumes. Flag obvious incompatible intersections. Automatic valleys, dormers, complex hipped roofs and arbitrary polygon roofing are outside P0.

### P0: save and export

- Save/open a versioned JSON plan file. Validate schema and dimensions; unsupported versions and malformed files show a useful error without replacing the open document.
- Local browser autosave is recovery, not the only saved copy. Offer an explicit file export/import in all supported browsers.
- Export a ZIP containing plan JSON, a generated building brief, clean main/reverse/top PNGs and an export manifest.
- Main and reverse cameras have the same projection, target, elevation, zoom and framing scale, separated by 180 degrees. Compute framing from the entire assembly for both views so extensions remain visible.
- Clean PNGs contain no grid, labels, selection colours or editor handles. Also include an optional annotated top plan with dimensions and part IDs.
- Export validation warns about structural overlaps, absent main-part designation and invalid roofs. Do not claim rendered blockouts are production assets.
- Use the existing building slug and project filename conventions for images; record planner revision and structural authority in the manifest.

### P1: extended shapes and scene assemblies

- Allow detached annexes and multiple building assemblies in one scene. Each has its own identity and main part. Add/select/move/rotate whole assemblies; export the selected building assembly, with whole-scene packs as a later option. Preserve relationships when moving groups.
- Draw orthogonal multi-corner footprints for flat-roofed/massing shapes, with self-intersection validation. Complex pitched roofs remain composed from simpler parts.
- Wall-mounted markers for doors and windows, with wall-relative offset, sill height, width and height. Markers first; geometry cutouts later.
- Optional GLB export of the structural blockout, clearly labelled untextured concept geometry.

### P2: scenes and levels

- Reusable building library and scene instances with their own positions and rotations. Retain local building coordinates so moving a building moves its extensions as a group.
- Layout several buildings, roads, yards, boundaries and vegetation zones.
- Add terrain elevations, building pads and footprints suitable for game placement.
- Export selected-building packs or a whole-scene overview with structural notes.
- Engine export requires separately established units, pivots, mesh conventions and terrain handling; do not treat level planning as finished Unity content.

## Technical approach

Proposed stack: TypeScript, React for controls, Three.js for the shared 3D/top-down viewport and camera exports, with SVG/HTML overlays for dimension labels where useful. A lightweight local development/build setup serves the app on localhost. No accounts or hosted backend for the first release; use locally bundled dependencies rather than CDN requests at runtime.

Keep document state separate from rendering. Plan views, 3D meshes and exported text are derived from one typed document, so they cannot accumulate independent dimensions. Store values rather than a Three.js scene dump as the primary file format. Use pure geometry functions for footprints, heights, roofs, bounding boxes and coordinate transforms.

For MVP saving, use file download/import plus autosave. Native browser folder/file pickers can be an enhancement, not a dependency because browser support varies. If direct saving into project folders becomes essential, add a small localhost file service limited to the configured planner data directory. Keep that out of the initial release unless requested.

### Proposed data contract

- `schemaVersion`, `documentId`, `name`, `units`, timestamps.
- `settings`: moduleSizeMetres (default 3), snapSubdivision (default 6), default floor height initially equal to module size, display preferences. Parts retain explicit physical dimensions and floor heights after creation.
- `assemblies[]`: stable ID, building slug, world position/rotation, designated main-part ID and front direction.
- `parts[]` per assembly: stable ID, name, role, parent/attachment relation where applicable, local footprint points, base elevation, floors, floor height, roof type/direction/rise and material notes.
- `presentation`: terrain mode, backdrop and requested lighting treatment.
- `notes`: building purpose, condition and allowed artistic interpretation.
- Later: opening markers, site paths/boundaries, reusable asset references and scene terrain.

Use X/Z for the ground plane and Y for height. Describe front/rear in assembly coordinates. Roof direction is stored relative to its part, not screen coordinates. Floor/eaves height and roof rise are separate. IDs remain stable through editing and exports.

## Integration with the art skill

The exported brief should distinguish:

1. **Locked structural facts:** footprint, floor counts, heights, part locations, roof types/directions, front designation and specified openings.
2. **Art direction:** the approved project style, materials, wear, terrain mode and lighting.
3. **Unspecified details:** areas the image generator may infer, including unmarked windows or service features.

When implementation reaches export, update the building-art skill to recognise planner packs. Planner JSON and blockout views take precedence over inferred architecture. Approved style references control appearance only. Reverse-view inference must not add a lean-to or change a roof explicitly fixed by the planner.

No direct image-generation API integration in MVP. Export the pack and use it in a project task. This keeps the tool independent of image-provider credentials and lets the existing approval workflow continue. Automatic image generation can be a separate later decision.

## Delivery milestones

1. Confirm scope and defaults; design the interface and schema. Prove rectangle → height → roof → matching camera exports in a small technical slice.
2. Build footprint editing, roles, direct height/resize handles, camera/drag interaction and undo/redo. Validate with a cottage and a main building plus two extensions.
3. Add parametric roofs and ridge/high-edge handles, front designation, save/load, recovery and export pack. This is the recommended MVP completion point.
4. Trial with the art skill on a cottage, harbour house and industrial structure. Compare generated artwork against exported structural constraints and refine the brief.
5. Add detached annexes/multiple assemblies, extended footprints and opening markers based on trial feedback.
6. Expand to multi-building scene composition after the individual-building workflow is dependable.

Simple 3D adds moderate interaction work (picking, constrained drags, snapping, cancellation and camera conflicts) but reuses the geometry needed for preview/export. Arbitrary face extrusion, general mesh editing and automatic roof junctions remain excluded. No fixed delivery dates are promised before the technical slice is tested. Complex roof intersections and polygon editing are the largest geometry risks; constraining P0 to rectangular parts keeps these manageable.

## Validation and success targets

Proposed targets, to be confirmed rather than measured claims:

- Create a main building with two extensions and export the pack in under five minutes after a short introduction.
- Save/reopen without changing dimensions, roles, roof settings or front direction.
- Main/reverse PNGs always share geometry and scale; verify asymmetric test fixtures with an off-centre chimney/extension.
- Undo/redo restores both data and matching preview. Cancelling a drag restores its initial values.
- At the default module, two floors produce 6 m wall height; subdivisions yield 0.5 m snap. Grid-only changes preserve existing geometry; rescaling multiplies every physical dimension/position consistently. Verify both operations after save/reopen.
- Orbit and extrusion never activate simultaneously; roofs and selection handles track the selected part after resizing.
- Invalid files leave the current work intact; recovery restores the most recent committed edit after reload.
- Check units, snapping, rotation, floor heights, roof direction and JSON round-trip with focused automated tests; test the drawing/export workflow in the browser.
- Test requested art-generation results separately: accurate blockout exports improve guidance but cannot guarantee AI adherence.

## Confirmed direction and remaining defaults

- User supports adding simple 3D extrusion now; it is included in the MVP above.
- User wants configurable floor-sized cubic grid modules, used for horizontal and vertical planning. Proposed initial default: 3 m, with fractional subdivisions for smaller details.
- One building per export initially; attached parts belong to that building. Detached annexes and multiple buildings are planned next.
- Other parts of the prior plan are accepted.
- Browser preference and direct folder saving remain non-blocking: begin with portable file import/export and local recovery.

## Technical references

- [Three.js orthographic camera](https://threejs.org/docs/pages/OrthographicCamera.html): constant projected object size independent of distance, useful for consistent blockout exports.
- [Three.js ExtrudeGeometry](https://threejs.org/docs/pages/ExtrudeGeometry.html): extrusion of 2D shapes into volume.
- [Three.js TransformControls](https://threejs.org/docs/pages/TransformControls.html): object manipulation controls for later direct 3D editing.
- [Three.js GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html): future glTF/GLB blockout export.
- [MDN showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker): limited browser availability motivates a portable save fallback.

## September 2026 interface and geometry update

Implemented dark glass styling with teal accents; draggable/minimisable parts and settings panels; Building/Part tabs; hidden grid settings; face, edge and corner footprint handles; convex quadrilateral footprints; explicit short wall heights; subdivision snapping and alignment to other parts. Existing version 1 plans remain readable. See README for the additive geometry fields and current constraints.

## Geometry tools follow-up

Implemented estimated grid-based floor guides, world-axis hover controls, independent upper/lower wall-corner heights, editable ridge endpoints and hipped ends, centre/radius circle drawing with rooftop elevation, and Y-axis rotation with 15°/1° snapping. New optional geometry fields are included in save files and architectural briefs. Editor guides remain excluded from image exports.
