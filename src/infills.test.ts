import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultInfill, infillGeometry } from "./infills";
import { part, fresh, validate, scalePart, brief } from "./model";
import { openingKinds, wallFrame } from "./openings";
test("all opening shapes generate bounded infills with separately identified surfaces", () => {
  for (const kind of openingKinds)
    for (const type of ["door", "window"] as const) {
      const p = part();
      const o = {
        id: "infill",
        name: "Infill",
        kind,
        face: 0,
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        infill: {
          ...defaultInfill(type),
          doubleDoor: true,
          bars: "manual" as const,
          horizontal: 2,
          vertical: 2,
        },
      };
      p.openings = [o];
      p.hollowWalls = true;
      const items = infillGeometry(p, o);
      assert.ok(items.length >= 2);
      const f = wallFrame(p, 0);
      for (const item of items) {
        const a = item.geometry.getAttribute("position");
        assert.ok(a.count > 0);
        assert.ok([...a.array].every(Number.isFinite));
        for (let i = 0; i < a.count; i++) {
          const x = a.getX(i) - f.a.x,
            y = a.getY(i);
          assert.ok(x >= o.x - 1e-5 && x <= o.x + o.width + 1e-5);
          assert.ok(y >= o.y - 1e-5 && y <= o.y + o.height + 1e-5);
        }
        item.geometry.dispose();
      }
      const d = fresh();
      d.parts = [p];
      assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
      assert.equal(scalePart(p, 2).openings![0].infill!.inset, 0.16);
      assert.match(brief(d), /glassMaterial/);
      o.infill.vertical = 13;
      assert.throws(() => validate(d), /infill/);
    }
});

test("bulk infills match category and both dimensions, copy independently and preserve placement", async () => {
  const { infillTargets, copyInfill } = await import("./infills");
  const d = fresh(),
    p = part();
  const source = {
    id: "source",
    name: "Window",
    kind: "window" as const,
    face: 0,
    x: 1,
    y: 1,
    width: 2,
    height: 2,
    infill: defaultInfill("window"),
  };
  const similar = {
    ...source,
    id: "similar",
    width: 2.4,
    kind: "arched-window" as const,
    infill: undefined,
  };
  const tall = { ...source, id: "tall", height: 3, infill: undefined };
  const door = {
    ...source,
    id: "door",
    kind: "door" as const,
    infill: undefined,
  };
  p.openings = [source, similar, tall, door];
  d.parts = [p];
  assert.equal(infillTargets(d, source, true).length, 1);
  assert.equal(infillTargets(d, source, false).length, 2);
  const copied = copyInfill(d, source, false);
  assert.equal(copied.parts[0].openings![1].width, 2.4);
  assert.equal(copied.parts[0].openings![3].infill, undefined);
  assert.equal(similar.infill, undefined);
  copied.parts[0].openings![1].infill!.inset = 0.5;
  assert.equal(copied.parts[0].openings![2].infill!.inset, 0.08);
  assert.equal(source.infill.inset, 0.08);
});

test("double door gap is physical, scales and supports old saved infills", () => {
  const p = part(),
    o = {
      id: "gap",
      name: "Door",
      kind: "door" as const,
      face: 0,
      x: 1,
      y: 0,
      width: 2,
      height: 2,
      infill: { ...defaultInfill("door"), doubleDoor: true, gapWidth: 0.12 },
    };
  p.openings = [o];
  const items = infillGeometry(p, o),
    f = wallFrame(p, 0);
  items.forEach((i) => i.geometry.computeBoundingBox());
  const gap =
    items[1].geometry.boundingBox!.min.x - items[0].geometry.boundingBox!.max.x;
  assert.ok(Math.abs(gap - 0.12) < 1e-5);
  assert.equal(scalePart(p, 2).openings![0].infill!.gapWidth, 0.24);
  items.forEach((i) => i.geometry.dispose());
  delete (o.infill as { gapWidth?: number }).gapWidth;
  const d = fresh();
  d.parts = [p];
  validate(d);
  const old = infillGeometry(p, o);
  assert.equal(old.length, 2);
  old.forEach((i) => i.geometry.dispose());
});
