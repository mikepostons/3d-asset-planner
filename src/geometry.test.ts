import { test } from "node:test";
import assert from "node:assert/strict";
import { part, snapTo, polygonsTouch, height } from "./model";
import { partGeometry } from "./geometry";
test("height alignment wins over regular grid and otherwise falls back to grid", () => {
  assert.deepEqual(snapTo(2.17, 0.5, [2.2, 3]), { value: 2.2, aligned: true });
  assert.deepEqual(snapTo(2.48, 0.5, [2.2, 3]), { value: 2.5, aligned: false });
});
test("all roof styles follow a convex footprint and remain finite", () => {
  const p = part();
  p.wallHeight = 1.25;
  p.footprint = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.25, 0.5],
    [-0.5, 0.5],
  ];
  for (const roof of ["flat", "gable", "lean-to"] as const) {
    p.roof = roof;
    const g = partGeometry(p, true);
    g.computeBoundingBox();
    assert.equal(g.boundingBox!.min.y, 1.25);
    assert.ok(g.boundingBox!.max.y > 1.25);
    assert.ok([...g.attributes.position.array].every(Number.isFinite));
    g.dispose();
  }
});
test("polygon contact does not report a connection across empty clipped corners", () => {
  const a = part(),
    b = part();
  a.width = a.depth = 4;
  a.footprint = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0, 0.5],
    [-0.5, 0.5],
  ];
  b.width = b.depth = 0.4;
  b.x = 1.8;
  b.z = 1.8;
  assert.equal(polygonsTouch(a, b, 0.02), false);
  b.x = -2.2;
  b.z = 0;
  assert.equal(polygonsTouch(a, b, 0.02), true);
});

test("inset ridge produces low hip ends while keeping the central roof height", () => {
  const p = part();
  p.ridgeEnds = [
    [-0.3, 1.5, 0],
    [0.3, 1.5, 0],
  ];
  const g = partGeometry(p, true),
    v = g.attributes.position;
  let high = 0,
    endHigh = 0;
  for (let i = 0; i < v.count; i++) {
    high = Math.max(high, v.getY(i));
    if (Math.abs(v.getX(i)) > p.width * 0.49)
      endHigh = Math.max(endHigh, v.getY(i));
  }
  assert.equal(high, 7.5);
  assert.equal(endHigh, 6);
  g.dispose();
});
test("circular parts produce a circular footprint and editable wall corner heights reach geometry", () => {
  const p = part();
  p.shape = "circle";
  p.width = p.depth = 2;
  p.roof = "flat";
  const g = partGeometry(p, false),
    v = g.attributes.position;
  for (let i = 0; i < v.count; i++)
    assert.ok(
      Math.hypot(v.getX(i), v.getZ(i)) < 1e-6 ||
        Math.abs(Math.hypot(v.getX(i), v.getZ(i)) - 1) < 1e-6,
    );
  g.dispose();
  delete p.shape;
  p.cornerHeights = [4, 5, 6, 7];
  p.cornerBases = [0, 0.5, 0, 0];
  const wall = partGeometry(p, false);
  const ys = Array.from(wall.attributes.position.array).filter(
    (_, i) => i % 3 === 1,
  );
  assert.ok(ys.includes(7));
  assert.ok(ys.includes(0.5));
  wall.dispose();
});

import { floorLevels, partsTouch, topY } from "./model";
test("floor estimates respect module and elevated parts cannot connect across an air gap", () => {
  const a = part(),
    b = part();
  a.wallHeight = 7;
  a.baseY = 1;
  assert.deepEqual(floorLevels(a, 3), [4, 7]);
  b.shape = "circle";
  b.width = b.depth = 1;
  b.baseY = topY(a) + 1;
  assert.equal(partsTouch(a, b), false);
  b.baseY = topY(a) - 0.1;
  assert.equal(partsTouch(a, b), true);
  b.roof = "flat";
  b.rise = 9;
  assert.equal(topY(b), b.baseY! + 6.12);
});

test("extended ridge geometry reaches beyond the wall footprint", () => {
  const p = part();
  p.ridgeEnds = [
    [-0.8, 1.5, 0],
    [0.75, 1.5, 0],
  ];
  const g = partGeometry(p, true);
  g.computeBoundingBox();
  assert.ok(Math.abs(g.boundingBox!.min.x + p.width * 0.8) < 1e-5);
  assert.ok(Math.abs(g.boundingBox!.max.x - p.width * 0.75) < 1e-5);
  g.dispose();
});
test("tapered cylinders and top caps use independent end diameters", () => {
  const p = part();
  p.shape = "circle";
  p.roof = "flat";
  p.width = p.depth = 4;
  p.topDiameter = 1;
  for (const isRoof of [false, true]) {
    const g = partGeometry(p, isRoof),
      v = g.attributes.position;
    let top = 0,
      bottom = 0;
    for (let i = 0; i < v.count; i++) {
      const radius = Math.hypot(v.getX(i), v.getZ(i));
      if (v.getY(i) >= height(p) - 1e-6) top = Math.max(top, radius);
      else bottom = Math.max(bottom, radius);
    }
    assert.ok(Math.abs(top - 0.5) < 1e-6);
    if (!isRoof) assert.ok(Math.abs(bottom - 2) < 1e-6);
    g.dispose();
  }
});
