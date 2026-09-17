# 17 September 2026 — Material metadata

Added name/description fields for component bodies, enabled roofs and scene terrain. Exported plan preserves descriptions; brief and manifest expose active assignments. Disabled roofs retain their settings but do not advertise an active roof material. Terrain omitted from an export has no active terrain material.

Kept legacy combined materials intact as the body fallback instead of guessing a split. New structured fields are optional and validated. No UVs, textures or viewport colour changes are required; individual surface overrides remain the next stage.

Validation: all 35 tests and production build pass (existing bundle warning). Tests cover legacy fallback, serialization, metadata, brief output, disabled surfaces and invalid descriptions. Browser interaction was not reverified in this pass.
