# Material library layout and texture placement — 22 September 2026

## Delivered

- Manager opens as a full searchable grid with project filtering. Selecting a material opens a sliding editor; Create New switches to a dedicated creation form.
- Compact identity fields, map-upload tiles and accordion sections for source images, appearance, texture placement and project availability.
- Save/cancel remain visible below the scrolling form. Unsaved edits have a discard guard. Editing creates a new immutable version; existing scene assignments remain unchanged.
- Material Designer exposes metres-per-tile scale, horizontal/vertical position, rotation and tint. Numeric placement commits on blur/Enter so typing negative or decimal values does not reload textures mid-entry.
- Offsets use texture-repeat units and affect all five maps consistently. Shared material defaults and per-surface overrides both support signed offsets; absent offsets default to zero. Saved model exports use the same rendering pipeline.

## Validation

97 automated tests pass, including all-map offsets, per-surface override isolation, legacy defaults and invalid position rejection. Production build passes with the existing large-bundle warning. Isolated browser checks cover new material creation, persisted negative offsets, editing sidebar, discard guard, assignment inheritance and per-surface position editing. Visual check confirms independent scrolling and fixed save actions. No production library records were edited.

## Limits

Placement uses projected texture coordinates rather than a UV-island editor or direct drag-on-model manipulation. The existing material version history remains visible in the grid.

## Creation form width follow-up

Removed the 800px creation-form width cap. Creation now fills the modal, with identity/maps in the left column and appearance/placement/projects on the right. Below 850px it stacks into one column. Editing existing materials keeps its compact sidebar. Fixed footer actions remain visible. Verified the two-column form in the isolated browser; 97 tests and production build pass.
