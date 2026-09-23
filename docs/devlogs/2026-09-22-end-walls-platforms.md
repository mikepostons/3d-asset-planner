# Continuous end walls, cladding and platforms — 22 September 2026

## Delivered

Under Component Settings → Roof → Roof construction & trim (enable detailing), new End walls & gables and Balcony / platform sections provide:

- Continuous end walls to the roof, separate cladding, or no gable above the eaves. Ends may share settings or be configured independently.
- Separate cladding starts at the eaves or a decimal floor level: 0 = component base, 1 = one floor-height above it. It replaces the upper wall surface instead of overlaying duplicate faces. Separate named material surfaces for each end.
- Platforms independently enabled at either gable end, always spanning the full end-wall width as requested. Adjustable projection, decimal floor level and deck thickness. Width automatically follows the wall; no width/offset controls.
- One railing toggle generates wooden posts, horizontal rails and X braces along the three exposed sides. Adjustable railing height; separate optional posts down to the component base with configurable width. Rear side remains open toward the wall.
- Deck, railings, beams and supports are named material targets and grouped per platform in exports. They follow the parent part's position/rotation and scale.

## Geometry and data

`end-walls.ts` intersects roof triangles with the end-wall planes to derive exact profile breakpoints, samples the underside and removes collinear profile points. `openingBodyGeometry` accepts top contours and triangulates each complete wall around its openings, removing the former exterior eaves join rather than merely grouping meshes. Material cladding is split at a horizontal floor boundary without duplicate wall faces. Solid walls retain recessed openings; hollow walls retain through-openings and inner surfaces. Surfaces still contain triangles; this is not a quad remesher or a boolean union of the whole building.

`roofDetails` gains optional gableStartBaseFloor/gableEndBaseFloor and platformStart/platformEnd settings. Existing wall/material/hidden gable choices remain valid; “wall” now produces a continuous wall. Floor levels are dimensionless and unchanged during uniform scaling; dimensions scale in metres. Cleaner mapping version 4 invalidates preparation from the previous geometry. The portable plan and generated brief include the settings.

Modules: end-walls.ts, platforms.ts, EndWallControls.tsx, openings.ts, geometry.ts, stage.ts, roof-details.ts, model-export.ts and model-cleaner.ts.

## Validation

105 tests passed; production build passed with existing bundle-size warning. New tests cover both ridge directions, hollow/solid opening preservation, triangles spanning the former eaves join, independent cladding/hidden ends, cladding without overlapping masonry, finite platform geometry, round-trip validation and scaling. Browser checks used a saved scene in the isolated test library: inspected new controls, changed projection to 2 m, and toggled railings off/on.

## Limits

Currently for non-circular gable-roof parts with roof detailing enabled. Platform features are attached generated geometry, not independently movable scene parts. No stairs, automatic access doors or structural-load calculations. Supports end at the component base, not sampled terrain. Cladding uses the existing wall thickness; no individual boards or independent cladding thickness. Opening placement remains limited to the existing wall/eaves editing bounds, though existing openings below the eaves are preserved through the cladding. Roof intersections with other parts remain separate geometry. No complete building Boolean union or watertight-shell guarantee.
