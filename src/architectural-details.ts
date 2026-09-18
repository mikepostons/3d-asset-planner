import * as T from "three";
import type { Part } from "./model";
import { wallFrame, type Opening } from "./openings";

export type ArchitecturalDetails = {
  arches?: boolean;
  keystones?: boolean;
  archWidth?: number;
  keystoneExtra?: number;
  enabled: boolean;
  jambs: boolean;
  lintels: boolean;
  cills: boolean;
  quoins: boolean;
  raiseDoors: boolean;
  projection: number;
  gap: number;
  chamfer: number;
  variation: number;
  seed: number;
  jambWidth: number;
  courseHeight: number;
  lintelHeight: number;
  cillHeight: number;
  cillWidthAdjustment?: number;
  cillProjection?: number;
  overhang: number;
  quoinWidth: number;
  material: string;
  cillMaterial: string;
  quoinMaterial: string;
};
export const defaultDetails = (): ArchitecturalDetails => ({
  enabled: true,
  arches: true,
  keystones: false,
  archWidth: 0.18,
  keystoneExtra: 0.08,
  jambs: true,
  lintels: true,
  cills: true,
  quoins: false,
  raiseDoors: true,
  projection: 0.08,
  gap: 0.015,
  chamfer: 0.015,
  variation: 0.15,
  seed: 1,
  jambWidth: 0.18,
  courseHeight: 0.3,
  lintelHeight: 0.2,
  cillHeight: 0.12,
  overhang: 0.12,
  quoinWidth: 0.35,
  material: "Dressed stone",
  cillMaterial: "Dressed stone",
  quoinMaterial: "Dressed stone",
});
export function validateDetails(v: ArchitecturalDetails | undefined) {
  if (v === undefined) return;
  for (const key of ["arches", "keystones"] as const)
    if (v[key] !== undefined && typeof v[key] !== "boolean")
      throw Error("Invalid arch feature setting.");
  for (const key of ["archWidth", "keystoneExtra"] as const)
    if (
      v[key] !== undefined &&
      (!Number.isFinite(v[key]) || v[key]! < 0 || v[key]! > 5)
    )
      throw Error("Invalid arch dimension.");
  if (v.archWidth !== undefined && v.archWidth < 0.01)
    throw Error("Arch width must be at least 0.01 m.");
  if (
    v.cillWidthAdjustment !== undefined &&
    (!Number.isFinite(v.cillWidthAdjustment) ||
      Math.abs(v.cillWidthAdjustment) > 10)
  )
    throw Error("Cill width adjustment must be between -10 and 10 metres.");
  if (
    v.cillProjection !== undefined &&
    (!Number.isFinite(v.cillProjection) ||
      v.cillProjection < 0 ||
      v.cillProjection > 5)
  )
    throw Error("Cill projection must be between 0 and 5 metres.");
  if (
    !v ||
    !["enabled", "jambs", "lintels", "cills", "quoins", "raiseDoors"].every(
      (k) => typeof v[k as keyof ArchitecturalDetails] === "boolean",
    ) ||
    !["material", "cillMaterial", "quoinMaterial"].every(
      (k) => typeof v[k as keyof ArchitecturalDetails] === "string",
    ) ||
    !Number.isInteger(v.seed) ||
    Math.abs(v.seed) > 2147483647
  )
    throw Error("Invalid architectural detail settings.");
  for (const k of [
    "projection",
    "gap",
    "chamfer",
    "variation",
    "jambWidth",
    "courseHeight",
    "lintelHeight",
    "cillHeight",
    "overhang",
    "quoinWidth",
  ] as const) {
    if (!Number.isFinite(v[k]) || v[k] < 0 || v[k] > 5)
      throw Error("Invalid detail dimensions.");
  }
  if (
    v.variation > 0.5 ||
    v.courseHeight < 0.05 ||
    v.jambWidth < 0.01 ||
    v.quoinWidth < 0.01 ||
    v.lintelHeight < 0.01 ||
    v.cillHeight < 0.01 ||
    v.gap >= v.courseHeight * 0.8
  )
    throw Error(
      "Detail sizes must be positive; mortar gap must be smaller than the stone course.",
    );
}
export function openingDetails(p: Part, o: Opening) {
  return o.detailsMode === "off"
    ? undefined
    : o.detailsMode === "custom"
      ? o.architecturalDetails
      : p.architecturalDetails;
}
// Store the last applied lift so changing/toggling settings is reversible.
// Opening positions remain normal wall-local coordinates everywhere else.
export function reconcileThresholds(p: Part): Part {
  return {
    ...p,
    openings: p.openings?.map((o) => {
      const v = openingDetails(p, o);
      const lift =
        v?.enabled && v.cills && v.raiseDoors && o.kind.endsWith("door")
          ? v.cillHeight
          : 0;
      return {
        ...o,
        y: o.y - (o.thresholdLift ?? 0) + lift,
        thresholdLift: lift,
      };
    }),
  };
}
export function scaleDetails(v: ArchitecturalDetails | undefined, r: number) {
  if (!v) return;
  if (v.archWidth !== undefined) v.archWidth *= r;
  if (v.keystoneExtra !== undefined) v.keystoneExtra *= r;
  if (v.cillWidthAdjustment !== undefined) v.cillWidthAdjustment *= r;
  if (v.cillProjection !== undefined) v.cillProjection *= r;
  for (const k of [
    "projection",
    "gap",
    "chamfer",
    "jambWidth",
    "courseHeight",
    "lintelHeight",
    "cillHeight",
    "overhang",
    "quoinWidth",
  ] as const)
    v[k] *= r;
}
function random(seed: number, key: string) {
  let hash = seed | 0;
  for (let i = 0; i < key.length; i++)
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  return (hash >>> 0) / 4294967295;
}
export function architecturalGeometry(p: Part) {
  const result: {
    geometry: T.BufferGeometry;
    name: string;
    openingId?: string;
    material: string;
  }[] = [];
  if (p.shape === "circle") return result;
  let openingId: string | undefined;
  const stone = (
    face: number,
    x: number,
    y: number,
    w: number,
    h: number,
    v: ArchitecturalDetails,
    name: string,
    material: string,
  ) => {
    if (w <= 0.005 || h <= 0.005) return;
    const f = wallFrame(p, face),
      depth = v.projection + 0.02;
    const b = Math.min(v.chamfer, w / 4, h / 4, depth / 4);
    const shape = new T.Shape();
    shape.moveTo(x + b, y + b);
    shape.lineTo(x + w - b, y + b);
    shape.lineTo(x + w - b, y + h - b);
    shape.lineTo(x + b, y + h - b);
    shape.closePath();
    const g = new T.ExtrudeGeometry(shape, {
      depth: depth - 2 * b,
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 1,
      steps: 1,
    });
    const a = g.getAttribute("position");
    for (let i = 0; i < a.count; i++) {
      const q = f.point(a.getX(i), a.getY(i), -v.projection + b + a.getZ(i));
      a.setXYZ(i, q.x, q.y, q.z);
    }
    g.computeVertexNormals();
    result.push({ geometry: g, name, material, openingId });
  };
  for (const o of p.openings ?? []) {
    openingId=o.id;
    const v = openingDetails(p, o);
    if (!v?.enabled) continue;
    if (v.jambs && o.kind !== "circle-window") {
      const h = o.kind.startsWith("arched")
        ? o.height - Math.min(o.width / 2, o.height * 0.5)
        : o.height;
      const n = Math.min(160, Math.max(1, Math.ceil(h / v.courseHeight))),
        course = h / n;
      for (let side = 0; side < 2; side++)
        for (let i = 0; i < n; i++) {
          const width =
            v.jambWidth *
            (1 +
              v.variation *
                (2 * random(v.seed, o.id + ":jamb:" + side + ":" + i) - 1));
          stone(
            o.face,
            side ? o.x + o.width : o.x - width,
            o.y + i * course + v.gap / 2,
            width,
            Math.max(0.006, course - v.gap),
            v,
            "Jamb",
            v.material,
          );
        }
    }
    if (
      (v.arches ?? true) &&
      (o.kind.startsWith("arched") || o.kind === "circle-window")
    ) {
      const circle = o.kind === "circle-window",
        rx = o.width / 2,
        ry = circle ? o.height / 2 : Math.min(o.width / 2, o.height * 0.5);
      const cx = o.x + rx,
        cy = circle ? o.y + ry : o.y + o.height - ry;
      const steps = circle ? 32 : 16,
        delta = Math.PI / 16;
      const width = v.archWidth ?? v.jambWidth;
      for (let index = 0; index < steps; index++) {
        // Combine the two crown sectors into one centred keystone.
        const key = !!v.keystones && index === 7;
        const endIndex = key ? index + 2 : index + 1;
        const start = index * delta,
          end = endIndex * delta;
        const trim = Math.min(
          (end - start) * 0.2,
          v.gap / (2 * Math.max(0.05, Math.min(rx, ry))),
        );
        const a = start + trim,
          b = end - trim,
          outerWidth = width + (key ? (v.keystoneExtra ?? 0.08) : 0);
        // Interpolate the original faceted cut contour exactly, including at
        // mortar gaps. This avoids projecting trim into the opening clearance.
        const inner = (angle: number) => {
          const k = Math.floor(angle / delta),
            t = angle / delta - k;
          return new T.Vector2(
            cx +
              rx *
                ((1 - t) * Math.cos(k * delta) + t * Math.cos((k + 1) * delta)),
            cy +
              ry *
                ((1 - t) * Math.sin(k * delta) + t * Math.sin((k + 1) * delta)),
          );
        };
        const angles = [a];
        for (let j = index + 1; j < endIndex; j++) angles.push(j * delta);
        angles.push(b);
        const poly = [
          ...angles.map(inner),
          ...angles
            .slice()
            .reverse()
            .map(
              (angle) =>
                new T.Vector2(
                  cx + (rx + outerWidth) * Math.cos(angle),
                  cy + (ry + outerWidth) * Math.sin(angle),
                ),
            ),
        ];
        const center = poly
          .reduce((sum, q) => sum.add(q), new T.Vector2())
          .multiplyScalar(1 / poly.length);
        const depth =
          v.projection + (key ? (v.keystoneExtra ?? 0.08) * 0.5 : 0);
        const bevel = Math.min(
          v.chamfer,
          width * 0.2,
          (b - a) * Math.min(rx, ry) * 0.15,
          (depth + 0.02) / 4,
        );
        const inset = poly.map((q) =>
          q
            .clone()
            .lerp(
              center,
              Math.min(0.3, bevel / Math.max(0.01, q.distanceTo(center))),
            ),
        );
        const f = wallFrame(p, o.face),
          positions: number[] = [];
        const tri = (a: T.Vector3, b: T.Vector3, c: T.Vector3) =>
          positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
        const quad = (
          a: T.Vector3,
          b: T.Vector3,
          c: T.Vector3,
          d: T.Vector3,
        ) => {
          tri(a, b, c);
          tri(a, c, d);
        };
        for (let j = 0; j < poly.length; j++) {
          const k = (j + 1) % poly.length;
          quad(
            f.point(poly[j].x, poly[j].y, 0.02),
            f.point(poly[k].x, poly[k].y, 0.02),
            f.point(poly[k].x, poly[k].y, -depth + bevel),
            f.point(poly[j].x, poly[j].y, -depth + bevel),
          );
          quad(
            f.point(poly[j].x, poly[j].y, -depth + bevel),
            f.point(poly[k].x, poly[k].y, -depth + bevel),
            f.point(inset[k].x, inset[k].y, -depth),
            f.point(inset[j].x, inset[j].y, -depth),
          );
        }
        for (const face of T.ShapeUtils.triangulateShape(inset, []))
          tri(
            ...(face.map((j) => f.point(inset[j].x, inset[j].y, -depth)) as [
              T.Vector3,
              T.Vector3,
              T.Vector3,
            ]),
          );
        for (const face of T.ShapeUtils.triangulateShape(poly, []))
          tri(
            ...(face
              .reverse()
              .map((j) => f.point(poly[j].x, poly[j].y, 0.02)) as [
              T.Vector3,
              T.Vector3,
              T.Vector3,
            ]),
          );
        const geometry = new T.BufferGeometry();
        geometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(positions, 3),
        );
        geometry.computeVertexNormals();
        result.push({
          geometry,
          name: key
            ? "Keystone"
            : circle
              ? "Circular surround stone"
              : "Arch stone",
          material: v.material,
          openingId,
        });
        if (key) index++;
      }
    }
    if (v.lintels && !o.kind.startsWith("arched") && o.kind !== "circle-window")
      stone(
        o.face,
        o.x - v.overhang,
        o.y + o.height,
        o.width + 2 * v.overhang,
        v.lintelHeight,
        v,
        "Lintel",
        v.material,
      );
    if (v.cills && o.kind !== "circle-window")
      stone(
        o.face,
        o.x - (v.cillWidthAdjustment ?? 2 * v.overhang) / 2,
        o.y - v.cillHeight,
        o.width + (v.cillWidthAdjustment ?? 2 * v.overhang),
        v.cillHeight,
        { ...v, projection: v.cillProjection ?? v.projection },
        o.kind.endsWith("door") ? "Threshold" : "Cill",
        v.cillMaterial,
      );
  }
  openingId=undefined;
  const v = p.architecturalDetails;
  if (v?.enabled && v.quoins)
    for (let corner = 0; corner < 4; corner++) {
      const f = wallFrame(p, corner),
        h = f.topA - f.baseA;
      const n = Math.min(160, Math.max(1, Math.ceil(h / v.courseHeight))),
        course = h / n;
      const previous = wallFrame(p, (corner + 3) % 4);
      const along = f.u,
        across = previous.u.clone().negate();
      // Intersection of the two outward-offset wall planes: one continuous
      // corner block, rather than two facing strips with a missing outer corner.
      const outward = f.inward.clone().add(previous.inward).normalize();
      const origin = f.a
        .clone()
        .addScaledVector(
          outward,
          -v.projection / Math.max(0.05, outward.dot(f.inward)),
        );
      for (let i = 0; i < n; i++) {
        const variation =
          1 +
          v.variation * (random(v.seed, "quoin:" + corner + ":" + i) * 2 - 1);
        const long = Math.min(
          f.length / 3,
          previous.length / 3,
          v.quoinWidth * variation,
        );
        const short = long * 0.5;
        const a = i % 2 === 0 ? long : short,
          b = i % 2 === 0 ? short : long;
        const y = f.baseA + i * course + v.gap / 2,
          stoneHeight = Math.max(0.006, course - v.gap);
        const blocked = (p.openings ?? []).some((o) => {
          const extent =
            o.face === corner ? a : o.face === (corner + 3) % 4 ? b : 0;
          const x = o.face === corner ? 0 : previous.length - extent;
          return (
            extent > 0 &&
            x < o.x + o.width &&
            x + extent > o.x &&
            y < o.y + o.height &&
            y + stoneHeight > o.y
          );
        });
        if (blocked) continue;
        const lengthA = a + v.projection,
          lengthB = b + v.projection;
        const bevel = Math.min(
          v.chamfer,
          lengthA / 5,
          lengthB / 5,
          stoneHeight / 4,
        );
        const vertices = [
          origin
            .clone()
            .addScaledVector(along, bevel)
            .addScaledVector(across, bevel),
          origin
            .clone()
            .addScaledVector(along, lengthA - bevel)
            .addScaledVector(across, bevel),
          origin
            .clone()
            .addScaledVector(along, lengthA - bevel)
            .addScaledVector(across, lengthB - bevel),
          origin
            .clone()
            .addScaledVector(along, bevel)
            .addScaledVector(across, lengthB - bevel),
        ];
        const shape = new T.Shape(vertices.map((q) => new T.Vector2(q.x, q.z)));
        const geometry = new T.ExtrudeGeometry(shape, {
          depth: stoneHeight - 2 * bevel,
          bevelEnabled: bevel > 0,
          bevelSize: bevel,
          bevelThickness: bevel,
          bevelSegments: 1,
          steps: 1,
        });
        const positions = geometry.getAttribute("position");
        for (let j = 0; j < positions.count; j++) {
          const x = positions.getX(j),
            z = positions.getY(j),
            height = positions.getZ(j);
          positions.setXYZ(j, x, y + bevel + height, z);
        }
        geometry.computeVertexNormals();
        result.push({ geometry, name: "Quoin", material: v.quoinMaterial });
      }
    }
  return result;
}
