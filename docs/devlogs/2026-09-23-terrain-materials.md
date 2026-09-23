# Terrain materials — 23 September 2026

Full-scene Material Designer now includes configured terrain. Deselect components before opening Materials; component-only scope remains unchanged. Existing Designer picking, assignment and placement/tint controls apply to each patch. Terrain geometry gets automatic world-XZ metre UVs, including the sloped perimeter, and needs no separate Cleaner preparation. Building preparation requirements remain.

Live previews traverse terrain as well as buildings. Export retains stable explicit terrain surface keys, so textures and per-surface overrides apply through the existing export material pipeline. Scene terrain uses a fixed key; separate patches use sorted member IDs. Moving/renaming members preserves identity; changing patch membership (including merging patches) creates a new target that must be assigned. Foundations remain independent building surfaces.

Validation recorded below. No production library data modified.

Verification: 119 tests passed, including separate terrain export bindings and live terrain preview preserving UVs. Production build passed with existing bundle warnings. Browser interaction not independently rechecked in this change.
