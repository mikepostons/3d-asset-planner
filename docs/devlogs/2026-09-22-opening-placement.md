# Opening selection and precise placement — 22 September 2026

Separate end cladding now carries the editable-wall marker; face highlighting includes all wall/cladding meshes rather than only the masonry mesh. Opening picking accepts hits on that opening's own projecting infill/surround, while other components still occlude it normally. This addresses two selection obstacles; the exact user's drag symptom was not independently reproduced.

Added editor-only Opening snap in Walls & openings: 1, 2.5, 5, 10, 25 or 50 cm, default 5 cm. Drawing, moving, resizing and numeric field increments use it instead of the main building grid. Alt/Option temporarily uses 1 cm while dragging. Minimum opening size stays 10 cm. Status text shows precise offsets and snap spacing. Building-grid settings and scene data remain unchanged.

Validation: 108 tests passed and build passed (existing bundle warning). Regression checks cover fine valid end-wall moves versus coarse invalid ones, 1 cm resizing and picking through an opening's own surround while rejecting unrelated occluders. Inspected the new control/default/options in the isolated browser test scene. Opening bounds still stop at the eaves; placement into the triangular gable is not added here. Collision and wall-boundary validation remains active.

## Follow-up: small end-wall windows

Reproduced dragging a selected small window in a test-library copy of the saved engine house: Select mode successfully changed its position. Identified two interaction gaps: Move mode ignored opening picks, and first-click dragging an unselected opening only selected it. Both now start an opening drag. Selection is synchronised immediately so React's update does not cancel that first drag. Move mode offers only opening centre handles and suppresses the whole-part gizmo while openings are selected; it stays in Move after repositioning. Select retains resizing and Shift multi-selection. Fine snapping remains unchanged.

Browser verification on the isolated copy: dragging a previously unselected small end-wall window in Move changed its wall offset and base height without changing width/height or building dimensions. The production scene was not edited. Regression tests cover first-press drag state and preserving multi-selection in Move. 110 tests and production build passed (existing bundle warnings).
