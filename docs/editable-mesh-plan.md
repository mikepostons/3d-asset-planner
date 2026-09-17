# Editable meshes and export: proposed next stage

Status: design only. Subdivision preview is implemented; conversion, mesh editing, UV generation and 3D export are not.

## Current preview contract

Per-part optional `subdivisions` stores enabled plus integer x/y/z segment counts, bounded 1–64. Circular x counts start at 3. Rectangular counts refer to local footprint directions and vertical interpolation; circles use around/height/radial divisions. Taper and corner elevations are followed. These are body-surface guides; roofs remain separate. Counts estimate surface patches, not final triangles. Circular centre patches will require triangular fans. Guide geometry lives in editor aids and is absent from reference images. Existing body meshes are unchanged.

## Proposed mesh data

Add a versioned discriminated component representation: procedural part or editable mesh. Mesh data should include local positions, indexed polygon faces with stable vertex/face IDs, material assignments and per-face-corner UVs. Derive edges from face adjacency. Retain the source procedural part and conversion parameters as a recovery snapshot. Do not store Three.js object serialization.

Before implementation, decide migration/version strategy and maximum vertex/face budgets. Validate finite positions, index ranges, distinct face corners, degeneracy and supported topology. Preserve existing part IDs, placement, groups and main-aspect metadata.

## Conversion transaction

1. Generate a preview topology, including an explicit roof policy; body-only preview must not silently imply roof conversion.
2. Display final vertex/face/triangle counts and the affected controls.
3. Apply in a single undoable operation. Store procedural source alongside the mesh.
4. Replace procedural dimensions/roof settings with vertex/edge/face editing. Retain transforms, materials and organisation.
5. Offer restore-procedural as a deliberate action that explains loss of subsequent mesh edits.

Generation should weld shared boundaries, preserve the donut bore, use triangle fans at solid circular centres, and avoid overlapping internal faces. Angled corner-height caps need consistent triangulation. Roof/body junctions and intentional overlaps between separate parts need separate policies; no implicit boolean merge.

## Editing and UVs

Implement stable selection IDs and axis-constrained mesh transforms together with conversion. Validate face collapse and topology changes, and retain undo/redo. UV seams and unwrap are separate from subdivision: store UVs per face corner so shared spatial vertices may have different UV coordinates. Start with box/cylindrical projection and explicit seams before automatic packing. Existing procedural materials remain notes until a material/export contract is defined.

## Export

Proposed first mesh format: GLB, pending confirmation. Specify metres, pivots, transforms, triangulation, normals, material slots and optional terrain. Export only real geometry; preview aids never become an asset accidentally. Reference PNGs and GLB must derive from the same enabled surfaces. Label exports untextured structural blockouts rather than finished assets.

## Acceptance checks

Round-trip old and new documents; stable selection after edits; undo/redo conversion; restore procedural source; no sealed donut openings; no degenerate fans; independently altered ridge/corner geometry; UV seam continuity; transform/export coordinate checks; and browser tests for selection, conversion and file export. Include a geometry-budget check before conversion.
