# Bump maps and stock library import — 22 September 2026

- Added grayscale bump/height upload and 0–5 strength control to material creation and editing. White is raised; shading only, no mesh displacement.
- Bump-only materials convert the height image into a tileable OpenGL normal image. Preview and GLB share the same normal texture. A supplied normal map takes precedence, explicitly explained in the form. Roughness remains independent.
- Optional bumpImage/bumpStrength fields preserve existing records. Six map slots, corresponding validation and 78 MB material request ceiling.
- Imported 21 stock sets into the real library at user request, globally available with category tags. Used OpenGL normals and matched base colour, AO (including misspelled source filenames), roughness, metallic and height maps. Both Concrete Wall 01 resolutions retained as separate entries.
- Original extracted images preserved; library images capped at 2048 pixels. Extraction SHA-256s and persisted maps verified before removing 21 ZIPs. STOCK/import-manifest.json records provenance and IDs. SQLite backup taken before import; no existing scene/material overwritten.
- Validation: 100 tests passed; production build passed (existing bundle-size warning). Browser creation form inspected in isolated test library. Unit checks cover normal direction, zero strength and bump validation.
- Limitations: no true displacement or normal+bump blending. Texture physical scale defaults to one metre per tile and needs artistic adjustment. Existing library API loads full material image records; a large library will benefit from separate thumbnail/image endpoints.
