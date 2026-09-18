# Cleaner inspection and basic repair

Independent wireframe works with original or checker materials. Problem overlay
highlights geometric boundary/non-manifold edges and degenerate triangles in orange.
This is per-mesh inspection; legitimate boundaries between separate objects remain.

Repair removes zero-area and exact same-facing duplicate triangles, respecting
material groups and all vertex attributes. Compatible vertices are welded with a
small tolerance, preserving hard normals and UV seams. UV generation runs after
repair, followed by attribute-aware welding. No Boolean union, topology retessellation,
subdivision application or automatic face-orientation correction is performed.

Preview retains independent geometry snapshots for Reset (restores opening state).
Before/after counts and removal message explain changes. Repair invalidates preview
UV preparation until Generate UVs runs. Saved per-part repair flag reapplies the
operation during model/complete exports; export diagnostics are refreshed. Existing
saved repairs remain when resaving preparation. Source parametric parts are unchanged.

85 tests and build pass. Tests cover degenerate/duplicate removal, idempotence,
closed/open edge detection, sharp-edge preservation and saved repair execution.
Isolated browser checked wireframe with checker disabled, repair and reset.

Cleaner controls are grouped into Repair and UVs tabs. The preview, statistics,
wireframe toggle and save action are shared; switching tabs preserves preview state.
