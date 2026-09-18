# Structural GLB export

Added Export 3D model in the header. The modal selects whole scene or current
component/structure/group, optional configured terrain and a centred base origin.
Downloads a ZIP containing GLB, source-plan JSON, geometry-report JSON and README.
Source scene remains editable and unchanged. Metres and Y-up are preserved.

Stage.modelExport rebuilds a temporary selected-part scene with X-ray and selection
styling disabled, copies independent mesh geometry/materials and synchronously
restores the editor. Terrain is regenerated for the exported part subset. Named
part nodes carry group IDs as metadata; groups are not yet extra glTF parent nodes.
model-export.ts filters editor line/sprite aids, shares matching preview material
slots, computes triangle/mesh/material/degenerate-face/missing-UV counts and encodes
binary glTF using Three.js GLTFExporter. Non-finite positions stop export.

This exports visible structural geometry, including openings, infills, roof details,
gables and stone dressing. No Boolean merging, UV generation, textures, colliders or
LODs yet. Material descriptions are placeholders; material slots still need a richer
surface identity system before Material Designer. Geometry warnings are diagnostic,
not a claim of exhaustive topology validation or game readiness.

Validation: 70 tests pass, including binary header/JSON checks, transform preservation,
mesh-only output, opaque materials and independent geometry ownership. Production
build passes with existing bundle warning. Isolated browser exported the five-part
test scene successfully: 153 meshes, 6,512 triangles, 15 materials. Blender/Unity
round-trip verification remains pending.
