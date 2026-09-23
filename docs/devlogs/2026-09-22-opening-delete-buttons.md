# Per-opening delete buttons — 22 September 2026

Added a compact bin button beside each opening in the right-hand Walls & openings list. Its accessible label identifies the opening and wall. The adjacent opening-selection button remains separate, so deletion does not first change the selected opening. Only the clicked opening is removed; its ID is removed from multi-selection and any other selected openings remain selected. The existing scene update path supports Undo/Redo and removes derived infill/surround geometry with the opening.

Validation: 105 tests passed; production build passed (existing bundle-size warning). In the isolated browser test library, deleted a selected window, verified the door remained, then used Undo and verified both openings were restored. No production scene changed.
