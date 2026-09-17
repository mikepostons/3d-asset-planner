# Perpendicular opening reveals — 2026-09-17

Fixed angled jambs caused by interpolating opening vertices across the shorter
mitered interior wall. Opening backs now use a constant inward normal offset;
inner wall boundaries and opening contours are triangulated separately. Exterior
opening positions and dimensions remain unchanged. No saved-data migration.

Validation: 40 automated tests pass, including all five opening shapes on all
four faces of a reshaped footprint, verifying every inner contour vertex lies
directly behind its exterior vertex. Production build passes with the existing
bundle-size warning. Loaded and inspected the selected hollow-wall window in
the isolated browser test scene; no production scene data changed.
