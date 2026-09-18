# Material editing performance

Identified synchronous full Stage rebuild on each scene edit, plus two identical
cluster placement computations per render of StoneDressingControls. Material
strings are descriptive metadata and do not drive preview colours or geometry.

Added a geometry key that omits material metadata. Stage.update still receives the
latest plan but skips rebuilding when only those fields change. Selection, tool,
view/display settings and physical changes remain part of the key. The cluster
panel memoizes placement using a geometry key and reuses it for warnings.

Recovery storage writes now wait for a 500 ms edit pause instead of writing on
every keystroke or selection change. pagehide/hidden visibility flush the latest
plan. Explicit saving and scene dirty state remain immediate. An abrupt process
crash can lose the last half second of recovery changes.

69 tests and production build pass (existing bundle-size warning). Added regression
coverage for metadata reuse versus geometry/selection/display invalidation.
No live typing latency benchmark has yet been measured. Validation/history and
scene normalization still run on edits; those may warrant further profiling on
particularly large scenes. Render mesh materialDescription userData updates on the
next geometry rebuild; exported material metadata reads the current plan directly.
