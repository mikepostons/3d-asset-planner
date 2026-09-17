# Architectural details — 2026-09-17

First committed the preceding material/opening/infills/multi-selection work as
8045d2d at the user's request. No push was requested for this step.

Implemented the agreed first increment: jambs, straight lintels, cills/thresholds,
and quoins. Component defaults plus per-opening inherit/off/custom controls.
Shared projection, chamfer, gap, variation and seed; course height, jamb/quoin
width, lintel/cill height and overhang; surround/cill/quoin material descriptions.
Generated meshes follow the part's transform and openings. Seeded width variation
is stable under unrelated opening changes. Quoins alternate their lengths.

Thresholds adjust both the cut and attached infill by tracking applied lift.
Repeated reconciliation is idempotent; disabling restores the prior baseline.
Clear opening height is preserved, and wall-boundary validation rejects a lift
that cannot fit. Scaling updates physical dimensions and recorded lift.

Validation: 50 tests pass, including deterministic finite geometry, seed changes,
outward projection, reversible/idempotent thresholds, opening override disabling,
insufficient wall height, round trip, scaling and brief metadata. Production build
passes with existing bundle warning. Isolated browser test enabled surrounds and
quoins on the test main building and visually inspected the generated details.
Production scene library was untouched.

Limits: straight lintels only; arch/circle heads and keystones remain the next
increment. Arched jambs stop at the spring and circular openings have no trim.
Details are separate blockout meshes, not boolean-merged construction geometry.
Adjacent surrounds may overlap; per-opening settings provide manual correction.
Course count capped at 160 per vertical edge to bound geometry size. Variation
currently adjusts widths, while course heights remain regular for alignment.

## Independent cill size
Added optional cillWidthAdjustment (total added width, signed metres, centred on
opening) and cillProjection (outward depth from wall). Controls appear in Sizes
for component defaults and custom opening settings, allowing entrance thresholds
to be deeper/wider or narrower without changing lintels or jambs. Legacy values
inherit twice the former side overhang and the shared projection. Explicit values
scale with the component. Validation rejects cills narrowed to zero/negative width.
Regression checks cover actual geometry width/centre/depth, unchanged lintel depth,
scaling and invalid width.
