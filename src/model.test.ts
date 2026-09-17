import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  validate,
  resizeModule,
  height,
  snap,
  warnings,
  bounds,
} from "./model";
test("round trip preserves geometry and identity", () => {
  let d = demo();
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
});
test("module rescale affects all physical values; grid-only does not", () => {
  let d = demo(),
    r = resizeModule(d, 6, true),
    g = resizeModule(d, 6, false);
  assert.equal(r.parts[1].z, d.parts[1].z * 2);
  assert.equal(r.parts[0].width, 18);
  assert.equal(height(r.parts[0]), 6);
  assert.equal(r.parts[0].rise, 3);
  assert.deepEqual(g.parts, d.parts);
});
test("reject malformed input", () => {
  let d = demo();
  d.parts[0].width = -1;
  assert.throws(() => validate(d));
  d = demo();
  d.parts[1].id = d.parts[0].id;
  assert.throws(() => validate(d));
  assert.throws(() => validate({ schemaVersion: 9 }));
});
test("snap, rotation and connection warnings", () => {
  assert.equal(snap(1.2, 0.5), 1);
  let d = demo();
  assert.equal(warnings(d).filter((x) => x.includes("detached")).length, 0);
  d.parts[1].z = -20;
  assert.equal(
    warnings(d).some((x) => x.includes("detached")),
    false,
  );
  let p = d.parts[0];
  p.rotation = 90;
  assert.ok(Math.abs(bounds(p).maxX - bounds(p).minX - p.depth) < 1e-9);
});

test("custom short heights and shaped footprints survive saving and scale correctly", () => {
  const d = demo();
  d.parts[0].wallHeight = 1.25;
  d.parts[0].footprint = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.3, 0.5],
    [-0.5, 0.5],
  ];
  const reopened = validate(JSON.parse(JSON.stringify(d)));
  assert.equal(height(reopened.parts[0]), 1.25);
  assert.equal(height(resizeModule(d, 6, true).parts[0]), 2.5);
  assert.deepEqual(
    resizeModule(d, 6, true).parts[0].footprint,
    d.parts[0].footprint,
  );
  assert.equal(height(resizeModule(d, 6, false).parts[0]), 1.25);
  d.parts[0].footprint = [
    [-0.5, -0.5],
    [0.5, 0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
  ];
  assert.throws(() => validate(d));
});

test("rotation, ridge ends, elevated circles and corner edits round-trip and rescale", () => {
  const d = demo();
  const p = d.parts[0];
  p.rotation = 37;
  p.ridgeEnds = [
    [-0.3, 1.5, 0],
    [0.3, 1.5, 0],
  ];
  p.cornerHeights = [3, 3, 3.5, 3];
  p.cornerBases = [0, 0.25, 0, 0];
  const c = d.parts[1];
  c.shape = "circle";
  c.width = c.depth = 1;
  c.baseY = 3;
  c.roof = "flat";
  c.rise = 0;
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  const scaled = resizeModule(d, 6, true);
  assert.equal(scaled.parts[1].baseY, 6);
  assert.deepEqual(scaled.parts[0].ridgeEnds, [
    [-0.3, 3, 0],
    [0.3, 3, 0],
  ]);
  assert.equal(scaled.parts[0].cornerBases?.[1], 0.5);
  assert.equal(scaled.parts[0].rotation, 37);
  p.ridgeEnds[0][0] = 6;
  assert.throws(() => validate(d));
});

test("extended ridge and taper dimensions survive saving and proportional scaling", () => {
  const d = demo();
  d.parts[0].ridgeEnds = [
    [-0.8, 1.5, 0],
    [0.75, 1.5, 0],
  ];
  d.parts[1].shape = "circle";
  d.parts[1].topDiameter = 0.4;
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  const scaled = resizeModule(d, 6, true);
  assert.equal(scaled.parts[1].topDiameter, 0.8);
  assert.equal(scaled.parts[0].ridgeEnds![0][0], -0.8);
  assert.deepEqual(resizeModule(d, 6, false).parts, d.parts);
  d.parts[1].topDiameter = -1;
  assert.throws(() => validate(d));
});

test("uniform scaling preserves placement and scales custom dimensions", async () => {
  const { scalePart, ridgeEnds } = await import("./model");
  const p = demo().parts[0];
  p.baseY = 2;
  p.wallHeight = 4;
  p.topDiameter = 2;
  p.cornerBases = [0.1, 0.2, 0.3, 0.4];
  p.cornerHeights = [4, 4.5, 4, 4.5];
  p.ridgeEnds = [
    [-0.7, 2, 0],
    [0.8, 3, 0],
  ];
  const before = structuredClone(p),
    q = scalePart(p, 2);
  assert.deepEqual(p, before);
  assert.equal(q.x, p.x);
  assert.equal(q.z, p.z);
  assert.equal(q.baseY, 2);
  assert.equal(q.rotation, p.rotation);
  assert.equal(q.floors, p.floors);
  assert.equal(q.width, p.width * 2);
  assert.equal(q.depth, p.depth * 2);
  assert.equal(height(q), 8);
  assert.equal(q.topDiameter, 4);
  assert.deepEqual(q.cornerBases, [0.2, 0.4, 0.6, 0.8]);
  assert.deepEqual(ridgeEnds(q), [
    [-0.7, 4, 0],
    [0.8, 6, 0],
  ]);
  assert.deepEqual(scalePart(q, 0.5), p);
  for (const f of [0, -1, NaN, Infinity]) assert.throws(() => scalePart(p, f));
});
