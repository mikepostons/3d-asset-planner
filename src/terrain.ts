import { type Plan, type Part, footprint, sceneStructures } from "./model";
export type Point = [number, number];
export type TerrainMode = "none" | "scene" | "collections";
export function hull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (ps: Point[]) => {
    const h: Point[] = [];
    for (const p of ps) {
      while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], p) <= 0)
        h.pop();
      h.push(p);
    }
    return h;
  };
  const lo = half(pts),
    hi = half([...pts].reverse());
  lo.pop();
  hi.pop();
  return [...lo, ...hi];
}
export function overlaps(a: Point[], b: Point[]): boolean {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        axis = [q[1] - p[1], p[0] - q[0]];
      const aa = a.map((v) => v[0] * axis[0] + v[1] * axis[1]),
        bb = b.map((v) => v[0] * axis[0] + v[1] * axis[1]);
      if (
        Math.max(...aa) < Math.min(...bb) - 0.001 ||
        Math.max(...bb) < Math.min(...aa) - 0.001
      )
        return false;
    }
  return true;
}
function outline(parts: Part[], margin: number): Point[] {
  const points: Point[] = [];
  for (const p of parts) {
    const r = (p.rotation * Math.PI) / 180;
    for (const [x, z] of footprint(p)) {
      const width =
        p.shape === "circle"
          ? Math.max(p.width, p.topDiameter ?? p.width)
          : p.width;
      const depth = p.shape === "circle" ? width : p.depth;
      const xx = p.x + x * width * Math.cos(r) + z * depth * Math.sin(r),
        zz = p.z - x * width * Math.sin(r) + z * depth * Math.cos(r);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        points.push([xx + Math.cos(a) * margin, zz + Math.sin(a) * margin]);
      }
    }
  }
  return hull(points);
}
export function terrainPatches(
  d: Plan,
  mode: TerrainMode = d.terrainLayout ?? "none",
  margin = d.terrainMargin ?? 1.5,
): { parts: string[]; outline: Point[] }[] {
  if (mode === "none" || !d.parts.length) return [];
  const buckets: Part[][] = [];
  if (mode === "scene") buckets.push(d.parts);
  else {
    for (const g of d.groups ?? []) {
      const members = d.parts.filter((p) => p.groupId === g.id);
      if (members.length) buckets.push(members);
    }
    for (const s of sceneStructures(d)) {
      const members = s.parts.filter((p) => !p.groupId);
      if (members.length) buckets.push(members);
    }
  }
  const patches = buckets.map((parts) => ({
    parts: parts.map((p) => p.id),
    outline: outline(parts, margin),
  }));
  // Fuse touching footprints, including cascaded contacts, so terrain never stacks.
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < patches.length; i++)
      for (let j = i + 1; j < patches.length; j++)
        if (overlaps(patches[i].outline, patches[j].outline)) {
          patches[i] = {
            parts: [...patches[i].parts, ...patches[j].parts],
            outline: hull([...patches[i].outline, ...patches[j].outline]),
          };
          patches.splice(j, 1);
          changed = true;
          break outer;
        }
  }
  return patches;
}
