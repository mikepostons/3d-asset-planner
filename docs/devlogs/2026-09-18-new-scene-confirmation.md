# New scene confirmation

The header New button now has a circled-plus icon. New always opens a confirmation
overlay naming the current scene, including when it has already been saved.
Cancel keeps the scene open; Continue skips saving (explicitly labelled Continue
without saving for dirty scenes); Save & continue saves before creating a blank scene.
Existing scenes save directly; new scenes use the existing name/project save dialog.
A failed save retains the current scene. Action buttons disable during saving/switching.

Validation: 73 tests and production build pass. In the isolated browser environment,
verified confirmation for a saved scene and Save & continue returning a blank scene
with a successful local-save message.

Header follow-up: Settings is an accessible icon-only cog with a tooltip, directly
after the scene name field. The existing settings action remains unchanged.

The circled-plus New action is now icon-only, directly before the scene name, with
a New scene tooltip and accessible label. Confirmation behaviour is unchanged.
