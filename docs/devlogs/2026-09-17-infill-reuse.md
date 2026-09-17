# Infill reuse and easier selection — 2026-09-17

Added contextual scene-wide All windows/doors and Similar size actions with target
counts, replacement explanation and one undo step. Similar means width AND height
within 20% of source. Opening type determines target category; copied infills retain
target geometry. Defaults, dimensions and material descriptions copy independently.

Added optional double-door gapWidth (metres), old-data fallback 0.01 m and scaling.
The effective gap caps at 80% width to keep leaves visible on small targets.
Organised infill controls into Fit & depth, Leaves/Frame & bars, Materials and Apply
accordions; advanced sections initially collapse.

Selection now tolerates 10px around opening outlines and displays a white hover
outline/name. Fixed an occlusion bug: decorative LineSegments were being treated
as solids and prevented opening selection. Only actual meshes block selection.

Checks: automated coverage for bulk targeting, independent copies, geometry
preservation, physical gap and scaling, legacy infills, and line-vs-mesh picking.
Isolated browser check selected an infilled window in Faces mode by clicking
just outside its outline and confirmed opening settings expand. Production scene
data untouched. See final reported test/build results for completed verification.

Verification completed: 44 tests pass; production build passes with the existing bundle-size warning.

Follow-up: applied the existing settings-check layout to the Double door control
so its checkbox and label align horizontally with consistent spacing.
