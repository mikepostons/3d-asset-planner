import type { Plan, Part, MaterialDescription } from "./model";
export const materialText = (m?: MaterialDescription) =>
  [m?.name?.trim(), m?.description?.trim()].filter(Boolean).join(" — ") ||
  "unspecified";
export function bodyMaterial(p: Part): MaterialDescription {
  return p.bodyMaterial ?? { name: "", description: p.materials };
}
export function materialMetadata(d: Plan) {
  return {
    terrain: d.terrain === "none" ? null : (d.terrainMaterial ?? null),
    components: d.parts.map((p) => ({
      partId: p.id,
      body: bodyMaterial(p),
      roof: p.roofEnabled === false ? null : (p.roofMaterial ?? null),
    })),
  };
}
