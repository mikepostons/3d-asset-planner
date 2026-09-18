# Surface-aware UV preparation

Cleaner unwraps tagged circular walls, foundations and circular roof surfaces with
cylindrical coordinates. Inner and outer surfaces have separate radius profiles.
Tapered walls develop into conical sectors using slope/slant length; flat caps use
planar mapping. Triangle seam crossing is unwrapped locally. Other faces use an
orthonormal planar basis, preserving scale along roof slopes.

Checker density and checker wireframe controls are preview-only. Saved recipe keys
include mapping version 2, making earlier preparation stale until regenerated.
This remains tiling UV mapping: islands may overlap, no packed atlas or baking.
Conical sectors retain a seam and are not guaranteed to match a repeating pattern
across it. Decorative stones use planar face mapping, not the parent cylinder map.

81 tests and production build pass. Added cylinder circumference/height/seam tests,
cone slant-length checks, inclined planar edge-length checks and hollow-cylinder
inner/cap coverage. Browser generated cylinder UVs and visually inspected checker
preview; scale and continuity around the wall are consistent.
