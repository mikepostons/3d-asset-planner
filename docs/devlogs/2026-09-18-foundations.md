# Below-ground foundations

Scene Settings now offers foundation enablement, depth, outward margin and material
metadata. Individual connected structures can override defaults from component
Organisation & aspect / Structure foundation. Defaults remain off for old scenes.

Ground-level parts extend downwards without changing wall/opening/roof coordinates.
Polygon outlines retain their footprint; cylinders and donuts use their bottom
radii and preserve hollow centres. Elevated components are excluded. Geometry is
attached to each part as a named Foundation mesh, included independently of terrain
in reference renders, Cleaner and GLB exports. Selection exports resolve overrides
against the original scene before filtering. Geometry changes invalidate saved UVs.

Current limitation: connected foundation sections remain separate editable meshes
with internal overlapping faces; no Boolean union is performed. Ground eligibility
is the part base at or below zero, not a sampled game landscape. Large margins on
strongly concave custom footprints should be inspected for self-intersections.

Validation: 77 tests and production build pass. Tests cover default/off, elevated
exclusion, structure override, persistence validation, downward dimensions, margins,
hollow-centre preservation, finite UVs and preparation invalidation. Isolated browser
verified the scene controls and conditional depth/margin/material fields.
