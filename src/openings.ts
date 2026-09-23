import {
  openingDetails,
  validateDetails,
  scaleDetails,
  type ArchitecturalDetails,
} from "./architectural-details";
import type { Infill } from "./infills";
import * as T from "three";
import type { Part } from "./model";
export type OpeningKind =
  "door" | "window" | "arched-door" | "arched-window" | "circle-window";
export type Opening = {
  detailsMode?: "inherit" | "off" | "custom";
  architecturalDetails?: ArchitecturalDetails;
  thresholdLift?: number;
  infill?: Infill;
  id: string;
  name: string;
  kind: OpeningKind;
  face: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
export const openingKinds: OpeningKind[] = [
  "door",
  "window",
  "arched-door",
  "arched-window",
  "circle-window",
];
export const openingName = (kind: OpeningKind) =>
  ({
    door: "Door",
    window: "Window",
    "arched-door": "Arched door",
    "arched-window": "Arched window",
    "circle-window": "Circular window",
  })[kind];
export function wallFrame(p: Part, face: number) {
  const f = p.footprint ?? [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ],
    j = (face + 1) % 4;
  const a = new T.Vector3(f[face][0] * p.width, 0, f[face][1] * p.depth),
    b = new T.Vector3(f[j][0] * p.width, 0, f[j][1] * p.depth);
  const length = a.distanceTo(b),
    u = b.clone().sub(a).normalize(),
    inward = new T.Vector3(-u.z, 0, u.x);
  const h = p.wallHeight ?? p.floors * p.floorHeight;
  const baseA = p.cornerBases?.[face] ?? 0,
    baseB = p.cornerBases?.[j] ?? 0,
    topA = p.cornerHeights?.[face] ?? h,
    topB = p.cornerHeights?.[j] ?? h;
  return {
    a,
    b,
    u,
    inward,
    length,
    baseA,
    baseB,
    topA,
    topB,
    point: (x: number, y: number, depth = 0) =>
      a.clone().addScaledVector(u, x).addScaledVector(inward, depth).setY(y),
  };
}
export function openingOutline(o: Opening): T.Vector2[] {
  const { x, y, width: w, height: h } = o;
  if (o.kind === "circle-window")
    return Array.from({ length: 32 }, (_, i) => {
      const a = (i * Math.PI) / 16;
      return new T.Vector2(
        x + w / 2 + (Math.cos(a) * w) / 2,
        y + h / 2 + (Math.sin(a) * h) / 2,
      );
    });
  if (o.kind.startsWith("arched")) {
    const r = Math.min(w / 2, h * 0.5),
      pts = [
        new T.Vector2(x, y),
        new T.Vector2(x + w, y),
        new T.Vector2(x + w, y + h - r),
      ];
    for (let i = 1; i <= 16; i++) {
      const a = (i * Math.PI) / 16;
      pts.push(
        new T.Vector2(
          x + w / 2 + (Math.cos(a) * w) / 2,
          y + h - r + Math.sin(a) * r,
        ),
      );
    }
    return pts;
  }
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([a, b]) => new T.Vector2(a, b));
}
function innerCorners(p: Part) {
  const frames = Array.from({ length: 4 }, (_, i) => wallFrame(p, i)),
    t = p.wallThickness ?? 0.4;
  return frames.map((f, i) => {
    const prev = frames[(i + 3) % 4],
      a = prev.a.clone().addScaledVector(prev.inward, t),
      b = f.a.clone().addScaledVector(f.inward, t);
    const cross = (u: T.Vector3, v: T.Vector3) => u.x * v.z - u.z * v.x;
    return b.addScaledVector(f.u, cross(a.sub(b), prev.u) / cross(f.u, prev.u));
  });
}
export function validateOpenings(p: Part) {
  if (p.hollowWalls !== undefined && typeof p.hollowWalls !== "boolean")
    throw Error("Invalid hollow-wall option.");
  if (
    p.wallThickness !== undefined &&
    (!Number.isFinite(p.wallThickness) ||
      p.wallThickness < 0.05 ||
      p.wallThickness > 5)
  )
    throw Error("Wall thickness must be 0.05–5 m.");
  if ((p.hollowWalls || p.openings?.length) && p.shape === "circle")
    throw Error("Openings currently support straight walls only.");
  if (
    p.hollowWalls &&
    (p.wallThickness ?? 0.4) >= Math.min(p.width, p.depth) / 2
  )
    throw Error("Wall thickness leaves no room for an interior.");
  if (p.hollowWalls) {
    const frames = Array.from({ length: 4 }, (_, i) => wallFrame(p, i)),
      corners = innerCorners(p),
      t = p.wallThickness ?? 0.4;
    if (
      corners.some(
        (c) =>
          ![c.x, c.z].every(Number.isFinite) ||
          frames.some((f) => c.clone().sub(f.a).dot(f.inward) < t - 1e-6),
      ) ||
      Math.abs(T.ShapeUtils.area(corners.map((c) => new T.Vector2(c.x, c.z)))) <
        0.01
    )
      throw Error("Wall thickness is too large for this footprint.");
  }
  if (p.openings === undefined) return;
  if (!Array.isArray(p.openings) || p.openings.length > 100)
    throw Error("Invalid openings list (maximum 100 per part).");
  const ids = new Set<string>();
  for (const o of p.openings) {
    if (
      !o ||
      typeof o.id !== "string" ||
      ids.has(o.id) ||
      typeof o.name !== "string" ||
      !openingKinds.includes(o.kind) ||
      !Number.isInteger(o.face) ||
      o.face < 0 ||
      o.face > 3 ||
      ![o.x, o.y, o.width, o.height].every(Number.isFinite) ||
      o.width < 0.1 ||
      o.height < 0.1
    )
      throw Error("Invalid opening.");
    if (o.infill) {
      const v = o.infill;
      if (
        !["door", "window"].includes(v.type) ||
        !["auto", "manual"].includes(v.bars) ||
        typeof v.doubleDoor !== "boolean" ||
        (v.gapWidth !== undefined &&
          (!Number.isFinite(v.gapWidth) || v.gapWidth < 0 || v.gapWidth > 5)) ||
        ![v.inset, v.thickness, v.frameWidth].every(Number.isFinite) ||
        v.inset < 0 ||
        v.inset > 5 ||
        v.thickness < 0.005 ||
        v.thickness > 1 ||
        v.frameWidth < 0.005 ||
        v.frameWidth > 1 ||
        ![v.horizontal, v.vertical].every(
          (n) => Number.isInteger(n) && n >= 0 && n <= 12,
        ) ||
        ![v.doorMaterial, v.frameMaterial, v.glassMaterial].every(
          (s) => typeof s === "string",
        )
      )
        throw Error("Invalid opening infill settings.");
    }
    validateDetails(o.architecturalDetails);
    const surround = openingDetails(p, o);
    if (
      surround?.enabled &&
      surround.cills &&
      o.kind !== "circle-window" &&
      o.width + (surround.cillWidthAdjustment ?? 2 * surround.overhang) < 0.01
    )
      throw Error(
        "Cill width must remain at least 0.01 m. Reduce the negative width adjustment.",
      );
    if (
      o.detailsMode !== undefined &&
      !["inherit", "off", "custom"].includes(o.detailsMode)
    )
      throw Error("Invalid opening detail mode.");
    if (
      o.thresholdLift !== undefined &&
      (!Number.isFinite(o.thresholdLift) || o.thresholdLift < 0)
    )
      throw Error("Invalid threshold lift.");
    ids.add(o.id);
    const f = wallFrame(p, o.face),
      bottom = (x: number) => T.MathUtils.lerp(f.baseA, f.baseB, x / f.length),
      top = (x: number) => T.MathUtils.lerp(f.topA, f.topB, x / f.length);
    if (
      o.x < 0.05 ||
      o.x + o.width > f.length - 0.05 ||
      o.y < Math.max(bottom(o.x), bottom(o.x + o.width)) - 0.0001 ||
      o.y + o.height > Math.min(top(o.x), top(o.x + o.width)) - 0.05
    )
      throw Error(
        "Opening must fit within its wall. Resize or move the opening first.",
      );
    if (o.kind === "circle-window" && Math.abs(o.width - o.height) > 0.0001)
      throw Error("Circular windows need equal width and height.");
    for (const q of p.openings)
      if (
        q !== o &&
        q.face === o.face &&
        o.x < q.x + q.width + 0.05 &&
        o.x + o.width + 0.05 > q.x &&
        o.y < q.y + q.height + 0.05 &&
        o.y + o.height + 0.05 > q.y
      )
        throw Error("Openings need at least 0.05 m separation.");
  }
}
export function scaleOpenings(p: Part, factor: number) {
  for (const o of p.openings ?? []) {
    scaleDetails(o.architecturalDetails, factor);
    if (o.thresholdLift !== undefined) o.thresholdLift *= factor;
  }
  for (const o of p.openings ?? [])
    if (o.infill)
      o.infill = {
        ...o.infill,
        inset: o.infill.inset * factor,
        gapWidth: (o.infill.gapWidth ?? 0.01) * factor,
        thickness: o.infill.thickness * factor,
        frameWidth: o.infill.frameWidth * factor,
      };

  if (p.wallThickness !== undefined || p.hollowWalls || p.openings?.length)
    p.wallThickness = (p.wallThickness ?? 0.4) * factor;
  p.openings?.forEach((o) => {
    o.x *= factor;
    o.y *= factor;
    o.width *= factor;
    o.height *= factor;
  });
}
// Rebuild wall surfaces around editable contours; no accumulated boolean operations.
export function openingBodyGeometry(p: Part, tops:Record<number,T.Vector2[]> = {}): T.BufferGeometry {
  const positions: number[] = [];
  const tri = (a: T.Vector3, b: T.Vector3, c: T.Vector3) =>
    // Wall-local contours use U/right and Y/up; reverse for outward-facing exterior walls.
    positions.push(...a.toArray(), ...c.toArray(), ...b.toArray());
  const quad = (a: T.Vector3, b: T.Vector3, c: T.Vector3, d: T.Vector3) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  const frames = Array.from({ length: 4 }, (_, i) => wallFrame(p, i)),
    t = p.wallThickness ?? 0.4;
  const inset = innerCorners(p);
  for (let i = 0; i < 4; i++) {
    const f = frames[i],
      ops = (p.openings ?? []).filter((o) => o.face === i),
      j = (i + 1) % 4;
    const inner = (x: number, y: number) =>
      inset[i]
        .clone()
        .lerp(inset[j], x / f.length)
        .setY(y);
    const back = (x: number, y: number) =>
      f.point(x, y, p.hollowWalls ? t : Math.min(t, 0.2));
    // A bottom-touching opening is a notch in the exterior polygon, not a touching hole.
    const notches = ops
      .filter(
        (o) =>
          Math.abs(o.y - T.MathUtils.lerp(f.baseA, f.baseB, o.x / f.length)) <
            0.001 && Math.abs(f.baseA - f.baseB) < 0.001,
      )
      .sort((a, b) => a.x - b.x);
    const contour = [new T.Vector2(0, f.baseA)];
    for (const o of notches) {
      const pts = openingOutline(o);
      contour.push(pts[0], ...pts.slice(2).reverse(), pts[1]);
    }
    contour.push(
      new T.Vector2(f.length, f.baseB),
      ...(tops[i] ?? [new T.Vector2(0,f.topA),new T.Vector2(f.length,f.topB)]).slice().reverse(),
    );
    const holes = ops.filter((o) => !notches.includes(o)).map(openingOutline),
      all = [...contour, ...holes.flat()];
    for (const face of T.ShapeUtils.triangulateShape(contour, holes)) {
      const pts = face.map((k) => all[k]);
      tri(
        ...(pts.map((v) => f.point(v.x, v.y)) as [
          T.Vector3,
          T.Vector3,
          T.Vector3,
        ]),
      );
    }
    if (p.hollowWalls) {
      // Only the wall boundary is mitered. Opening contours keep their exterior
      // wall coordinates so every reveal travels along the face normal.
      const left = inset[i].clone().sub(f.a).dot(f.u);
      const right = inset[j].clone().sub(f.a).dot(f.u);
      const innerContour = contour.map((v, index) => {
        if (Math.abs(v.x)<1e-6)
          return new T.Vector2(left, v.y);
        if (Math.abs(v.x-f.length)<1e-6)
          return new T.Vector2(right, v.y);
        return v.clone();
      });
      const innerAll = [...innerContour, ...holes.flat()];
      for (const face of T.ShapeUtils.triangulateShape(innerContour, holes))
        tri(
          ...(face.reverse().map((k) => back(innerAll[k].x, innerAll[k].y)) as [
            T.Vector3,
            T.Vector3,
            T.Vector3,
          ]),
        );
    }
    for (const o of ops) {
      const pts = openingOutline(o);
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k],
          b = pts[(k + 1) % pts.length];
        quad(
          f.point(a.x, a.y),
          f.point(b.x, b.y),
          back(b.x, b.y),
          back(a.x, a.y),
        );
      }
      if (!p.hollowWalls)
        for (const face of T.ShapeUtils.triangulateShape(pts, []))
          tri(
            ...(face.map((k) => back(pts[k].x, pts[k].y)) as [
              T.Vector3,
              T.Vector3,
              T.Vector3,
            ]),
          );
    }
    if(p.hollowWalls){
      const top=tops[i]??[new T.Vector2(0,f.topA),new T.Vector2(f.length,f.topB)];
      for(let k=0;k<top.length-1;k++){const a=top[k],b=top[k+1];quad(f.point(a.x,a.y),f.point(b.x,b.y),inner(b.x,b.y),inner(a.x,a.y));}
    }
  }
  const base = frames.map((f) => f.point(0, f.baseA)),
    bottom = base.map((v) => v.clone().add(new T.Vector3(0, -0.12, 0)));
  for (let i = 1; i < 3; i++) {
    tri(base[0], base[i], base[i + 1]);
    tri(bottom[0], bottom[i + 1], bottom[i]);
  }
  for (let i = 0; i < 4; i++)
    quad(base[i], bottom[i], bottom[(i + 1) % 4], base[(i + 1) % 4]);
  if (!p.hollowWalls && !Object.keys(tops).length) {
    const top = frames.map((f) => f.point(0, f.topA));
    for (let i = 1; i < 3; i++) tri(top[0], top[i], top[i + 1]);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

// Wall-local editing keeps openings on their original face. Validation by the
// caller rejects collisions and wall boundaries before a single undoable commit.
export function editOpening(
  o: Opening,
  handle: string,
  dx: number,
  dy: number,
  step: number,
  floor: number,
): Opening {
  const n = { ...o };
  const snapped = (v: number) => Math.round(v / step) * step;
  dx = snapped(dx);
  dy = snapped(dy);
  if (handle === "move") {
    n.x += dx;
    n.y += dy;
    if (o.kind.endsWith("door") && Math.abs(n.y - floor) <= step / 2)
      n.y = floor;
    return n;
  }
  let left = o.x,
    right = o.x + o.width,
    bottom = o.y,
    top = o.y + o.height;
  if (handle.includes("w")) left = Math.min(right - 0.1, left + dx);
  if (handle.includes("e")) right = Math.max(left + 0.1, right + dx);
  if (handle.includes("s")) bottom = Math.min(top - 0.1, bottom + dy);
  if (handle.includes("n")) top = Math.max(bottom + 0.1, top + dy);
  n.x = left;
  n.y = bottom;
  n.width = right - left;
  n.height = top - bottom;
  if (o.kind === "circle-window") {
    const size =
      handle === "n" || handle === "s"
        ? n.height
        : handle.length === 2 && Math.abs(dy) > Math.abs(dx)
          ? n.height
          : n.width;
    n.width = n.height = size;
    n.x = handle.includes("w")
      ? o.x + o.width - size
      : handle.includes("e")
        ? o.x
        : o.x + (o.width - size) / 2;
    n.y = handle.includes("s")
      ? o.y + o.height - size
      : handle.includes("n")
        ? o.y
        : o.y + (o.height - size) / 2;
  }
  return n;
}
