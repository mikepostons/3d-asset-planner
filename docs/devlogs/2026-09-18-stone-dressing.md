# Stone clusters and end bands — 2026-09-18

Implemented both agreed stages in separate Component Settings accordions.

Clusters: component placement seed and finish/clearance defaults; cluster count
via Add/remove; per-cluster seed, requested stone count, spread (compactness),
size override and regenerate. Seeded patches avoid edges, openings, conservative
surround bounds and quoins. Stones wrap tapered cylinders/donuts on the outside
only. Incomplete placement reports actual/requested count. Existing candidate
positions remain stable on adding/editing other clusters; collisions are omitted
rather than relocated. Maximum 30 clusters, 60 requested stones each.

End bands: independent top/bottom toggles with shared dimensions/count/gap/seed/
variation/material, segmented rings and optional solid cylinder centre. Donut
bores remain open including coarse segment counts and taper. Top bands sit above
the end plane; bottom bands rise from the base. Bands currently have square edges.

Validation: 57 tests pass and production build passes with existing bundle warning.
Regression coverage includes deterministic/exclusion/spacing checks, independent
cluster addition, taper surface mapping, bore ray checks, cylinder-only solid
caps, persistence, scaling and metadata. Isolated browser test enabled a donut
top band and added a cluster, checking controls and ring rendering.
Production scene data untouched.

Limits: controls apply to individual component parts, not a whole multi-part
structure at once. Clusters are generated surface dressing, not individual
vertex-editable scene objects. Colliding patches may omit stones; other parts'
intersections are not excluded. Placement follows wall bodies, not roofs.
Explicit sparse defaults keep scenes responsive; large counts add mesh cost.

## Selected-face placement
Wired active Select → Faces wall selection into Add cluster. The button now names
the destination face and saves an optional face index per cluster, preserved on
regeneration and seed changes. Existing clusters retain automatic placement;
their new Placement face selector can target a specific wall.
This is the face-targeting fix only; the proposed connected-patch/largest-visible-
space placement algorithm is still pending. Regression checks cover all four
face restrictions, seed changes, round trip and invalid face indices.

## Exclude covered walls
Scene-aware placement now samples each stone against other components' actual
body/roof geometry after rotation/elevation transforms. Covered stones are skipped,
including contact with an extension, and restored/recalculated if that part moves.
Bounding boxes avoid unnecessary ray checks. This supersedes the earlier
other-part-intersections limitation. Sampling is conservative rather than exact
mesh Boolean intersection, so very thin obstructions between samples can be missed.
59 tests pass, including a fully covered wall and restoration after elevating
the blocker. Production build passes with existing bundle warning.

## Staggered row patches
Replaced independent point scattering with explicit two/three-course patterns:
1–2, 2–3, 2–3–2 and 3–2–3. Fixed row centres and half-stone staggering retain
restrained size variation without loose stones. Separate clusterSpacing keeps
patches apart. Seeded whole-patch candidates are scored for space from wall edges
and previous clusters; all stones must pass edge/opening/extension exclusions.
If a complete patch cannot fit, nothing is placed and a warning is shown.

The new Row pattern replaces count/spread controls. Legacy records derive a
pattern from count; their positions update under the new algorithm. Appending
clusters preserves earlier placements, while editing/removing earlier patches
can reposition later patches to maintain separation.

60 tests pass; production build passes with existing bundle warning. Added tests
for exact row counts, half-stone stagger and inter-cluster separation. Isolated
browser check confirmed legacy pattern and new spacing controls. No production
scene data edited.

## Mixed patch sizes
Replaced the large legacy-count fallback and fixed new-cluster default with seeded
mixed layouts: 50% 1–2, 25% 2–3, 15% 2–3–2, 10% 3–2–3. These are probabilities,
not guaranteed quotas for a small collection. Explicit fixed layouts stay fixed.
Added Mixed (mostly small) to Row pattern and Mix all cluster sizes for existing
clusters. This supersedes the count-derived migration described above. Shared
clusterLayout resolution keeps the UI and generated geometry consistent.

61 tests pass, including deterministic mixed layouts, legacy compatibility, fixed
overrides and distribution over 1,000 IDs. Production build passes with the existing
bundle-size warning.

## Cylinder and donut cluster refinement
Existing outer-wall placement now preserves physical stone widths at each course
on tapered cylinders/donuts, instead of stretching them using the middle radius.
Patch offsets, coverage samples and wraparound separation use local radii. Stones
remain on the outside; bore and caps are excluded. Width-fit checks use the local
stone height region so a narrow distant end does not reject otherwise valid patches.
Controls explicitly label Add outer-wall cluster and explain curved placement.

62 tests pass; production build passes (existing bundle-size warning). New tests
check actual geometry widths on strong tapers and inter-patch seam separation for
both cylinders and donuts. Isolated browser test confirmed adding a donut cluster
and updating its count. No production scene library changed.

## Cluster selection, positioning and deletion
Each cluster now has Select / reposition and Delete cluster controls; Delete all
clusters clears only the selected component's patches and is undoable through
normal scene history. Selection highlights its stones in teal (excluded from
reference exports). Position fields use metres on flat walls and degrees around
circular walls, plus centre height. Manual anchors persist and scale with parts.
Manual clusters are placed before automatic ones; automatic patches may relocate.
Moves that lose an existing patch or violate exclusions are rejected with a message.
Return to automatic placement removes the anchor. Canvas dragging is not included.

63 tests pass and production build passes with existing bundle warning. Regression
covers manual position persistence, scaling, seed independence and invalid edge
placement. Isolated browser verified selection and circular position controls.
