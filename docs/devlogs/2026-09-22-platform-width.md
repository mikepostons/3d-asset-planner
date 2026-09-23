# Adjustable platform width — 22 September 2026

Each end platform now offers Full wall width (default) or a custom Platform width in metres. Custom platforms stay centred on the end wall. Deck, rails, braces, beams and supports use the same width. Rendering caps the width at the current wall length if the component is later reduced. Optional width is validated and scales with the component; old scenes retain full-width behaviour.

Validation: 113 tests passed, including centred deck bounds, scaling and invalid widths. Browser test on an isolated scene enabled a platform, switched from full width and set 3 m on a 6 m wall. Production build verification recorded below.

Production build passed with existing bundle warnings.
