# Scene settings tabs

Split the scene settings modal into General (front and notes), Terrain, Foundations
and Export (version and validation guidance). All tabs share the existing draft,
so switching tabs preserves edits; Cancel discards them and Save applies them together.
Added consistent control/fieldset spacing and a separate scrolling content area.
Header, tabs and Save/Cancel footer stay visible. Opening settings resets to General.

Validation: 77 tests and production build pass. Isolated browser verified tab
switching and inspected Terrain at 1280×720: content scrolls while footer stays visible.
