# 17 September 2026 — Subdivision preview

Implemented the agreed first stage: optional per-part subdivision settings and an amber body-surface guide overlay. Rectangles use local X/Y/Z subdivisions; cylinders and rings use around/height/radial counts. Taper and corner elevations are followed. Settings survive save/undo; guides live outside actual meshes and are excluded from image exports. UI identifies body-only patch estimates and the preview limitation.

Added the editable-mesh design covering schema, recovery snapshot, conversion transaction, topology validation, UV seams and a proposed export contract. Conversion is not exposed as a nonfunctional button.

Validation: 34 tests pass; production build passes with existing size warning. Added finite preview geometry, nonmutation, patch-count and persistence/validation tests. Browser check in isolated mode confirmed the Subdivisions accordion and amber guide overlay on a tapered donut. Roof surfaces and final triangulation are intentionally outside this preview.
