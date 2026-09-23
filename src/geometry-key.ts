/** Material descriptions are export metadata, not geometry or preview colours. */
export function geometryKey(value: unknown): string {
  return JSON.stringify(value, (key, item) =>
    key === "materialOverrides" || key === "materialAssignments" || key === "materials" || key === "material" || key.endsWith("Material")
      ? undefined
      : item,
  );
}
