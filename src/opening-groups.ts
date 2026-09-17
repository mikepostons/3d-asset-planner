import { clone, validate, uid, type Plan } from "./model";
import { wallFrame } from "./openings";

export function duplicateOpenings(plan: Plan, partId: string, ids: string[]) {
  const source = plan.parts.find((p) => p.id === partId);
  const selected = source?.openings?.filter((o) => ids.includes(o.id)) ?? [];
  if (!source || !selected.length) throw Error("Select openings first.");
  if (selected.some((o) => o.face !== selected[0].face))
    throw Error("Select openings on the same wall to duplicate together.");
  const step = plan.moduleSize / plan.subdivision;
  const frame = wallFrame(source, selected[0].face);
  const minX = Math.min(...selected.map((o) => o.x)),
    maxX = Math.max(...selected.map((o) => o.x + o.width));
  const minY = Math.min(...selected.map((o) => o.y)),
    maxY = Math.max(...selected.map((o) => o.y + o.height));
  const dx = Math.ceil((maxX - minX + 0.05) / step) * step,
    dy = Math.ceil((maxY - minY + 0.05) / step) * step;
  const offsets: number[][] = [
    [dx, 0],
    [-dx, 0],
    [0, dy],
    [0, -dy],
  ];
  // Search within this wall, preserving spacing of the selected arrangement.
  const stride = Math.max(
    step,
    Math.ceil(Math.max(frame.length, frame.topA, frame.topB) / 60 / step) *
      step,
  );
  for (let y = 0; y <= Math.max(frame.topA, frame.topB); y += stride)
    for (let x = stride; x <= frame.length; x += stride)
      offsets.push([x, y], [-x, y], [x, -y], [-x, -y]);
  const copies = selected.map((o) => ({
    ...clone(o),
    id: uid(),
    name: o.name + " copy",
  }));
  for (const [x, y] of offsets) {
    const next = clone(plan),
      p = next.parts.find((p) => p.id === partId)!;
    p.openings = [
      ...(p.openings ?? []),
      ...copies.map((o) => ({ ...o, x: o.x + x, y: o.y + y })),
    ];
    try {
      validate(next);
      return { plan: next, ids: copies.map((o): string => o.id) };
    } catch {}
  }
  throw Error(
    "There is no room for these copies on this wall. Enlarge the wall or select fewer openings.",
  );
}
