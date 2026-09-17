# Asset Designer

A local structural blockout editor for the Mining Game artwork workflow.

## Open

Double-click **Start Asset Designer.command**, then use the local browser link printed in Terminal. On first use, dependencies must be installed with `npm install` (already installed in this workspace). Keep that Terminal window open while using the planner.

Alternatively:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The server is local to this computer. After dependency installation, the editor does not require an external service or an image-generation account.

## Workflow

1. Start a new plan or inspect the example cottage.
2. Draw rectangular or circular parts in Top view. Connected parts automatically form structures; detached parts are supported.
3. Switch to 3D, select a part and drag the teal handle for wall/eaves height or blue handle for roof rise. Hover a wall face for its centre handle, or a footprint edge/corner for a reshape handle.
4. Use Move to position a part, or edit exact dimensions in the right panel.
5. Set the scene front, material notes and terrain intent.
6. Save the scene to the local library; export the reference ZIP when ready.

The major cube defaults to 3 m. Fine snap defaults to one-sixth of that (0.5 m). Changing cube size offers either proportional rescaling or changing only the grid/new-part defaults. Existing parts retain their floor heights in grid-only mode.

Escape cancels a drag. Command/Ctrl-Z undoes, Shift-Command/Ctrl-Z redoes. Orbit by dragging empty space in Select/3D mode; right-drag pans and the wheel zooms.

## Saved work and exports

- Browser recovery saves edits locally; **Download current JSON** in the scene library downloads a portable JSON file. Browser recovery is not a permanent backup.
- **Library → Import JSON** accepts a previously saved JSON plan and validates it before changing the current document.
- **Export references** downloads a ZIP with plan JSON, architectural brief, nine PNGs (front, back, left, right, top and four isometric corners) and an export manifest.
- PNGs are unlabelled structural references; all nine views share the same geometry and orthographic scale.
- Optional terrain blockout geometry is included in the images and described by footprint polygons in the manifest.
- Use the pack in a Mining Game artwork task: “Use this Asset Designer pack as structural authority and our approved art style for the materials.”

## Current limits

A scene may contain multiple structures and detached parts per export. Footprints can be circular, or begin as rectangles and support convex four-corner edits; corners cannot cross or become concave. Walls remain vertical. Flat, gable and lean-to roofs. Face handles move that wall while leaving the opposite wall in place. Corner handles reshape the footprint. Gable and lean-to roof surfaces follow the edited footprint. Heights use grid subdivisions and snap to other parts’ eaves and roof tops; moving parts and editing footprint handles snap to nearby corner/edge coordinates. Explicit wall height can be shorter than a floor module. Roof intersections remain separate overlapping volumes; a non-blocking note explains this. Straight-wall openings and optional hollow walls are supported. Curved-wall openings, complex roof junctions, arbitrary mesh sculpting and production GLB export remain outside the current release. This is a concept geometry tool, not a finished game-asset modeller.

## Development

```sh
npm test
npm run build
```

Source: `src/model.ts` is the validated plan data and geometry rules, `src/stage.ts` is the Three.js scene/editing/export renderer, and `src/main.tsx` is the React interface. The primary file format is schema version 1, uses metres, X/Z ground coordinates and Y height. Scenes store parts with optional group membership; connected structures are derived from geometry.

`?test=1` uses a separate browser recovery key for manual testing. No production document is changed by tests in that mode.

## Interface

Dark glass panels with teal accents. Edit the scene name in the header. Drag panel title bars to reposition Scene components or Settings; minimise them using the minus button. Settings has Scene and Component tabs. The header Settings button opens a centred Settings dialog with a project selector and grid controls. Save settings saves the scene and its project assignment locally; Cancel discards the draft settings. Browser recovery remains active although its header label is removed.

Legacy plans still open. Optional `wallHeight` overrides `floors × floorHeight`; changing floor settings resets the override. Optional `footprint` stores four counter-clockwise normalised X/Z corners, scaled by width/depth then rotated and translated. These values are saved and exported. Width/depth edits scale the footprint; floor count is descriptive when an explicit wall height is set.

## Floor guides, axes, roofs and circles

- **Floor guides:** toggle estimated storey boundaries using the major grid size. Labels appear on the selected part. These are editing guides and are omitted from reference PNGs.
- **XYZ arrows:** hover a wall corner, edge, face or ridge endpoint. Red X and blue Z constrain horizontal edits to world axes. Green Y edits upper or lower corner height; the height and roof-rise handles offer Y only. Wall columns retain shared horizontal positions at their top and bottom. Invalid crossing geometry is rejected. Use Part Settings to level wall tops/bases again.
- **Ridge endpoints:** drag either pale endpoint inward for a hipped roof end, or use Ridge start/end inset. The XYZ arrows also allow outward extension, lateral offsets and different endpoint heights. Negative Ridge start/end offsets extend beyond the walls; positive offsets inset. Roof intersections remain overlapping volumes, not automatically merged meshes. Reset ridge ends restores the full gable. The global roof-rise control raises both ends together.
- **Circles:** in Draw, choose Circle; drag from centre to radius. Circles use 32 segments, a flat cap, independent bottom/top diameters and separate end-cap handles. Starting a circle on a roof samples its surface elevation. Adjust Base elevation and Wall height to embed it or make a shorter chimney. These are solid structural volumes, without chimney bore or decorative caps.
- **Rotation:** choose Rotate, select a part and drag its teal ring. Snap is 15°, or 1° with Shift. Exact angles can be entered in Part Settings. Rotation is about world Y.

Additional version-1 fields are optional: `shape`, `baseY`, `cornerHeights` and `cornerBases` (four local heights in metres), and `ridgeEnds` (two local normalised-X / metres-above-nominal-eaves / normalised-Z triples). All travel with the plan and brief and scale correctly when the building is rescaled. Rotation now accepts any angle between 0 and 360. Older plans default to ground-level rectangular parts with level walls and a full ridge.

Cylinder taper is stored as optional `topDiameter` in metres; width/depth retain the bottom diameter. Older circles default to equal end diameters. Both ends scale with the rescale-building operation. Ridge X/Z coordinates may extend beyond the footprint (bounded to ±5 normalised units).

## Selection modes

Move shows a single central handle for the selected part; drag it to translate the whole part horizontally while preserving all geometry. Clicking a part selects it without starting a move, and choosing a part in the list keeps Move active. Select has Vertices (wall corners and ridge endpoints), Edges (edge midpoints, ridge-height and cylinder-rim controls), and Faces (wall-face centres, height/roof and cylinder-cap controls). Inactive handle types cannot be picked. Changing modes clears the previous gizmo. Numeric Part Settings remain available in every mode.

## Whole-part transforms

- In **Move**, select the centre handle to reveal XYZ arrows. Drag an arrow to move on that world axis, or drag the centre across the ground. Y changes base elevation. Grid subdivisions and nearby part edges/heights provide snapping.
- Double-click empty canvas ground to return to **Select**.
- In **Select → Edges**, the entire highlighted roof ridge is selectable; drag it vertically to raise/lower both ends together. Use Vertices for individual ridge endpoints.
- Cylinders have an explicit **Height** field in Part Settings.
- **Scale** uses a uniform multiplier: `0.5` halves dimensions and `2` doubles them. Select a part, enter a multiplier, and click Apply scale. The part's base centre and rotation stay fixed; widths, heights, taper diameters and custom ridge/corner geometry scale together. Undo restores the previous size. The floor count remains an estimate; floor height scales with the part. Rendered flat-roof cap thickness remains a fixed visual detail.


## Scenes, structures and groups

The canvas now represents a scene. Scene components replaces Building Parts. Connected or overlapping parts form an automatically detected structure; isolated parts remain individual components. Groups are named, single-level folders containing any number of structures and isolated parts. Expand/collapse rows, use the pencil to rename, and drag rows into groups or back to Ungrouped. A part's Group field provides a keyboard-accessible alternative. Reparenting a connected part includes its whole structure. When geometry connects across groups, the resulting structure inherits the first existing group in scene order.

Select a structure or group to move all its members together with the existing central handle and XYZ arrows. Relative positions are preserved. Rotate applies to individual parts. Scale also supports structures and groups, including the spacing and relative elevations of their parts. Ungroup keeps the parts; Undo restores organisation and movement.

Scene Settings controls the scene-wide front, terrain and notes. Component Settings changes according to the selected part, structure or group. Existing plans remain readable. Optional `groups`, per-part `groupId`, and `structureNames` persist in plan JSON. Reference packs include scene organisation in the brief and manifest. Detached components, multiple main-role legacy parts and overlaps do not block export. Volumes remain separate; no destructive boolean mesh merge is performed.

Structure detection uses footprint contact and overlapping vertical extents with a 2 cm tolerance. It is a blockout approximation, not exact triangle-level roof intersection testing. Groups are organisational and do not merge geometry.


## View presets and terrain

The Camera view menu offers five flat orthographic views and four true isometric corners. Directions are relative to Scene front; top-down uses the same orientation. Flat views lock orbit (pan/zoom remain available). Export opens a dialog and produces all nine views at 1400 × 1200 with matching scale. Top-down appears once. Guides, selection handles and grid are excluded.

Terrain layout is saved in Scene Settings: None, one connected scene surface, or one surface per group / ungrouped structure / loose part. The margin is adjustable. Convex footprint envelopes connect all members, so courtyards and gaps within a group are filled. Touching or overlapping envelopes are merged iteratively; there is no stacked child terrain. All terrain sits at ground level with a shallow sloping perimeter; this is a simple reference surface, not sculptable landscape or a production game mesh.

The Terrain toolbar toggle affects editor visibility only. The export dialog separately controls inclusion and lets you update the saved layout. Excluding terrain also removes its layout from the exported plan and brief, while retaining the working scene settings. Existing plans start with no generated terrain.

## Main aspects

Main aspect uses eight compass directions only: N, NE, E, SE, S, SW, W and NW. North is world −Z; east is +X. Select the highest-level container: a group controls every child, while an ungrouped structure controls its own parts. An isolated ungrouped part can also set its direction. Child settings link to their controlling container instead of offering conflicting overrides.

One green ground-level arrow shows the selected container's effective direction, centred beneath that container. Selecting a child retains its parent's arrow. With nothing selected, it shows Scene front. View main aspect previews an isometric corner relative to that direction; geometry is unchanged. Scene exports retain their shared Scene front orientation and record effective component directions in the plan, brief and manifest. Old arbitrary angles round to the nearest 45°. Stored structure directions are ignored while grouped and are restored when ungrouped.


## Compact controls, settings and floor estimates

Component rows show circular member counters beside names. The toolbar uses separate 2D/3D switches and filters view choices accordingly. Scene Settings is a centred blocking dialog with Save and Cancel; changes remain a draft until saved. Grid settings also opens over a blocking overlay and applies its draft divisions with the chosen save action.

Scale accepts a selected part, structure or group. Collections scale about the centre of their combined footprint at the lowest base elevation. Part dimensions, offsets and relative elevations scale together, preserving layout.

The Floors field is calculated from actual wall height divided by that part's floor height and supports decimals (for example 1.3 or 1.5). Editing Floors changes wall height; editing Floor height retains the existing physical wall height and recalculates the estimate. Floor guides use the same per-part floor height. Roof height is excluded. Uneven wall tops use the highest top for the displayed estimate; it is a planning estimate, not a count of modelled interior floor slabs.


## Local projects and scenes

**Save scene** stores the current scene in `data/scenes.sqlite`, updating the same scene on subsequent saves. First save asks for a name and project; create a project there or in the Library. Click the saved-status badge beside the scene name to rename or refile the current scene. Ctrl/Cmd-S also saves. The badge distinguishes Not saved, Unsaved changes, Saving, and Saved locally.

**Library** presents a searchable library with project filters and saved dates. **New** starts a blank scene. Switching or starting new prompts to save, discard, or cancel when there are unsaved changes. A failed save leaves the current work open. Undo history stays within the current scene. JSON import creates a new scene identity, preventing accidental overwrites; JSON download and reference packs remain available for portable backups.

Browser recovery still protects work between explicit saves. SQLite is the persistent library; keep the `data` folder when moving this tool. The database is excluded from Git. For a database backup, stop the local server and copy `data/scenes.sqlite`; reopen the launcher afterwards. Do not run concurrent copies against a Dropbox-synchronised database. Saving checks the database revision and refuses to overwrite a scene changed by another editor tab.

Requires Node 22.13 or newer (this machine uses Node 25). The existing launcher starts Vite with the local SQLite API; a standalone static HTML deployment does not include the database service. `?test=1` uses a separate in-memory test library and separate browser recovery so UI checks do not alter the real library.

The library lists saved projects even when empty, with scene counters and confirmation after project creation. Creating a project does not move the current scene: choose it in Settings → Project and Save settings.

## Developer documentation

See [docs](docs/README.md) for architecture, data/storage contracts, completed features, development workflow and [dated devlogs](docs/devlogs/README.md). Documentation is updated alongside meaningful development changes, as required by [AGENTS.md](AGENTS.md).

## Add generic shapes

Choose **Add**, then select **Cube**, **Cylinder** or **Donut (hollow cylinder)**. A translucent preview follows the cursor; click the ground or an existing surface to place one part. Placement snaps horizontally to grid subdivisions. Escape cancels; placement returns to Select → Faces. Initial dimensions use the current major module.

Donut is a ring with an open bore and independently tapered inner and outer walls. In Faces mode, use the height handle, outer and amber inner-diameter handles at both ends, or enter Height and the four end diameters in Component Settings. Diameters retain at least 0.1 m difference. Uniform scaling preserves the bore. Structure contact and generated terrain use their outer footprint.

Undo/redo are in the header. Floor guides and Terrain sit together immediately left of the 2D/3D view controls.

**X-ray** beside Terrain makes component surfaces translucent so hidden surfaces are easier to inspect. Reference exports remain solid. Donut diameter handles are labelled and available in all Select modes, including Vertices; use Faces for the height handle.

Hover a handle to see its name above/right of the cursor. Handle tooltips fit their text and disappear when you leave or begin dragging.

In **Select → Edges**, hover anywhere along a straight wall edge to highlight its full length, then drag that edge. Midpoint targeting is no longer required; axis arrows remain available for constrained edits. Uneven top/base edges follow their actual endpoints.

Component Settings uses collapsible Organisation/aspect, Dimensions, Position, Floors/walls, Elevation/rotation, Roof and Materials sections. Duplicate/Delete stay in the footer while properties scroll. Disable **Roof enabled** to remove the roof mesh and its handles, leaving a plain capped volume; re-enable to restore the saved roof settings. The choice is saved and respected by reference exports.

**Component Settings → Subdivisions** enables an amber body-surface preview. Rectangular parts use local X/Y/Z segment counts; circular parts use Around, Height and Radial/wall thickness counts. The estimate counts surface patches, not final triangles. Roofs are excluded. This first stage does not add editable vertices or unwrap UVs; see the development plan for conversion/export.

### Material descriptions

Use Component Settings → Materials for separate **Body material** and **Roof material** names/descriptions. Scene Settings contains **Terrain material**. These describe intended appearance; they do not generate textures or change viewport colours. Values travel in plan JSON, the architectural brief and manifest `materialAssignments`. Disabled roof descriptions are retained for re-enabling but omitted from active assignments. Excluded terrain is likewise omitted from active assignments. Older combined material notes appear in Body description unchanged; separate roof notes manually where needed.


## Doors, windows and hollow walls

1. Select a component, choose **Select → Faces**, then click a straight wall. The active face becomes lighter; the first click activates it rather than moving it.
2. Open **Openings** in the toolbar. Its icon grid offers Door, Window, Arched door, Arched window and Circular window. Rounded variants have arched tops.
3. Enable **Hollow walls** in that menu for through-openings, or leave the body solid for recesses. Default wall thickness is 0.4 m and can be changed under **Walls & openings**.
4. Pick a shape and drag on the highlighted wall. Drawing snaps to the scene subdivisions; doors start at the wall base. Red outlines indicate invalid placement; release creates only valid openings. Escape cancels.
5. Select the nested **Component → Openings** entry to edit its name, dimensions, wall-start offset and sill/base height. The selected opening shows a depth outline through surfaces. Whole-scene X-ray remains optional.

Openings remain attached to their parent when moved or rotated. Ordinary wall resizing retains metre sizes/offsets and refuses changes that no longer fit the openings. Uniform part/group or module rescaling scales openings and thickness together. Duplicate part copies its openings; Delete opening removes just that opening. Undo/redo covers creation, settings and deletion.

Hollow walls have a simple 0.12 m floor slab below the component base and retain the existing roof setting; there are no internal storeys. Walls regenerate around opening contours, including reveals and inner surfaces. Solid recesses are at most 0.2 m deep (or wall thickness if smaller). No door panels, frames or glazing are generated. Circular walls, roof openings and overlapping openings are not yet supported. Straight convex four-corner footprints are supported, with thickness validation to preserve an interior.

The JSON, brief and manifest store opening shapes and wall-relative dimensions. Reference PNGs show the same cuts but omit active-face highlights and depth guides. These remain structural concept models; no production mesh export or UV unwrap is added by this feature.
