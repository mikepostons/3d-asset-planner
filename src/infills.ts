import * as T from "three";
import { openingOutline, wallFrame, type Opening } from "./openings";
import type { Part, Plan } from "./model";
export type Infill = {
  type: "door" | "window";
  inset: number;
  thickness: number;
  frameWidth: number;
  doubleDoor: boolean;
  gapWidth?: number;
  bars: "auto" | "manual";
  horizontal: number;
  vertical: number;
  doorMaterial: string;
  frameMaterial: string;
  glassMaterial: string;
};
export const defaultInfill = (type: Infill["type"]): Infill => ({
  type,
  inset: 0.08,
  thickness: 0.05,
  frameWidth: 0.06,
  doubleDoor: false,
  gapWidth: 0.01,
  bars: "auto",
  horizontal: 1,
  vertical: 1,
  doorMaterial: "",
  frameMaterial: "",
  glassMaterial: "",
});
export function infillGeometry(p: Part, o: Opening) {
  const v = o.infill;
  if (!v) return [];
  const f = wallFrame(p, o.face),
    outline = openingOutline(o);
  const centre = new T.Vector2(o.x + o.width / 2, o.y + o.height / 2);
  const shrink = (gap: number) =>
    outline.map(
      (q) =>
        new T.Vector2(
          centre.x + (q.x - centre.x) * Math.max(0.1, 1 - (2 * gap) / o.width),
          centre.y + (q.y - centre.y) * Math.max(0.1, 1 - (2 * gap) / o.height),
        ),
    );
  const outer = shrink(Math.min(0.01, o.width * 0.02, o.height * 0.02));
  const inner = shrink(
    Math.min(v.frameWidth, 0.4 * Math.min(o.width, o.height)),
  );
  const make = (
    boundary: T.Vector2[],
    holes: T.Vector2[][],
    depth: number,
    thick: number,
  ) => {
    const shape = new T.Shape(boundary);
    shape.holes = holes.map((h) => new T.Path(h));
    const g = new T.ExtrudeGeometry(shape, {
      depth: thick,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 16,
    });
    const a = g.getAttribute("position");
    for (let i = 0; i < a.count; i++) {
      const q = f.point(a.getX(i), a.getY(i), depth + a.getZ(i));
      a.setXYZ(i, q.x, q.y, q.z);
    }
    g.computeVertexNormals();
    return g;
  };
  const result: { geometry: T.BufferGeometry; role: string; color: number }[] =
    [];
  const add = (
    poly: T.Vector2[],
    role: string,
    color: number,
    depth = v.inset,
    thick = v.thickness,
  ) => {
    if (poly.length >= 3)
      result.push({ geometry: make(poly, [], depth, thick), role, color });
  };
  // Clip a convex opening contour to a rectangular bar or door leaf.
  const clip = (
    poly: T.Vector2[],
    axis: "x" | "y",
    limit: number,
    greater: boolean,
  ) => {
    const out: T.Vector2[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const ia = greater ? a[axis] >= limit : a[axis] <= limit;
      const ib = greater ? b[axis] >= limit : b[axis] <= limit;
      if (ia) out.push(a.clone());
      if (ia !== ib)
        out.push(a.clone().lerp(b, (limit - a[axis]) / (b[axis] - a[axis])));
    }
    return out;
  };
  if (v.type === "door") {
    if (v.doubleDoor) {
      add(
        clip(
          outer,
          "x",
          centre.x - Math.min(v.gapWidth ?? 0.01, o.width * 0.8) / 2,
          false,
        ),
        "Left door leaf",
        0x967957,
      );
      add(
        clip(
          outer,
          "x",
          centre.x + Math.min(v.gapWidth ?? 0.01, o.width * 0.8) / 2,
          true,
        ),
        "Right door leaf",
        0x967957,
      );
    } else add(outer, "Door panel", 0x967957);
  } else {
    result.push({
      geometry: make(outer, [inner], v.inset, v.thickness),
      role: "Window frame",
      color: 0x967957,
    });
    add(
      inner,
      "Glass pane",
      0x608f9e,
      v.inset + v.thickness * 0.6,
      Math.min(0.01, v.thickness * 0.2),
    );
    const h =
      v.bars === "auto"
        ? o.kind === "circle-window"
          ? 0
          : Math.min(6, Math.max(0, Math.round(o.height / 0.7) - 1))
        : v.horizontal;
    const w =
      v.bars === "auto"
        ? o.kind === "circle-window"
          ? 0
          : Math.min(6, Math.max(0, Math.round(o.width / 0.7) - 1))
        : v.vertical;
    for (const [axis, count, start, size] of [
      ["x", w, o.x, o.width],
      ["y", h, o.y, o.height],
    ] as const)
      for (let i = 1; i <= count; i++) {
        const pos = start + (size * i) / (count + 1),
          half = Math.min(v.frameWidth * 0.5, (size / (count + 1)) * 0.2);
        add(
          clip(clip(inner, axis, pos - half, true), axis, pos + half, false),
          "Window bar",
          0x967957,
        );
      }
  }
  return result;
}

// Copy settings, never shape or placement. Every target owns an independent copy.
export function infillTargets(plan: Plan, source: Opening, similar: boolean) {
  if (!source.infill) return [];
  return plan.parts.flatMap((p) =>
    (p.openings ?? []).filter(
      (o) =>
        o !== source &&
        (o.kind.endsWith("door") ? "door" : "window") === source.infill!.type &&
        (!similar ||
          (Math.abs(o.width - source.width) <= source.width * 0.2 + 1e-6 &&
            Math.abs(o.height - source.height) <= source.height * 0.2 + 1e-6)),
    ),
  );
}
export function copyInfill(
  plan: Plan,
  source: Opening,
  similar: boolean,
): Plan {
  const targets = new Set(infillTargets(plan, source, similar));
  return {
    ...plan,
    parts: plan.parts.map((p) => ({
      ...p,
      openings: p.openings?.map((o) =>
        targets.has(o) ? { ...o, infill: { ...source.infill! } } : o,
      ),
    })),
  };
}
