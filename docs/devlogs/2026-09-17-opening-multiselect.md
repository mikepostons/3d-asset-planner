# Opening multi-selection and duplication — 2026-09-17

Shift-click toggles openings in the canvas and tree, scoped to one wall.
Every selected contour highlights and offers a move centre; resizing handles
hide for multi-selection. Dragging applies a common snapped delta and validates
all cuts together. Pointer release commits once; Escape cancels the preview.

Duplicate selected openings deep-copies infills, generates new IDs, finds a
valid shared offset and selects the copies. When no candidate fits, no document
change is made and a message asks for more wall space or fewer selected openings.
Deletion covers the selection, and undo/deletion removes stale selection IDs.

Numeric and infill fields continue to edit the active opening only. Different
walls and generic scene-part multi-selection are outside this increment.

Validation: 47 tests pass, including copy spacing, IDs/infills, full-wall failure,
and same-wall Shift toggling. Browser test in isolated ?test=1 duplicated a
window, confirmed a new nested entry, automatic copy selection, and preserved
infill. Production scene data untouched. Production build result recorded below.

Production build passes with the existing bundle-size warning.
