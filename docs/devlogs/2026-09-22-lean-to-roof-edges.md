# Lean-to wall closure and roof-edge materials — 22 September 2026

Detailed lean-to roofs previously replaced the solid roof wedge with a skin without extending the walls to the underside. The wall-profile generator now extends all four lean-to walls to that skin, preserving opening cut-outs. Gable-specific cladding/hide controls remain limited to gabled buildings.

Roof edges are now a separate named material surface. Lean-to roofs expose it with or without detailing; detailed roofs also expose the thickness faces separately. Existing top/underside surfaces remain Roof. The shared surface splitter provides the same targets in the editor, Material Designer and exports; Roof edges belongs to the exported Roof assembly.

UV preparation revision is incremented because wall topology and material surfaces changed. Existing models should regenerate/save Cleaner UVs before assigning/exporting materials.

Validation: geometry tests cover all four lean-to slope directions, wall closure below the roof, retained opening holes, separate edge targets in both detailing modes, and the existing roof surface suite. See final verification below.

Final verification: 115 tests passed; production build passed with existing bundle warnings. Geometry verified by ray-intersection tests; browser interaction was not rechecked for this change.
