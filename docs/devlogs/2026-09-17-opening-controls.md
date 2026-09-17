# Direct opening editing — 2026-09-17

Added canvas selection and wall-constrained movement of existing doors/windows.
A selected opening has a teal centre and eight amber bounding-box resize handles.
Circular windows keep equal width/height. Snapped relative deltas preserve existing
off-grid placement; nearby doors snap to the wall base. Invalid edits show a red
outline and are not committed. Existing numeric controls remain available.

Stage picking, preview and commit logic now supports editing as well as drawing.
The opening edit helper is pure and tested for grid snapping, fixed opposite
edges, circle dimensions and source immutability. No schema changes were needed.

Validation: 39 automated tests pass and production build passes (existing bundle
size warning). In the isolated ?test=1 browser scene, selected a nested window,
dragged its centre (offset 3.5 → 2.5 m), then dragged its side handle (width
2 → 3 m), verifying updated geometry and numeric settings. Production scene
data was not modified.

Limitations: still straight walls only; no transfer between walls. During drag,
the outline previews the result and the cut updates on release. Resize controls
use the opening bounding box, including arched and circular shapes.
