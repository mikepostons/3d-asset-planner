# 17 September 2026 — Whole-edge hover and dragging

Changed straight wall-edge hover detection from midpoint distance to projected segment distance. Horizontal/sloping top and base edges and vertical corner edges now receive a full-length teal pickable highlight in Edges mode. Dragging reuses existing edge transforms and undo/snapping; midpoint axis arrows remain for constrained adjustments. Endpoints use each corner's actual elevation.

Validation: all 32 existing automated tests and production build pass (existing bundle warning). Pointer interaction was not manually reverified in this pass. Circular diameter controls and existing roof ridge interaction are unchanged.
