# Opening infills — 2026-09-17

Added optional Empty/Door/Window choices in each opening's Infill section.
Generated child entries remain attached to the opening rather than independently
movable scene parts. Door leaves have clearance, inset/thickness and a double
option. Window geometry includes frame, pane and size-based automatic bars or
manual horizontal/vertical counts (0–12). Bars are clipped to the opening shape.
Circular windows default to no bars. Door/frame/glass material descriptions
persist in existing opening export metadata.

Modules: infills.ts, openings validation/scaling, stage rendering, main controls,
SceneTree and regression tests. Existing openings stay empty without migration.
Nested selection returns to opening controls. Infills are closed, simplified
blockouts: no hinges, animation, hardware, textures or transparent glass. Solid
walls retain the existing recess backing; hollow walls are recommended for
windows. Frame width is proportionally reduced for very small openings to
preserve a visible pane.

Validation: 41 tests pass, including every opening shape with door/window,
finite bounded geometry, serialization, proportional scaling and invalid inputs.
Production build passes with existing bundle warning. In isolated ?test=1,
enabled a window infill and inspected the frame/pane/bars and new nested entry.
No production scene data changed.
