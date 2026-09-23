# Foundation toggles and Cleaner status — 22 September 2026

Cleaner previously compared raw foundation settings, so disabled settings could differ from an absent setting despite producing identical meshes. Preparation now fingerprints effective generated foundations (including structure overrides and ground eligibility). Returning foundations to the prepared geometry restores current status. Real foundation geometry changes still invalidate preparation.

Existing mapping-version-5 records with raw foundation settings are compared through the same normalisation, so users need not re-clean merely to upgrade the key format. Older UV mapping versions remain stale intentionally. Status and exported UV application share the matching rule.

Validation: regression covers on/off restoration, inactive depth/margin edits, legacy keys and elevated parts without generated foundations. 116 tests passed. Build result recorded below. No production scene data modified.

Final verification: 116 tests and production build passed (existing bundle warnings).
