# 17 September 2026 — Component accordions and optional roofs

Widened settings to 360 px and grouped part properties into Organisation/aspect, Dimensions, Position, Floors/walls, Elevation/rotation, Roof and Materials accordions. Properties scroll independently of the Duplicate/Delete footer.

Added optional `roofEnabled` with legacy default true. Disabling removes roof mesh and roof handles, excludes roof height from connection/snapping calculations, and updates exported brief intent. The body remains capped; retained roof parameters restore when enabled. Shared geometry ensures exported views use the same state.

Browser verification used the isolated test scene: inspected accordions/footer, expanded Roof, disabled a pitched roof and confirmed the plain solid body. Production build passes with the existing bundle warning. Automated tests include disabled-roof geometry, height, serialization and re-enabling. No real user scene was changed.
