import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import * as T from "three";
import { footprint, height, ridgeEnds, type Part } from "./model";
type Point = [number, number];
function clip(points: Point[], axis: number, positive: boolean): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      inside = (p: Point) => (positive ? p[axis] >= 0 : p[axis] <= 0);
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = -a[axis] / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
export function partGeometry(p: Part, roof: boolean): T.BufferGeometry {
  if (p.shape === "circle") {
    const top = (p.topDiameter ?? p.width) / 2;
    const g = new T.CylinderGeometry(
      top,
      roof ? top : p.width / 2,
      roof ? 0.12 : height(p),
      32,
      1,
      false,
    );
    g.translate(0, roof ? height(p) + 0.06 : height(p) / 2, 0);
    return g;
  }
  if (roof && p.roof === "gable") {
    const vertices = footprint(p).map(
      ([x, z], i) =>
        new T.Vector3(
          x * p.width,
          p.cornerHeights?.[i] ?? height(p),
          z * p.depth,
        ),
    );
    for (const [x, y, z] of ridgeEnds(p))
      vertices.push(new T.Vector3(x * p.width, height(p) + y, z * p.depth));
    if (p.rise > 0 || p.ridgeEnds?.some((q) => q[1] > 0))
      return new ConvexGeometry(vertices);
  }
  const points = footprint(p).map(
      ([x, z]) => [x * p.width, z * p.depth] as Point,
    ),
    h = height(p),
    positions: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) =>
    positions.push(...a, ...b, ...c);
  const y = (q: Point) => {
    const i = points.findIndex(
      (v) => Math.abs(v[0] - q[0]) < 1e-7 && Math.abs(v[1] - q[1]) < 1e-7,
    );
    const wallTop = p.cornerHeights?.[i] ?? h;
    if (!roof) return wallTop;
    if (p.roof === "flat") return wallTop + 0.12;
    if (p.roof === "gable")
      return (
        h +
        Math.max(
          0,
          1 -
            Math.abs(
              p.ridge === "width" ? q[1] / (p.depth / 2) : q[0] / (p.width / 2),
            ),
        ) *
          p.rise
      );
    const t =
      p.highEdge === "front"
        ? q[1] / p.depth + 0.5
        : p.highEdge === "back"
          ? 0.5 - q[1] / p.depth
          : p.highEdge === "right"
            ? q[0] / p.width + 0.5
            : 0.5 - q[0] / p.width;
    return h + Math.max(0, t) * p.rise;
  };
  const base = roof ? h : 0;
  const bottom = (q: Point) => {
    const i = points.findIndex(
      (v) => Math.abs(v[0] - q[0]) < 1e-7 && Math.abs(v[1] - q[1]) < 1e-7,
    );
    return roof ? (p.cornerHeights?.[i] ?? h) : (p.cornerBases?.[i] ?? 0);
  };
  const surf = (poly: Point[], top: boolean) => {
    for (let i = 1; i < poly.length - 1; i++) {
      const pts = [poly[0], poly[i], poly[i + 1]].map((q) => [
        q[0],
        top ? y(q) : bottom(q),
        q[1],
      ]);
      tri(pts[0], pts[1], pts[2]);
    }
  };
  surf(points, false);
  if (roof && p.roof === "gable") {
    const axis = p.ridge === "width" ? 1 : 0;
    surf(clip(points, axis, true), true);
    surf(clip(points, axis, false), true);
  } else surf(points, true);
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    let edge = [a, b];
    if (roof && p.roof === "gable") {
      const axis = p.ridge === "width" ? 1 : 0;
      if (a[axis] * b[axis] < 0) {
        const t = -a[axis] / (b[axis] - a[axis]);
        edge = [a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], b];
      }
    }
    for (let j = 0; j < edge.length - 1; j++) {
      const c = edge[j],
        d = edge[j + 1],
        aa = [c[0], bottom(c), c[1]],
        bb = [d[0], bottom(d), d[1]],
        cc = [d[0], y(d), d[1]],
        dd = [c[0], y(c), c[1]];
      tri(aa, bb, cc);
      tri(aa, cc, dd);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
