# Export hierarchy and initial Model Cleaner

User verified engine-house GLB in Blender: scale, openings, junctions, shading and
parent transforms passed. This is the agreed visual reference asset; no copy of
its source file was supplied or taken from the production library during this work.

Export now includes identity parent nodes for scene groups, opening infills and
surrounds, quoins, stone clusters (individual cluster subgroups), end bands, gables
and roof assembly. Meshes remain separate. Opening/cluster IDs are carried from
geometry generation. Roof skin/trim currently remain combined in a roof mesh.

Added Model Cleaner preview modal, using selected parts or the full scene when
nothing is selected, without terrain. It operates on an independent export copy.
Shows mesh/triangle/missing-UV/degenerate-triangle counts, generates metre-scaled
box-projection UVs and displays a checker. The later save workflow below supersedes
the initial session-only download. No automatic
repair, Boolean merging, packed UV atlas or baking yet. Projection seams on curved
surfaces and overlap are known limitations; cylindrical mapping remains next work.

72 tests pass; build passes with existing size warning. Tests cover UV finite values,
position preservation, scale validation and hierarchy transform preservation.
Isolated browser test: 153 meshes, 6,512 triangles, 39 missing UVs before generation,
zero afterward; four degenerate triangles reported. Checker rendering inspected.

## Saved preparation and layout update

Cleaner now uses a 1/3 controls, 2/3 preview layout with a teal circular close button.
Save preparation replaces direct download and saves the scene to the local library.
It persists per-part mapping scale and a geometry signature; exports regenerate the
same UVs deterministically. Both model and complete-package exports apply current
preparation. Geometry changes invalidate it conservatively across the scene, while
material-description edits do not. Missing/stale preparation is warned about in
Export. Cleaner sits immediately before Export in the header.

73 tests and production build pass. Added JSON roundtrip, saved mapping application,
material-edit stability and geometry invalidation coverage. Browser inspected the
two-column layout and checked generation, local save, reload and reopening Cleaner:
a fresh isolated cube retained zero missing UVs. An old test recovery initially hit
the existing optimistic-version guard; a fresh test scene saved normally.

Cleaner header refinement: title and broom icon now sit in the controls column;
the teal close button overlaps the outer top-right corner. Scrolling is contained
inside the columns so it does not clip the close button. Removed redundant
Model preparation subheading.

Cleaner now closes after a successful Save preparation; failed saves leave it open
with the error message. Export chooser uses the same offset circular close button.
