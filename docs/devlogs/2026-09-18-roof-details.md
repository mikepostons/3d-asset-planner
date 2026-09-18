# Roof construction and trim — 18 September 2026

Added opt-in Roof construction & trim under Component Settings → Roof for
non-circular parts. Controls cover vertical roof thickness, shared side overhang,
independent end 1/end 2 overhang, fascia height/depth and gable ridge cap width/height.
End axes follow the ridge, or the lean-to slope axis. Existing roofs are unchanged
until enabled; disabling the roof suppresses its skin and trim.

`roof-details.ts` extracts upper triangles from the existing roof geometry, closes
an extruded skin, and adds perimeter fascia beams and a rectangular ridge strip.
Overhangs expand the footprint in local axes; custom convex footprints are scaled,
not offset by an exact distance normal to each edge. Rise stays unchanged. Fascia
and cap currently share the roof material. Circular caps continue to use stone
end bands. Roof trim is a blockout rather than detailed joined carpentry or tiles.
The new geometry is used by rendering, reference captures and surface occlusion.

Optional Part.roofDetails persists in scene JSON, manifest and prompt brief. All
physical settings scale with parts/module changes; validation rejects invalid
values. Added regression tests for gable/lean-to/flat roofs, ridge directions,
finite geometry, expanded bounds, round trips, scaling and disabled roofs.

Validation: all 65 tests passed; production build passed with existing bundle-size
warning. Interactive visual review has not yet been completed for this addition.

## Folded cap, fascia inset and gable infill
Replaced the rectangular ridge strip with two roof-surface-aligned wings clipped
from the actual upper roof triangles. Cap width spans both wings; cap thickness
is vertical. Fascia inset moves perimeter boards inward perpendicular to each edge.
Optional new fields preserve compatibility with previously saved roof settings.

Gables now default to wall-coloured infill, with shared settings or independent
end modes: hidden, extend wall, separate material description. Infill is sampled
against the roof underside at the original wall footprint and extruded inward by
wall thickness. These are derived closed infill meshes, not Boolean-merged walls;
separate-material infill uses a contrasting preview colour and retains its material
text in roofDetails exports. Ridge/hip endpoint edits are followed by the sampled
roof profile. Circular roofs are unchanged.

66 tests pass; build passes with existing bundle-size warning. Added tests for
both ridge axes, default gable closure, independent hidden/material modes,
validation and scaling. Interactive visual review of this revision remains pending.

## Separate fascia settings and ridge beam
Side and end fascia now have independent height, depth, inset and downward offset.
Missing overrides inherit existing fascia dimensions. Boards are closed vertical
prisms with their top edge at/below the roof underside, replacing rotated boxes
that overlapped the roof skin. Side/end classification follows the roof local axis.

Added an optional gable ridge beam with width, height, downward offset and independent
extensions beyond each roof ridge endpoint. Zero means no extension at that end.
The beam follows edited ridge endpoints and shares the roof preview material.
All new dimensions persist and scale. Optional fields keep old plans compatible.

67 tests pass and production build passes with the existing bundle-size warning.
Regression covers fascia underside bounds, both ridge axes, beam extension bounds,
round trips and scaling. Interactive visual review remains pending.

## Side fascia length offset
Side fascia settings now include a signed length offset in metres, applied at each
end along the board direction. Positive extends and negative shortens; zero retains
the roof-edge length. A shortening that consumes the entire length hides that board
rather than generating inverted geometry. End fascia dimensions are unaffected.
The optional lengthOffset defaults to zero, persists and scales with the part.
68 tests and the production build pass (existing bundle warning). Regression covers
extension bounds, scaling, excessive shortening and invalid values.
