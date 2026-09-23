export type TextureMaterial = {
  id: string;
  archived?: boolean;
  parentId?: string;
  familyId?: string;
  version?: number;
  keywords?: string[];
  projectIds?: string[];
  normalImage?: string;
  bumpImage?: string;
  bumpStrength?: number;
  roughnessImage?: string;
  metalnessImage?: string;
  aoImage?: string;
  normalStrength?: number;
  aoStrength?: number;
  metalness?: number;
  name: string;
  image?: string;
  kind?: "standard" | "glass";
  transparency?: number;
  reflection?: number;
  tint: string;
  tintOpacity?: number;
  roughness: number;
  scale: number;
  rotation: number;
  offsetX?: number;
  offsetY?: number;
};
export function validateTextureMaterial(m: TextureMaterial) {
  if (
    !m ||
    (m.kind !== undefined && !["standard","glass"].includes(m.kind)) ||
    typeof m.id !== "string" ||
    !/^[-\w]+$/.test(m.id) ||
    typeof m.name !== "string" ||
    !m.name.trim() ||
    m.name.length > 150 ||
    !/^#[0-9a-f]{6}$/i.test(m.tint) ||
    !Number.isFinite(m.roughness) ||
    m.roughness < 0 ||
    m.roughness > 1 ||
    !Number.isFinite(m.scale) ||
    m.scale <= 0 ||
    m.scale > 100 ||
    !Number.isFinite(m.rotation) ||
    (m.image !== undefined &&
      (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(m.image) ||
        m.image.length > 12_000_000))
  )
    throw Error("Invalid texture material.");
  for (const image of [
    m.normalImage,
    m.bumpImage,
    m.roughnessImage,
    m.metalnessImage,
    m.aoImage,
  ])
    if (
      image !== undefined &&
      (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) ||
        image.length > 12_000_000)
    )
      throw Error("Invalid texture map.");
  for (const values of [m.keywords, m.projectIds])
    if (
      values !== undefined &&
      (!Array.isArray(values) ||
        values.length > 100 ||
        values.some((v) => typeof v !== "string" || v.length > 150))
    )
      throw Error("Invalid keywords or projects.");
  for (const [value, max] of [
    [m.normalStrength, 5],
    [m.bumpStrength, 5],
    [m.aoStrength, 5],
    [m.metalness, 1],
    [m.tintOpacity, 1],
    [m.transparency, 1],
    [m.reflection, 1],
  ])
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0 || value > max!)
    )
      throw Error("Invalid material strength.");
  for (const value of [m.offsetX, m.offsetY])
    if (
      value !== undefined &&
      (!Number.isFinite(value) || Math.abs(value) > 1000)
    )
      throw Error("Invalid texture position.");
  return m;
}

export function materialMatches(
  m: TextureMaterial,
  query: string,
  projectId: string | null,
  all = false,
) {
  return (
    (all ||
      !m.projectIds?.length ||
      (!!projectId && m.projectIds.includes(projectId))) &&
    `${m.name} ${(m.keywords ?? []).join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase().trim())
  );
}
