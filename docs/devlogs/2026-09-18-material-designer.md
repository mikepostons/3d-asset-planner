# Material Designer MVP

Cleaner checkpoint committed as c41d2c1 before this work. Added Materials header action
for selection/full-scene independent preview; requires current saved Cleaner UVs.
A surface selector targets named roles (walls, roofs, foundation, detail types) per
component. Assign a library material, clear an assignment, or apply it to all shown
surfaces. Library records are immutable: editing fields then saving creates a copy.

Imports PNG/JPEG/WebP up to 12 MB, resized to at most 2048 pixels per dimension and
stored as PNG data in the local SQLite materials table. Controls cover tint, scalar
roughness, metre tile size and rotation. Colour maps are sRGB and repeat. Material
Designer previews materials; the structural editor remains in its blockout colours.
Save assignments saves the scene; library entries persist separately immediately.

Both GLB export paths apply assignments after saved UV/repair preparation and embed
colour textures. UV scale is converted back to metres so material size is independent
of Cleaner tile scale. Unassigned surfaces retain placeholders. Materials absent from
the local library fail export explicitly; irrelevant assignments outside the selected
export are ignored. Source JSON contains material IDs, not the library images; back up
the SQLite database when transferring editable projects. GLBs contain their images.

Tests: 89 pass and build passes (existing bundle warning). Isolated browser created a
material, assigned a texture fixture stored through the test API, saved the scene and
downloaded GLB. Inspected binary glTF JSON: one embedded image and one textured material.
Native file picker automation was unavailable; image-file picker import and Blender/Unity
roundtrip still need manual verification. No production scene/library was used.

Not included: normal/roughness image maps, alpha materials, AI generation, packed baking,
face-specific textured assignment, material deletion/edit-in-place, textured reference
images, or automatic Unity setup. Existing material descriptions remain independent.
