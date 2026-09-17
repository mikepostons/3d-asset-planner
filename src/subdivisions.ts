import * as T from "three";
import { footprint, height, type Part } from "./model";
export const subdivisionDefaults = (p: Part) =>
  p.subdivisions ?? {
    enabled: false,
    x: p.shape === "circle" ? 32 : 2,
    y: 2,
    z: 2,
  };
// Body surface patches only; the roof remains a separate procedural surface.
export function subdivisionPreview(p: Part) {
  const s = subdivisionDefaults(p),
    points: number[] = [];
  let faces = 0;
  const patch = (
    uCount: number,
    vCount: number,
    at: (u: number, v: number) => T.Vector3,
  ) => {
    faces += uCount * vCount;
    for (let u = 0; u <= uCount; u++)
      for (let v = 0; v < vCount; v++)
        points.push(
          ...at(u / uCount, v / vCount).toArray(),
          ...at(u / uCount, (v + 1) / vCount).toArray(),
        );
    for (let v = 0; v <= vCount; v++)
      for (let u = 0; u < uCount; u++)
        points.push(
          ...at(u / uCount, v / vCount).toArray(),
          ...at((u + 1) / uCount, v / vCount).toArray(),
        );
  };
  if (p.shape === "circle") {
    const outer = (t: number) =>
      T.MathUtils.lerp(p.width, p.topDiameter ?? p.width, t) / 2;
    const inner = (t: number) =>
      T.MathUtils.lerp(
        p.innerDiameter ?? 0,
        p.topInnerDiameter ?? p.innerDiameter ?? 0,
        t,
      ) / 2;
    const point = (a: number, r: number, y: number) =>
      new T.Vector3(
        Math.cos(a * Math.PI * 2) * r,
        y,
        Math.sin(a * Math.PI * 2) * r,
      );
    patch(s.x, s.y, (a, t) => point(a, outer(t), height(p) * t));
    if (p.innerDiameter !== undefined)
      patch(s.x, s.y, (a, t) => point(a, inner(t), height(p) * t));
    for (const t of [0, 1]) {
      patch(s.x, s.z, (a, r) =>
        point(a, T.MathUtils.lerp(inner(t), outer(t), r), height(p) * t),
      );
    }
  } else {
    const corners = footprint(p);
    const layer = (i: number, top: boolean) =>
      new T.Vector3(
        corners[i][0] * p.width,
        top ? (p.cornerHeights?.[i] ?? height(p)) : (p.cornerBases?.[i] ?? 0),
        corners[i][1] * p.depth,
      );
    const surface = (
      a: T.Vector3,
      b: T.Vector3,
      c: T.Vector3,
      d: T.Vector3,
      u: number,
      v: number,
    ) => a.clone().lerp(b, u).lerp(d.clone().lerp(c, u), v);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      patch(i % 2 === 0 ? s.x : s.z, s.y, (u, v) =>
        surface(
          layer(i, false),
          layer(j, false),
          layer(j, true),
          layer(i, true),
          u,
          v,
        ),
      );
    }
    for (const top of [false, true])
      patch(s.x, s.z, (u, v) =>
        surface(
          layer(0, top),
          layer(1, top),
          layer(2, top),
          layer(3, top),
          u,
          v,
        ),
      );
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  return { geometry, faces };
}
