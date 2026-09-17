export type Roof = "gable" | "lean-to" | "flat";
export type Part = {
  id: string;
  name: string;
  role: "main" | "extension";
  groupId?: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
  floors: number;
  floorHeight: number;
  roof: Roof;
  roofEnabled?: boolean;
  subdivisions?: { enabled: boolean; x: number; y: number; z: number };
  ridge: "width" | "depth";
  rise: number;
  highEdge: "front" | "back" | "left" | "right";
  materials: string;
  wallHeight?: number;
  footprint?: [number, number][];
  shape?: "rectangle" | "circle";
  topDiameter?: number;
  innerDiameter?: number;
  topInnerDiameter?: number;
  baseY?: number;
  cornerHeights?: number[];
  cornerBases?: number[];
  ridgeEnds?: [number, number, number][];
};
export type Plan = {
  schemaVersion: 1;
  id: string;
  name: string;
  units: "metres";
  moduleSize: number;
  subdivision: number;
  front: number;
  terrain: "full" | "minimal" | "none";
  notes: string;
  parts: Part[];
  groups?: { id: string; name: string; mainAspect?: number }[];
  structureNames?: Record<string, string>;
  structureAspects?: Record<string, number>;
  terrainLayout?: "none" | "scene" | "collections";
  terrainMargin?: number;
};
export const uid = () => globalThis.crypto.randomUUID();
export const clone = <T>(x: T): T => structuredClone(x);
export const snap = (n: number, step: number) => Math.round(n / step) * step;
export const height = (p: Part) => p.wallHeight ?? p.floors * p.floorHeight;
export function part(moduleSize = 3): Part {
  return {
    id: uid(),
    name: "Main part",
    role: "main",
    x: 0,
    z: 0,
    width: 9,
    depth: 6,
    rotation: 0,
    floors: 2,
    floorHeight: moduleSize,
    roof: "gable",
    ridge: "width",
    rise: 1.5,
    highEdge: "back",
    materials: "Mortared stone walls; slate roof",
  };
}
export function fresh(): Plan {
  return {
    schemaVersion: 1,
    id: uid(),
    name: "Untitled scene",
    units: "metres",
    moduleSize: 3,
    subdivision: 6,
    front: 0,
    terrain: "minimal",
    notes: "",
    parts: [],
  };
}
export function demo(): Plan {
  const d = fresh();
  d.name = "Workers cottage";
  let p = part();
  p.floors = 1;
  p.materials = "Limewashed stone walls; thatched roof";
  d.parts = [
    p,
    {
      ...part(),
      id: uid(),
      name: "Rear lean-to",
      role: "extension",
      x: 1.5,
      z: -4.5,
      width: 3,
      depth: 3,
      floors: 1,
      roof: "lean-to",
      rise: 1,
      floorHeight: 2.2,
      highEdge: "front",
      materials: "Timber boarding; slate roof",
    },
  ];
  return d;
}
export function resizeModule(d: Plan, size: number, rescale: boolean): Plan {
  let n = clone(d);
  if (rescale) {
    const r = size / n.moduleSize;
    for (const p of n.parts) {
      if (p.wallHeight !== undefined) p.wallHeight *= r;
      if (p.topDiameter !== undefined) p.topDiameter *= r;
      if (p.innerDiameter !== undefined) p.innerDiameter *= r;
      if (p.topInnerDiameter !== undefined) p.topInnerDiameter *= r;
      if (p.baseY !== undefined) p.baseY *= r;
      if (p.cornerBases) p.cornerBases = p.cornerBases.map((n) => n * r);
      if (p.cornerHeights) p.cornerHeights = p.cornerHeights.map((n) => n * r);
      if (p.ridgeEnds)
        p.ridgeEnds = p.ridgeEnds.map(([x, y, z]) => [x, y * r, z]);
      for (const k of [
        "x",
        "z",
        "width",
        "depth",
        "floorHeight",
        "rise",
      ] as const)
        p[k] *= r;
    }
  }
  n.moduleSize = size;
  return n;
}
export function bounds(p: Part) {
  const r = (p.rotation * Math.PI) / 180;
  const pts = footprint(p).map(([x, z]) => [
    p.x + x * p.width * Math.cos(r) + z * p.depth * Math.sin(r),
    p.z - x * p.width * Math.sin(r) + z * p.depth * Math.cos(r),
  ]);
  return {
    minX: Math.min(...pts.map((q) => q[0])),
    maxX: Math.max(...pts.map((q) => q[0])),
    minZ: Math.min(...pts.map((q) => q[1])),
    maxZ: Math.max(...pts.map((q) => q[1])),
  };
}
export function warnings(d: Plan): string[] {
  let out: string[] = [];
  if (!d.parts.length)
    return ["Draw at least one building part before exporting."];
  if (d.parts.length > 1 && d.parts.some((p) => p.roof !== "flat"))
    out.push(
      "Roof junctions are separate blockout volumes; inspect joins before modelling.",
    );
  return out;
}
export function validate(raw: unknown): Plan {
  const d = raw as Plan;
  const num = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const str = (v: unknown) => typeof v === "string" && v.length < 20000;
  if (!d || d.schemaVersion !== 1)
    throw Error("Unsupported plan version. Expected version 1.");
  if (
    d.units !== "metres" ||
    !str(d.name) ||
    !str(d.id) ||
    !str(d.notes) ||
    !num(d.moduleSize, 0.5, 20) ||
    ![1, 2, 4, 6].includes(d.subdivision) ||
    ![0, 90, 180, 270].includes(d.front) ||
    !["full", "minimal", "none"].includes(d.terrain) ||
    !Array.isArray(d.parts) ||
    d.parts.length > 100
  )
    throw Error("This file contains invalid plan settings.");
  if (
    d.groups !== undefined &&
    (!Array.isArray(d.groups) ||
      d.groups.length > 100 ||
      d.groups.some(
        (g) =>
          !g ||
          !str(g.id) ||
          !g.id ||
          !str(g.name) ||
          (g.mainAspect !== undefined && !num(g.mainAspect, 0, 359.99)),
      ) ||
      new Set(d.groups.map((g) => g.id)).size !== d.groups.length)
  )
    throw Error("Invalid scene groups.");
  if (
    d.structureNames !== undefined &&
    (!d.structureNames ||
      typeof d.structureNames !== "object" ||
      Array.isArray(d.structureNames) ||
      Object.values(d.structureNames).some((n) => !str(n)))
  )
    throw Error("Invalid structure names.");
  if (
    d.structureAspects !== undefined &&
    (!d.structureAspects ||
      typeof d.structureAspects !== "object" ||
      Array.isArray(d.structureAspects) ||
      Object.values(d.structureAspects).some((a) => !num(a, 0, 359.99)))
  )
    throw Error("Invalid structure aspects.");
  if (
    d.terrainLayout !== undefined &&
    !["none", "scene", "collections"].includes(d.terrainLayout)
  )
    throw Error("Invalid terrain layout.");
  if (d.terrainMargin !== undefined && !num(d.terrainMargin, 0.25, 30))
    throw Error("Invalid terrain margin.");
  let ids = new Set();
  for (const p of d.parts) {
    if (
      !p ||
      !str(p.id) ||
      ids.has(p.id) ||
      !str(p.name) ||
      (p.groupId !== undefined &&
        !(d.groups ?? []).some((g) => g.id === p.groupId)) ||
      !str(p.materials) ||
      !["main", "extension"].includes(p.role) ||
      !num(p.x, -1000, 1000) ||
      !num(p.z, -1000, 1000) ||
      !num(p.width, 0.1, 500) ||
      !num(p.depth, 0.1, 500) ||
      !num(p.floors, 0.1, 1000) ||
      !num(p.floorHeight, 0.5, 20) ||
      !num(p.rise, 0, 50) ||
      (p.wallHeight !== undefined && !num(p.wallHeight, 0.1, 500)) ||
      (p.footprint !== undefined && !validFootprint(p.footprint)) ||
      !num(p.rotation, 0, 360) ||
      (p.shape !== undefined && !["rectangle", "circle"].includes(p.shape)) ||
      (p.topDiameter !== undefined && !num(p.topDiameter, 0.1, 500)) ||
      (p.innerDiameter !== undefined &&
        (p.shape !== "circle" ||
          p.roof !== "flat" ||
          !num(p.innerDiameter, 0.1, p.width - 0.1) ||
          !num(
            p.topInnerDiameter ?? p.innerDiameter,
            0.1,
            (p.topDiameter ?? p.width) - 0.1,
          ))) ||
      (p.topInnerDiameter !== undefined && p.innerDiameter === undefined) ||
      (p.baseY !== undefined && !num(p.baseY, 0, 500)) ||
      (p.cornerHeights !== undefined &&
        (!Array.isArray(p.cornerHeights) ||
          p.cornerHeights.length !== 4 ||
          p.cornerHeights.some((n) => !num(n, 0.1, 500)))) ||
      (p.cornerBases !== undefined &&
        (!Array.isArray(p.cornerBases) ||
          p.cornerBases.length !== 4 ||
          p.cornerBases.some(
            (n, i) => !num(n, 0, (p.cornerHeights?.[i] ?? height(p)) - 0.1),
          ))) ||
      (p.ridgeEnds !== undefined &&
        (!Array.isArray(p.ridgeEnds) ||
          p.ridgeEnds.length !== 2 ||
          p.ridgeEnds.some(
            (q) =>
              !Array.isArray(q) ||
              q.length !== 3 ||
              !num(q[0], -5, 5) ||
              !num(q[1], 0, 50) ||
              !num(q[2], -5, 5),
          ))) ||
      (p.subdivisions !== undefined &&
        (!p.subdivisions ||
          typeof p.subdivisions.enabled !== "boolean" ||
          ![p.subdivisions.x, p.subdivisions.y, p.subdivisions.z].every(
            (n) => Number.isInteger(n) && n >= 1 && n <= 64,
          ) ||
          (p.shape === "circle" && p.subdivisions.x < 3))) ||
      (p.roofEnabled !== undefined && typeof p.roofEnabled !== "boolean") ||
      !["gable", "lean-to", "flat"].includes(p.roof) ||
      !["width", "depth"].includes(p.ridge) ||
      !["front", "back", "left", "right"].includes(p.highEdge)
    )
      throw Error("A building part has invalid dimensions or settings.");
    ids.add(p.id);
  }
  const migrated = clone(d);
  for (const g of migrated.groups ?? [])
    if (g.mainAspect !== undefined) g.mainAspect = snapAspect(g.mainAspect);
  if (migrated.structureAspects)
    for (const id of Object.keys(migrated.structureAspects))
      migrated.structureAspects[id] = snapAspect(migrated.structureAspects[id]);
  return migrated;
}
export const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "building";
export function brief(d: Plan): string {
  return `# ${d.name} — structural reference\n\nUse the mining-game-building-art skill. The attached plan and blockout renders are STRUCTURAL authority. Approved artwork references define style only. Preserve footprint, heights, roof directions and part placement. Do not interpret plain blockout colours as final materials.\n\nUnits: metres. Major cube: ${d.moduleSize} m. Front: ${d.front}° from world +Z toward +X. X/Z are ground; Y is up. Each part has its own base elevation; preserve roof-mounted parts. Terrain intent: ${d.terrain}. Terrain layout: ${d.terrainLayout ?? "none"}; footprint margin: ${d.terrainMargin ?? 1.5} m. Touching terrain patches are joined, never layered.\n\n## Scene organisation\n\n${sceneStructures(
    d,
  )
    .map(
      (c) =>
        `- ${c.name}: ${c.parts.map((p) => p.name).join(", ")}. Main aspect: ${mainAspect(d, "structure:" + c.id)}° from world +Z toward +X.`,
    )
    .join(
      "\n",
    )}\nGroups: ${JSON.stringify(d.groups ?? [])}. Part memberships: ${JSON.stringify(d.parts.map((p) => ({ part: p.id, group: p.groupId ?? null })))}\n\n## Locked parts\n\n${d.parts.map((p) => `- ${p.name} (${p.role}, ID ${p.id}): shape ${p.shape ?? "rectangle"}; base elevation ${p.baseY ?? 0} m; centre X ${p.x}, Z ${p.z}; width ${p.width} × depth ${p.depth} m; ${p.shape === "circle" ? `cylinder ${p.innerDiameter !== undefined ? `with open bore bottom diameter ${p.innerDiameter} m, top diameter ${p.topInnerDiameter ?? p.innerDiameter} m; ` : ""}bottom diameter ${p.width} m, top diameter ${p.topDiameter ?? p.width} m;` : ""} local rotation ${p.rotation}°; ${Number(estimatedFloors(p).toFixed(2))} estimated floors (floor height ${p.floorHeight} m); explicit eaves height ${height(p)} m; roof ${p.roofEnabled === false ? "disabled (plain capped volume)" : p.roof}, rise ${p.roofEnabled === false || p.roof === "flat" ? 0 : p.rise} m, ridge along local ${p.ridge}, lean-to high edge ${p.highEdge}. Ridge endpoints (normalised local X, metres above eaves, normalised local Z): ${JSON.stringify(ridgeEnds(p))}. Corner wall heights: ${JSON.stringify(p.cornerHeights ?? [])}; corner base heights: ${JSON.stringify(p.cornerBases ?? [])}. Footprint normalised local X/Z corners: ${JSON.stringify(footprint(p))}. Materials: ${p.materials || "unspecified"}.`).join("\n")}\n\n## Artistic guidance\n\n${d.notes || "Follow the approved project art direction."}\n\n## Unspecified details\n\nDoors, windows, surface wear and dressing may be unspecified. Circular parts can represent chimneys; preserve every modelled part. Infer them conservatively without changing the locked structural volumes. No new extensions. Roof intersections are unmerged blockout geometry, not construction drawings.\n\n## Review warnings\n\n${
    warnings(d)
      .map((x) => "- " + x)
      .join("\n") || "No structural warnings."
  }\n`;
}

export function footprint(p: Part): [number, number][] {
  if (p.shape === "circle")
    return Array.from({ length: 32 }, (_, i) => [
      Math.cos((i * Math.PI) / 16) * 0.5,
      Math.sin((i * Math.PI) / 16) * 0.5,
    ]);
  return (
    p.footprint ?? [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ]
  );
}
export function validFootprint(v: unknown): boolean {
  if (
    !Array.isArray(v) ||
    v.length !== 4 ||
    v.some(
      (q) =>
        !Array.isArray(q) ||
        q.length !== 2 ||
        q.some(
          (n) =>
            typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 5,
        ),
    )
  )
    return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = v[i],
      b = v[(i + 1) % 4],
      c = v[(i + 2) % 4];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross <= 0.0001) return false;
    sign += cross;
  }
  return sign > 0;
}
export function snapTo(
  value: number,
  step: number,
  targets: number[],
  tolerance = step * 0.25,
): { value: number; aligned: boolean } {
  const target = targets.reduce<number | undefined>(
    (best, n) =>
      Math.abs(n - value) <= tolerance &&
      (best === undefined || Math.abs(n - value) < Math.abs(best - value))
        ? n
        : best,
    undefined,
  );
  return target === undefined
    ? { value: snap(value, step), aligned: false }
    : { value: target, aligned: true };
}

export function polygonsTouch(a: Part, b: Part, tolerance = 0): boolean {
  const world = (p: Part) =>
    footprint(p).map(([x, z]) => {
      const r = (p.rotation * Math.PI) / 180;
      return [
        p.x + x * p.width * Math.cos(r) + z * p.depth * Math.sin(r),
        p.z - x * p.width * Math.sin(r) + z * p.depth * Math.cos(r),
      ];
    });
  const aa = world(a),
    bb = world(b);
  for (const poly of [aa, bb])
    for (let i = 0; i < poly.length; i++) {
      const q = poly[i],
        r = poly[(i + 1) % poly.length],
        len = Math.hypot(r[0] - q[0], r[1] - q[1]),
        nx = (r[1] - q[1]) / len,
        nz = (q[0] - r[0]) / len;
      const av = aa.map((v) => v[0] * nx + v[1] * nz),
        bv = bb.map((v) => v[0] * nx + v[1] * nz);
      if (
        Math.min(Math.max(...av), Math.max(...bv)) -
          Math.max(Math.min(...av), Math.min(...bv)) <
        -tolerance
      )
        return false;
    }
  return true;
}

export const baseY = (p: Part) => p.baseY ?? 0;
export function ridgeEnds(p: Part): [number, number, number][] {
  if (p.ridgeEnds) return p.ridgeEnds;
  const pts = footprint(p),
    axis = p.ridge === "width" ? 0 : 1,
    other = 1 - axis,
    values: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    if (a[other] === 0) values.push(a[axis]);
    if (a[other] * b[other] < 0) {
      const t = -a[other] / (b[other] - a[other]);
      values.push(a[axis] + t * (b[axis] - a[axis]));
    }
  }
  const lo = values.length ? Math.min(...values) : -0.5,
    hi = values.length ? Math.max(...values) : 0.5;
  return p.ridge === "width"
    ? [
        [lo, p.rise, 0],
        [hi, p.rise, 0],
      ]
    : [
        [0, p.rise, lo],
        [0, p.rise, hi],
      ];
}
export function insideFootprint(p: Part, x: number, z: number): boolean {
  const pts = footprint(p);
  return pts.every((a, i) => {
    const b = pts[(i + 1) % pts.length];
    return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) >= -1e-7;
  });
}
export const topY = (p: Part) =>
  baseY(p) +
  (p.roofEnabled === false
    ? Math.max(height(p), ...(p.cornerHeights ?? []))
    : Math.max(
        height(p) + (p.roof === "flat" ? 0.12 : p.rise),
        ...(p.cornerHeights ?? []).map(
          (y) => y + (p.roof === "flat" ? 0.12 : 0),
        ),
        ...(p.roof === "gable"
          ? ridgeEnds(p).map((q) => height(p) + q[1])
          : []),
      ));
export function partsTouch(a: Part, b: Part, tolerance = 0.02) {
  return (
    polygonsTouch(a, b, tolerance) &&
    baseY(a) <= topY(b) + tolerance &&
    baseY(b) <= topY(a) + tolerance
  );
}
export function floorLevels(p: Part, module: number): number[] {
  const result: number[] = [];
  for (
    let y = module;
    y <= Math.min(height(p), ...(p.cornerHeights ?? [height(p)])) + 0.01;
    y += module
  )
    result.push(baseY(p) + y);
  return result;
}

/** Scale local dimensions about the part's base centre, preserving placement. */
export function scalePart(source: Part, factor: number): Part {
  if (!Number.isFinite(factor) || factor <= 0)
    throw new Error("Scale must be greater than zero.");
  const p = clone(source);
  for (const key of ["width", "depth", "floorHeight", "rise"] as const)
    p[key] *= factor;
  if (p.wallHeight !== undefined) p.wallHeight *= factor;
  if (p.topDiameter !== undefined) p.topDiameter *= factor;
  if (p.innerDiameter !== undefined) p.innerDiameter *= factor;
  if (p.topInnerDiameter !== undefined) p.topInnerDiameter *= factor;
  if (p.cornerBases) p.cornerBases = p.cornerBases.map((y) => y * factor);
  if (p.cornerHeights) p.cornerHeights = p.cornerHeights.map((y) => y * factor);
  if (p.ridgeEnds)
    p.ridgeEnds = p.ridgeEnds.map(([x, y, z]) => [x, y * factor, z]);
  return p;
}

export function sceneStructures(
  d: Plan,
): { id: string; name: string; parts: Part[] }[] {
  const remaining = new Set(d.parts.map((p) => p.id));
  const result: { id: string; name: string; parts: Part[] }[] = [];
  for (const root of d.parts) {
    if (!remaining.delete(root.id)) continue;
    const parts = [root];
    for (let i = 0; i < parts.length; i++)
      for (const candidate of d.parts)
        if (remaining.has(candidate.id) && partsTouch(parts[i], candidate)) {
          remaining.delete(candidate.id);
          parts.push(candidate);
        }
    const id = [...parts.map((p) => p.id)].sort()[0];
    result.push({
      id,
      name:
        d.structureNames?.[id] ??
        (parts.length > 1 ? `${parts[0].name} structure` : parts[0].name),
      parts,
    });
  }
  return result;
}
export function selectedParts(d: Plan, selection: string | null): Part[] {
  if (!selection) return [];
  if (selection.startsWith("group:"))
    return d.parts.filter((p) => p.groupId === selection.slice(6));
  if (selection.startsWith("structure:"))
    return (
      sceneStructures(d).find((s) => s.id === selection.slice(10))?.parts ?? []
    );
  return d.parts.filter((p) => p.id === selection);
}
export function assignGroup(
  d: Plan,
  selection: string,
  groupId?: string,
): Plan {
  const next = clone(d);
  const ids = new Set(selectedParts(d, selection).map((p) => p.id));
  // A connected structure stays together when reparented.
  for (const s of sceneStructures(d))
    if (s.parts.some((p) => ids.has(p.id)))
      for (const p of s.parts) ids.add(p.id);
  for (const p of next.parts)
    if (ids.has(p.id)) {
      if (groupId) p.groupId = groupId;
      else delete p.groupId;
    }
  return next;
}

/** Keep connected components in one group when new geometry joins them. */
export function normaliseScene(d: Plan): Plan {
  const next = clone(d);
  for (const s of sceneStructures(next)) {
    const groupId = s.parts.find((p) => p.groupId)?.groupId;
    if (groupId) for (const p of s.parts) p.groupId = groupId;
  }
  return next;
}
export function translateSelection(
  d: Plan,
  selection: string,
  dx: number,
  dy: number,
  dz: number,
): Plan {
  const next = clone(d),
    ids = new Set(selectedParts(d, selection).map((p) => p.id));
  const members = next.parts.filter((p) => ids.has(p.id));
  const lift = Math.max(dy, -Math.min(...members.map(baseY)));
  for (const p of members) {
    p.x += dx;
    p.z += dz;
    p.baseY = baseY(p) + lift;
  }
  return next;
}

export const aspectDirections = [
  { value: 180, label: "North (−Z)" },
  { value: 135, label: "North-east" },
  { value: 90, label: "East (+X)" },
  { value: 45, label: "South-east" },
  { value: 0, label: "South (+Z)" },
  { value: 315, label: "South-west" },
  { value: 270, label: "West (−X)" },
  { value: 225, label: "North-west" },
];
export const snapAspect = (angle: number) =>
  (Math.round(angle / 45) * 45) % 360;
export function aspectOwner(d: Plan, selection: string | null): string | null {
  if (selection?.startsWith("group:")) return selection;
  const structure = sceneStructures(d).find(
    (s) =>
      selection === `structure:${s.id}` ||
      s.parts.some((p) => p.id === selection),
  );
  if (!structure) return null;
  return structure.parts[0].groupId
    ? `group:${structure.parts[0].groupId}`
    : `structure:${structure.id}`;
}
export function mainAspect(d: Plan, selection: string | null): number {
  const owner = aspectOwner(d, selection);
  if (owner?.startsWith("group:"))
    return snapAspect(
      d.groups?.find((g) => g.id === owner.slice(6))?.mainAspect ?? d.front,
    );
  if (owner?.startsWith("structure:"))
    return snapAspect(d.structureAspects?.[owner.slice(10)] ?? d.front);
  return d.front;
}

export function estimatedFloors(p: Part): number {
  return Math.max(height(p), ...(p.cornerHeights ?? [])) / p.floorHeight;
}
export function scaleSelection(
  d: Plan,
  selection: string,
  factor: number,
): Plan {
  const members = selectedParts(d, selection);
  if (!members.length) return clone(d);
  if (members.length === 1) {
    const next = clone(d);
    next.parts = next.parts.map((p) =>
      p.id === members[0].id ? scalePart(p, factor) : p,
    );
    return next;
  }
  const bs = members.map(bounds),
    cx =
      (Math.min(...bs.map((b) => b.minX)) +
        Math.max(...bs.map((b) => b.maxX))) /
      2,
    cz =
      (Math.min(...bs.map((b) => b.minZ)) +
        Math.max(...bs.map((b) => b.maxZ))) /
      2,
    cy = Math.min(...members.map(baseY));
  const ids = new Set(members.map((p) => p.id));
  const next = clone(d);
  next.parts = next.parts.map((p) => {
    if (!ids.has(p.id)) return p;
    const q = scalePart(p, factor);
    q.x = cx + (p.x - cx) * factor;
    q.z = cz + (p.z - cz) * factor;
    q.baseY = cy + (baseY(p) - cy) * factor;
    return q;
  });
  return next;
}

export type Primitive = "cube" | "cylinder" | "donut";
export function primitive(kind: Primitive, moduleSize: number): Part {
  const p = part(moduleSize);
  p.name = kind === "donut" ? "Donut" : kind === "cube" ? "Cube" : "Cylinder";
  p.width = p.depth = moduleSize;
  p.floors = 1;
  p.roof = "flat";
  p.rise = 0;
  p.materials = "";
  if (kind !== "cube") p.shape = "circle";
  if (kind === "donut") p.innerDiameter = moduleSize / 2;
  return p;
}
