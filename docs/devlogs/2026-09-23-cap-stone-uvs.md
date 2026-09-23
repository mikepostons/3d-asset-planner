# Cylinder and donut cap-stone UVs — 23 September 2026

End-band stones and solid caps now carry a cylinder-band UV hint. Cleaner wraps their curved outer/inner faces continuously around the component axis, rather than independently projecting each facet. Flat top/bottom faces and radial stone ends retain planar metre-scaled mapping. The hint survives the export hierarchy and is also used by material previews.

The mapping revision is now 6; regenerate and save UVs to use this mapping. This remains tiling UV mapping, not a packed baking atlas. A wrap seam is expected, as are intentional separate-stone gaps.

Regression test checks equal UVs at adjacent curved segments and matching physical U/V scale. Final verification below.

Verification: 117 tests and production build passed (existing bundle warnings). Visual checker result has not been independently rechecked in the browser.
