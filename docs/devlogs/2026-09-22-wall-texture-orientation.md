# Wall texture orientation — 22 September 2026

The wall builders emitted inward-facing exterior triangles, while convex gable infills used outward-facing triangles. Double-sided rendering concealed the geometric error. Normal-dependent projection UVs consequently mirrored the wall relative to the gable and tangent-space relief could look inverted.

Corrected polygon side/top winding and opening wall exterior, interior, reveal and cap winding, retaining the outward base skirt. No positions or opening sizes change. Bumped the preparation version so previously saved Cleaner results are marked stale and can be regenerated. Current preview mapping uses corrected geometry automatically.

Regression coverage checks outward normals and common metre-based UV coordinates on every exterior side of plain, hollow and opening-bearing walls and their gable infills. Validation: 101 tests passed and production build passed (existing bundle-size warning).

Users should regenerate and save Cleaner preparation before the next cleaned export. Deliberate per-surface scale/rotation/position overrides remain intact; these can still create differences across adjoining surfaces.
