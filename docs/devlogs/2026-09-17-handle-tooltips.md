# 17 September 2026 — Cursor handle tooltips

Replaced persistent donut diameter, move and rotation labels with a shared HTML tooltip. It appears only over a pickable handle, above/right of the cursor, with content-sized width and viewport-edge clamping. Axis handles include their axis name. The tooltip ignores pointer events and hides on pointer leave, drag start and scene rebuild. Floor guides and short axis markers retain their existing presentation.

Changed `stage.ts` and styles; no scene schema changes. All 32 tests and the production build pass; existing bundle warning remains. A browser recheck was attempted but the isolated tab had been closed, so hover positioning has not been visually reverified this turn.
