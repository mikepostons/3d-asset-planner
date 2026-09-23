# Texture visibility — 22 September 2026

Added a Textures toggle beside Floor guides. Enabled by default, this editor-only state switches between assigned materials and plain structural colours without modifying the Plan, material assignments, undo history or export material settings. Material Designer remains textured independently. X-ray continues to suppress materials while active.

Stage includes visibility in its rebuild key and skips material preview when disabled. Rebuild invalidates pending texture loads, preventing an older request from restoring textures after switching off.

Validation: 106 tests passed; production build passed with existing bundle-size warning. Regression test verifies skipped material application and restoration without assignment changes. Browser test verifies the toggle changes state without marking the saved test scene dirty.
