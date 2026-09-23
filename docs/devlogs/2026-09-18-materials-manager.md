# Shared Materials Manager

Material Designer opens a separate manager beside its title. The manager provides
search by name/keywords, thumbnail cards, project filtering and multi-project
availability (empty means all projects). Existing library entries are read as
version 1 with global availability; no destructive migration is needed.

Records accept base colour, OpenGL normal, grayscale roughness/metallic/AO images
and strengths. Uploads retain the existing resize/validation workflow. All maps share
tile scale and rotation; only base colour uses sRGB. Preview and GLB exports use
Three.js material slots, including AO on the primary UV channel.

Update material creates an immutable new revision in the same family. Save as copy
creates a new family. Saved-scene usage count is shown before updating; old assignments
remain pinned until manually reassigned. Project eligibility filters new choices
without hiding an already assigned material. Changing eligibility uses a new revision.

Designer uses searchable cards and model raycasting to select named surface categories.
A teal bounds highlight marks the selected category; dragging orbits without selecting.
Per-surface scene overrides cover scale, rotation and tint and are saved separately
from library records. The main editor now previews assigned materials (see preview fix below).

Validation: 93 tests and build pass. Added project/keyword filter, revision/usage,
scene override and multi-map colour-space/transform coverage. Isolated browser checked
creation, new revision, assignment and roof selection by clicking the preview.
Native multi-image picker and Blender/Unity multi-map roundtrip still require manual
verification. No production scenes were used.

Limitations: usage counts cover saved scenes, not unsaved tabs; directory keeps old
versions visible. There is no deletion or bulk version-adoption operation. Selection
is by component surface category, not individual triangles.


## Material preview fix

- Clicking a material thumbnail now applies it to the chosen surface immediately.
- Material Designer displays loading/error feedback and rejects obsolete preview results.
- Scene editor renders assigned materials using projection UVs on independent geometry copies. Material-only changes trigger refresh; X-ray stays translucent and reference captures rebuild untextured geometry.
- Pending scene texture loads are invalidated on rebuild/disposal; replaced texture resources are disposed.
- Validation: 95 tests pass and production build passes (existing bundle-size warning). Added regression coverage for scene appearance, unchanged bounds, and stale asynchronous loads. Browser test in isolated test library confirmed red material in Designer and main scene. Test recovery had an obsolete saved revision, so its save correctly reported a conflict; this was not a production scene edit.
