# 17 September 2026 — Add primitives and reorganise controls

## Delivered

Added an Add tool with Cube, Cylinder and Donut choices. A translucent preview follows the pointer and a click places a new part on the ground or an existing surface. Placement returns to Faces selection; Escape cancels. Initial size follows the scene module.

Donut means a straight-sided hollow cylinder, not a rounded torus. Its geometry preserves an opening through both end caps. Height, outer diameter and inner diameter are editable with handles and numeric properties. Positive wall thickness is enforced; scaling and persistence preserve the bore. Undo/redo moved to the header; floor/terrain toggles are grouped next to 2D/3D.

## Implementation

Touched model, geometry, stage, main UI, shared icon/style files. Added optional version-1 `innerDiameter`, primitive defaults, preview lifecycle and annular mesh generation. Added `primitives.test.ts`. Existing solid cylinders and drawn footprints remain compatible.

## Verification

- All 30 automated tests pass, including primitive serialization, scaling, invalid bore rejection and ray tests through both hollow caps.
- TypeScript and production build pass; existing bundle-size warning remains.
- Isolated `?test=1` browser check: selected Donut, placed it, inspected the open bore and numeric properties, and dragged the inner handle from 1.5 m to 2 m. Verified header undo/redo and view-control layout visually.
- Full pointer/export regression was not repeated. No production scene was used for testing.

## Limitations

Rings are not tapered. Structure detection and terrain use outer footprints rather than the bore. Surface placement uses the picked height; fine placement can be adjusted afterward with Move or Base elevation.
