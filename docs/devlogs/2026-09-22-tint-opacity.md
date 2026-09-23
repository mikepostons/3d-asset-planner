# Tint opacity — 22 September 2026

Added a 0–100% Tint opacity slider alongside colour tint in the material creator/editor and Material Designer surface overrides. It blends the tint multiplier from neutral white to the chosen colour; it does not make geometry transparent. Optional `tintOpacity` defaults to 1 for older records/scene overrides. Values outside 0–1 are rejected. The common material application path supplies the blended colour to editor/Designer previews and GLB export.

The percentage responds while dragging; expensive preview rebuilding occurs on release or keyboard completion. Shared material defaults and surface overrides remain independent.

Validation: 112 tests passed, production build passed with existing bundle warnings. Tests cover neutral/half/full tint, opaque surfaces and invalid values. Isolated browser check confirmed the creator slider changes its percentage to 0% using the keyboard. Production library unchanged.
