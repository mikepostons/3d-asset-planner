# 17 September 2026 — Donut taper

Added independent bottom/top inner and outer diameters with four viewport handles and matching Component Settings. Height remains independently editable. Editing one end preserves the other, including older rings whose top dimensions were implicit.

The model adds optional `topInnerDiameter`; geometry connects annular end surfaces with tapered inner and outer walls. Validation keeps both openings positive and requires at least 0.1 m diameter difference at each end. Serialization, briefs, part/group scaling and module rescaling retain all four diameters. Existing solid cylinders and untapered rings remain compatible.

Validation: all 31 tests and production build pass (existing bundle-size warning). Added tapered-bore geometry, serialization, scaling and invalid-end checks. In the isolated browser, verified four handles/fields and dragged top outer diameter from 3 m to 5.5 m while bottom stayed 3 m. Full export-image regression was not repeated.

Structure/terrain contact still uses the outer base footprint rather than exact hollow geometry.
