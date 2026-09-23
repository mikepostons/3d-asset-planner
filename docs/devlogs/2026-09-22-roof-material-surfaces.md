# Roof material surfaces and stock batch 2 — 22 September 2026

Roof construction previously merged roof skin, fascia, ridge cap and beam into one material surface. The detailed builder now records triangle ranges and the stage splits these into named meshes: Roof, Side fascia, End fascia, Ridge cap, Ridge beam. They retain the same positions and total triangle count. Material Designer's existing surface picker and raycast selection can assign these independently, and exports keep them under Roof assembly. Existing Roof assignments continue to address the roof skin; newly separate details can now receive their own assignments.

Added a regression check for all five surface names, complete triangle preservation and normals. Validation: 102 tests passed; production build passed, with existing bundle-size warning. UI interaction not manually exercised for this change.

Stock batch: 20 archives, 17 unique materials (three duplicate downloads). Source files are verified against archive contents before archive removal. Added category tags and preserved original source images. Rocky Terrain EXR maps converted using Three's EXR decoder with linear values and row orientation preserved, then capped to 2048px PNG library maps. Original EXRs and Blender file retained; the unsupported specular map is retained as source rather than misassigned as metallic. A pre-import SQLite backup is retained locally. Manifest appends to the previous import rather than replacing it.

Continuous gable walls discussed but not implemented: a true continuous wall requires exterior contour reconstruction around openings and removal of the shared internal join. Separate gables remain useful for distinct cladding. Grouping meshes alone would not remove that join.
