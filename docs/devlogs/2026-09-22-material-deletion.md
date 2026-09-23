# Material deletion — 22 September 2026

Added Delete material to the editing sidebar. A confirmation fetches saved-scene usage and lists part/surface names, plus the current draft scene's assignments. Removing a version archives its library record; existing scene bindings and exports keep resolving it. Other versions remain available. Undo delete restores the most recently removed entry while the manager remains open.

The library API intentionally includes archived records for assignment resolution. Manager/search pickers exclude them, except a currently assigned material can remain visible in Designer. Removal changes no saved scene or optimistic scene version. This is library removal, not permanent disk reclamation.

Validation: browser check in the isolated test library covered confirmation, removal from grid and Undo restoration. Automated coverage verifies usage surfaces, unchanged saved assignments/version, archive/restore and missing-ID rejection. 98 tests pass; production build passes (existing bundle-size warning).
