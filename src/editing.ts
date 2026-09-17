export type SelectionMode = "vertices" | "edges" | "faces";
export function canEditHandle(
  tool: string,
  mode: SelectionMode,
  kind: string,
): boolean {
  if (tool === "move") return kind === "move";
  if (tool === "rotate") return kind === "rotate";
  if (tool !== "select") return false;
  if (mode === "vertices")
    return kind.startsWith("vertex:") || kind.startsWith("ridge:");
  if (mode === "edges")
    return (
      kind.startsWith("edge:") ||
      kind.startsWith("vertical:") ||
      kind === "roof" ||
      kind.startsWith("radius-")
    );
  return (
    kind.startsWith("face:") ||
    kind === "height" ||
    kind === "roof" ||
    kind.startsWith("radius-")
  );
}
