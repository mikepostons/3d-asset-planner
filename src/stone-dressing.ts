import { partGeometry } from "./geometry";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Part } from "./model";
import { wallFrame } from "./openings";
import { openingDetails } from "./architectural-details";
export type StoneCluster = {
  position?: { u: number; y: number; face: number };
  layout?: "auto" | "1-2" | "2-3" | "2-3-2" | "3-2-3";
  face?: number;
  id: string;
  seed: number;
  count: number;
  spread: number;
  size?: number;
};
export type StoneClusters = {
  clusterSpacing?: number;
  enabled: boolean;
  seed: number;
  size: number;
  variation: number;
  projection: number;
  gap: number;
  chamfer: number;
  clearance: number;
  material: string;
  clusters: StoneCluster[];
};
export type StoneBands = {
  top: boolean;
  bottom: boolean;
  height: number;
  overhang: number;
  count: number;
  gap: number;
  variation: number;
  seed: number;
  solidCap: boolean;
  material: string;
};
export const defaultClusters = (): StoneClusters => ({
  enabled: true,
  clusterSpacing: 0.6,
  seed: 1,
  size: 0.3,
  variation: 0.25,
  projection: 0.06,
  gap: 0.025,
  chamfer: 0.02,
  clearance: 0.25,
  material: "Exposed stone",
  clusters: [],
});
export const defaultBands = (): StoneBands => ({
  top: false,
  bottom: false,
  height: 0.2,
  overhang: 0.1,
  count: 16,
  gap: 0.02,
  variation: 0.08,
  seed: 1,
  solidCap: false,
  material: "Dressed cap stone",
});
/** Mixed patches favour small accents; fixed patterns remain explicit overrides. */
export function clusterLayout(config: Pick<StoneClusters, "seed">, cluster: StoneCluster): "1-2" | "2-3" | "2-3-2" | "3-2-3" {
  if (cluster.layout && cluster.layout !== "auto") return cluster.layout;
  const roll = rng(config.seed, `layout:${cluster.id}:${cluster.seed}`)();
  return roll < 0.5 ? "1-2" : roll < 0.75 ? "2-3" : roll < 0.9 ? "2-3-2" : "3-2-3";
}

function rng(seed: number, key: string) {
  let n = seed | 0;
  for (let i = 0; i < key.length; i++)
    n = Math.imul(n ^ key.charCodeAt(i), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function validateDressing(p: Part) {
  const s = p.stoneClusters,
    b = p.stoneBands;
  const num = (x: unknown, min: number, max: number) =>
    typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
  const seed = (x: unknown) => num(x, 0, 2147483647) && Number.isInteger(x);
  if (s) {
    if (s.clusterSpacing !== undefined && !num(s.clusterSpacing, 0, 10))
      throw Error("Invalid cluster spacing.");
    if (
      typeof s.enabled !== "boolean" ||
      !seed(s.seed) ||
      typeof s.material !== "string" ||
      !num(s.size, 0.03, 5) ||
      !num(s.variation, 0, 0.7) ||
      !num(s.projection, 0.005, 2) ||
      !num(s.gap, 0, 2) ||
      !num(s.chamfer, 0, 1) ||
      !num(s.clearance, 0, 5) ||
      !Array.isArray(s.clusters) ||
      s.clusters.length > 30
    )
      throw Error("Invalid stone cluster settings.");
    const ids = new Set<string>();
    for (const c of s.clusters) {
      if (
        (c.position !== undefined && (!num(c.position.u, 0, 100000) || !num(c.position.y, 0, 100000) || !Number.isInteger(c.position.face) || !num(c.position.face, 0, 3))) ||
        (c.face !== undefined &&
          (!Number.isInteger(c.face) || c.face < 0 || c.face > 3)) ||
        (c.layout !== undefined &&
          !["auto", "1-2", "2-3", "2-3-2", "3-2-3"].includes(c.layout)) ||
        typeof c.id !== "string" ||
        ids.has(c.id) ||
        !seed(c.seed) ||
        !Number.isInteger(c.count) ||
        !num(c.count, 1, 60) ||
        !num(c.spread, 0.1, 10) ||
        (c.size !== undefined && !num(c.size, 0.03, 5))
      )
        throw Error("Invalid stone cluster.");
      ids.add(c.id);
    }
  }
  if (
    b &&
    (typeof b.top !== "boolean" ||
      typeof b.bottom !== "boolean" ||
      typeof b.solidCap !== "boolean" ||
      typeof b.material !== "string" ||
      !seed(b.seed) ||
      !num(b.height, 0.02, 5) ||
      !num(b.overhang, 0, 5) ||
      !num(b.count, 4, 96) ||
      !Number.isInteger(b.count) ||
      !num(b.gap, 0, 1) ||
      !num(b.variation, 0, 0.5))
  )
    throw Error("Invalid stone band settings.");
}
export function scaleDressing(p: Part, r: number) {
  const s = p.stoneClusters,
    b = p.stoneBands;
  if (s) {
    if (s.clusterSpacing !== undefined) s.clusterSpacing *= r;
    for (const k of [
      "size",
      "projection",
      "gap",
      "chamfer",
      "clearance",
    ] as const)
      s[k] *= r;
    for (const c of s.clusters) {
      c.spread *= r;
      if (c.position) { c.position.u *= r; c.position.y *= r; }
      if (c.size !== undefined) c.size *= r;
    }
  }
  if (b) {
    b.height *= r;
    b.overhang *= r;
    b.gap *= r;
  }
}
export type PlacedStone = {
  clusterId: string;
  face: number;
  u: number;
  y: number;
  width: number;
  height: number;
  projection: number;
};
function outerRadius(p: Part, y: number) {
  const h = p.wallHeight ?? p.floors * p.floorHeight;
  return T.MathUtils.lerp(p.width / 2, (p.topDiameter ?? p.width) / 2, y / h);
}
export function clusterPlacements(p: Part, sceneParts: Part[] = []) {
  const s = p.stoneClusters,
    stones: PlacedStone[] = [],
    warnings: string[] = [];
  const anchors: Record<string, {u:number; y:number; face:number}> = {};
  if (!s?.enabled) return { stones, warnings, anchors };
  // Use actual body/roof geometry, so elevation, rotation, roofs and bores
  // participate in contact checks rather than just footprint overlap.
  const blockers = sceneParts
    .filter((q) => q.id !== p.id)
    .flatMap((q) => {
      return [false, ...(q.roofEnabled === false ? [] : [true])].map((roof) => {
        const geometry = partGeometry(q, roof);
        const mesh = new T.Mesh(
          geometry,
          new T.MeshBasicMaterial({ side: T.DoubleSide }),
        );
        mesh.position.set(q.x, q.baseY ?? 0, q.z);
        mesh.rotation.y = (q.rotation * Math.PI) / 180;
        mesh.updateMatrixWorld(true);
        return { mesh, box: new T.Box3().setFromObject(mesh) };
      });
    });
  const direction = new T.Vector3(1, 0.173, 0.317).normalize();
  const hidden = (point: T.Vector3) =>
    blockers.some(({ mesh, box }) => {
      if (!box.containsPoint(point)) return false;
      const hits = new T.Raycaster(point, direction, 1e-6).intersectObject(
        mesh,
      );
      const distances: number[] = [];
      for (const hit of hits)
        if (
          !distances.length ||
          Math.abs(hit.distance - distances[distances.length - 1]) > 1e-5
        )
          distances.push(hit.distance);
      return distances.length % 2 === 1;
    });
  const h = p.wallHeight ?? p.floors * p.floorHeight,
    circle = p.shape === "circle";
  const radius = (p.width + (p.topDiameter ?? p.width)) / 4,
    circumference = 2 * Math.PI * radius;
  const faces = circle
    ? []
    : Array.from({ length: 4 }, (_, i) => wallFrame(p, i));
  const bands = p.stoneBands;
  const fits = (stone: PlacedStone) => {
    const { face, u, y, width: w, height: sh } = stone;
    const f = faces[face],
      length = circle ? circumference : f.length;
    const half = w / 2,
      hh = sh / 2,
      clear = s.clearance;
    if (circle) {
      if (
        y - hh < clear + (bands?.bottom ? bands.height : 0) ||
        y + hh > h - clear - (bands?.top ? bands.height : 0)
      )
        return false;
      const minR = Math.min(outerRadius(p, y - hh), outerRadius(p, y + hh));
      if (w > (Math.PI * minR) / 3) return false;
    } else {
      const quoin =
        p.architecturalDetails?.enabled && p.architecturalDetails.quoins
          ? p.architecturalDetails.quoinWidth *
            (1 + p.architecturalDetails.variation)
          : 0;
      if (u - half < clear + quoin || u + half > length - clear - quoin)
        return false;
      const base = Math.max(
        T.MathUtils.lerp(f.baseA, f.baseB, (u - half) / length),
        T.MathUtils.lerp(f.baseA, f.baseB, (u + half) / length),
      );
      const top = Math.min(
        T.MathUtils.lerp(f.topA, f.topB, (u - half) / length),
        T.MathUtils.lerp(f.topA, f.topB, (u + half) / length),
      );
      if (y - hh < base + clear || y + hh > top - clear) return false;
      if (
        (p.openings ?? []).some((o) => {
          if (o.face !== face) return false;
          const d = openingDetails(p, o),
            pad = d?.enabled
              ? Math.max(
                  d.jambWidth * (1 + d.variation),
                  d.overhang,
                  (d.cillWidthAdjustment ?? 0) / 2,
                  d.archWidth ?? d.jambWidth,
                ) + (d.keystones ? (d.keystoneExtra ?? 0.08) : 0)
              : 0;
          const up = d?.enabled
            ? Math.max(d.lintelHeight, d.archWidth ?? d.jambWidth) +
              (d.keystones ? (d.keystoneExtra ?? 0.08) : 0)
            : 0;
          const down = d?.enabled && d.cills ? d.cillHeight : 0;
          return (
            u + half + clear > o.x - pad &&
            u - half - clear < o.x + o.width + pad &&
            y + hh + clear > o.y - down &&
            y - hh - clear < o.y + o.height + up
          );
        })
      )
        return false;
    }
    if (blockers.length) {
      let covered = false;
      for (const du of [-half, 0, half])
        for (const dy of [-hh, 0, hh])
          for (const out of [0.002, s.projection]) {
            const sy = y + dy,
              su = u + (circle ? du * radius / outerRadius(p, y) : du);
            const point = circle
              ? new T.Vector3(
                  (T.MathUtils.lerp(
                    p.width / 2,
                    (p.topDiameter ?? p.width) / 2,
                    sy / h,
                  ) +
                    out) *
                    Math.cos(su / radius),
                  sy,
                  (T.MathUtils.lerp(
                    p.width / 2,
                    (p.topDiameter ?? p.width) / 2,
                    sy / h,
                  ) +
                    out) *
                    Math.sin(su / radius),
                )
              : f.point(su, sy, -out);
            point
              .applyAxisAngle(
                new T.Vector3(0, 1, 0),
                (p.rotation * Math.PI) / 180,
              )
              .add(new T.Vector3(p.x, p.baseY ?? 0, p.z));
            if (hidden(point)) covered = true;
          }
      if (covered) return false;
    }

    return true;
  };
  const spacing = s.clusterSpacing ?? 0.6;
  for (const c of [...s.clusters].sort((a,b) => Number(!!b.position) - Number(!!a.position))) {
    const random = rng(s.seed, c.id + ":" + c.seed);
    const rows = clusterLayout(s, c).split("-").map(Number);
    const size = c.size ?? s.size,
      pitch = size + s.gap,
      rowHeight = size * 0.65;
    const local: PlacedStone[] = [];
    rows.forEach((count, row) => {
      for (let column = 0; column < count; column++)
        local.push({
          clusterId: c.id,
          face: 0,
          u: (column - (count - 1) / 2) * pitch,
          y: (row - (rows.length - 1) / 2) * (rowHeight + s.gap),
          width: size * (1 - s.variation * random() * 0.35),
          height: rowHeight * (1 - s.variation * random() * 0.2),
          projection:
            s.projection * (1 + s.variation * (random() * 2 - 1) * 0.4),
        });
    });
    let best: PlacedStone[] | undefined,
      bestScore = -Infinity;
    let bestAnchor: {u:number; y:number; face:number} | undefined;
    for (let attempt = 0; attempt < (c.position ? 1 : 160); attempt++) {
      const face = circle ? 0 : (c.position?.face ?? c.face ?? Math.floor(random() * 4)),
        f = faces[face];
      const length = circle ? circumference : f.length;
      const base = circle ? 0 : Math.min(f.baseA, f.baseB),
        top = circle ? h : Math.max(f.topA, f.topB);
      const u = c.position?.u ?? random() * length,
        y = c.position?.y ?? base + random() * (top - base);
      const patch = local.map((q) => ({
        ...q,
        face,
        u: circle ? (((u + q.u * radius / outerRadius(p, y + q.y)) % length) + length) % length : u + q.u,
        y: y + q.y,
      }));
      let score = Math.min(
        y - base,
        top - y,
        circle ? Infinity : u,
        circle ? Infinity : length - u,
      );
      let clash = false;
      for (const q of patch) {
        for (const other of stones) {
          if (other.face !== face) continue;
          let du = Math.abs(q.u - other.u);
          if (circle) du = Math.min(du, length - du) * Math.min(outerRadius(p, q.y), outerRadius(p, other.y)) / radius;
          const dx = du - (q.width + other.width) / 2,
            dy = Math.abs(q.y - other.y) - (q.height + other.height) / 2;
          if (dx < spacing && dy < spacing) {
            clash = true;
            break;
          }
          score = Math.min(score, Math.hypot(Math.max(0, dx), Math.max(0, dy)));
        }
        if (clash) break;
      }
      if (clash || score <= bestScore || !patch.every(fits)) continue;
      best = patch;
      bestAnchor = {u,y,face};
      bestScore = score;
    }
    if (best) { stones.push(...best); anchors[c.id] = bestAnchor!; }
    else
      warnings.push(
        "Cluster " +
          (s.clusters.indexOf(c) + 1) +
          ": no clear space for the complete " +
          rows.join("–") +
          " patch.",
      );
  }
  blockers.forEach(({ mesh }) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  return { stones, warnings, anchors };
}
export function dressingGeometry(p: Part, sceneParts: Part[] = []) {
  const result: {
    geometry: T.BufferGeometry;
    clusterId?: string;
    name: string;
    material: string;
  }[] = [];
  const s = p.stoneClusters,
    h = p.wallHeight ?? p.floors * p.floorHeight;
  const radius = (p.width + (p.topDiameter ?? p.width)) / 4;
  for (const stone of clusterPlacements(p, sceneParts).stones) {
    const depth = stone.projection + 0.025;
    const geometry = new RoundedBoxGeometry(
      stone.width,
      stone.height,
      depth,
      2,
      Math.min(s!.chamfer, depth / 3, stone.height / 5, stone.width / 5),
    );
    const a = geometry.getAttribute("position"),
      frame = p.shape === "circle" ? null : wallFrame(p, stone.face);
    for (let i = 0; i < a.count; i++) {
      const u = stone.u + a.getX(i) * (frame ? 1 : radius / outerRadius(p, stone.y)),
        y = stone.y + a.getY(i),
        out = stone.projection / 2 + a.getZ(i);
      const q = frame
        ? frame.point(u, y, -out)
        : new T.Vector3(
            (T.MathUtils.lerp(
              p.width / 2,
              (p.topDiameter ?? p.width) / 2,
              y / h,
            ) +
              out) *
              Math.cos(u / radius),
            y,
            (T.MathUtils.lerp(
              p.width / 2,
              (p.topDiameter ?? p.width) / 2,
              y / h,
            ) +
              out) *
              Math.sin(u / radius),
          );
      a.setXYZ(i, q.x, q.y, q.z);
    }
    geometry.computeVertexNormals();
    result.push({ geometry, clusterId: stone.clusterId, name: "Cluster stone", material: s!.material });
  }
  const b = p.stoneBands;
  if (p.shape === "circle" && b) {
    for (const top of [false, true]) {
      if (!(top ? b.top : b.bottom)) continue;
      const outer =
        (top ? (p.topDiameter ?? p.width) : p.width) / 2 + b.overhang;
      const bore =
        p.innerDiameter === undefined
          ? null
          : top
            ? (p.topInnerDiameter ?? p.innerDiameter) / 2
            : Math.max(
                p.innerDiameter / 2,
                T.MathUtils.lerp(
                  p.innerDiameter / 2,
                  (p.topInnerDiameter ?? p.innerDiameter) / 2,
                  Math.min(1, b.height / h),
                ),
              );
      const segments = Math.max(4, Math.ceil(32 / b.count));
      // Correct chord sag so even coarse, rotated segments never obstruct a bore.
      const inner =
        bore === null
          ? Math.max(0.02, outer - Math.max(0.12, b.height))
          : bore / Math.cos(Math.PI / b.count / segments);
      const base = top ? h : 0;
      const random = rng(b.seed, top ? "top" : "bottom");
      for (let i = 0; i < b.count; i++) {
        const angle = (i * 2 * Math.PI) / b.count,
          span = (2 * Math.PI) / b.count;
        const trim = Math.min(span * 0.2, b.gap / (2 * Math.max(inner, 0.05)));
        const out = Math.max(
          inner + 0.02,
          outer * (1 + b.variation * (random() * 2 - 1) * 0.03),
        );
        const positions: number[] = [];
        const pt = (r: number, a: number, y: number) => [
          r * Math.cos(a),
          y,
          r * Math.sin(a),
        ];
        const quad = (a: number[], c: number[], d: number[], e: number[]) =>
          positions.push(...a, ...c, ...d, ...a, ...d, ...e);
        for (let j = 0; j < segments; j++) {
          const a = angle + trim + ((span - 2 * trim) * j) / segments,
            z = angle + trim + ((span - 2 * trim) * (j + 1)) / segments;
          quad(
            pt(inner, a, base),
            pt(out, a, base),
            pt(out, z, base),
            pt(inner, z, base),
          );
          quad(
            pt(inner, a, base + b.height),
            pt(inner, z, base + b.height),
            pt(out, z, base + b.height),
            pt(out, a, base + b.height),
          );
          quad(
            pt(out, a, base),
            pt(out, a, base + b.height),
            pt(out, z, base + b.height),
            pt(out, z, base),
          );
          quad(
            pt(inner, a, base),
            pt(inner, z, base),
            pt(inner, z, base + b.height),
            pt(inner, a, base + b.height),
          );
        }
        for (const a of [angle + trim, angle + span - trim])
          quad(
            pt(inner, a, base),
            pt(inner, a, base + b.height),
            pt(out, a, base + b.height),
            pt(out, a, base),
          );
        const geometry = new T.BufferGeometry();
        geometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(positions, 3),
        );
        geometry.computeVertexNormals();
        result.push({
          geometry,
          name: top ? "Top band stone" : "Bottom band stone",
          material: b.material,
        });
      }
      if (b.solidCap && bore === null) {
        const geometry = new T.CylinderGeometry(inner, inner, b.height, 32);
        geometry.translate(0, base + b.height / 2, 0);
        result.push({ geometry, name: "Solid cap", material: b.material });
      }
    }
  }
  return result;
}
