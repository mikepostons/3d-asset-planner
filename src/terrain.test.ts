import { test } from "node:test";
import assert from "node:assert/strict";
import { demo, part, validate } from "./model";
import { terrainPatches, overlaps } from "./terrain";
import { viewPose, referenceViews, flatView } from "./views";
test("nine unique views include five flat sides and four true isometric corners", () => {
  assert.equal(new Set(referenceViews).size, 9);
  assert.equal(referenceViews.filter(flatView).length, 5);
  for (const v of ["front", "back", "left", "right"])
    assert.equal(viewPose(v, 0).direction[1], 0);
  for (const v of referenceViews.filter((v) => !flatView(v))) {
    const [x, y, z] = viewPose(v, 0).direction;
    assert.ok(Math.abs(Math.abs(x) - y) < 1e-8);
    assert.ok(Math.abs(Math.abs(z) - y) < 1e-8);
  }
  assert.ok(Math.abs(viewPose("front", 90).direction[0] - 100) < 1e-8);
  assert.deepEqual(viewPose("top", 0).up, [0, 0, -1]);
});
test("terrain belongs once to each group or ungrouped structure and never overlaps", () => {
  const d = demo();
  d.groups = [{ id: "g", name: "Works" }];
  d.parts.forEach((p) => (p.groupId = "g"));
  const q = part();
  q.x = 40;
  d.parts.push(q);
  d.terrainLayout = "collections";
  const patches = terrainPatches(d);
  assert.equal(patches.length, 2);
  assert.equal(patches.flatMap((p) => p.parts).length, d.parts.length);
  assert.equal(overlaps(patches[0].outline, patches[1].outline), false);
  assert.equal(terrainPatches(d, "scene").length, 1);
  assert.equal(terrainPatches(d, "none").length, 0);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
});
test("touching expanded patches fuse and include elevated parts without duplicate child terrain", () => {
  const d = demo();
  d.parts[1].x = 13;
  d.parts[1].z = 0;
  d.terrainLayout = "collections";
  d.terrainMargin = 5;
  assert.equal(terrainPatches(d).length, 1);
  const q = part();
  q.x = 70;
  q.baseY = 10;
  q.shape = "circle";
  q.topDiameter = 14;
  d.parts.push(q);
  const patches = terrainPatches(d);
  assert.equal(patches.length, 2);
  assert.equal(new Set(patches.flatMap((p) => p.parts)).size, 3);
  for (let i = 0; i < patches.length; i++)
    for (let j = i + 1; j < patches.length; j++)
      assert.equal(overlaps(patches[i].outline, patches[j].outline), false);
  d.terrainMargin = -1;
  assert.throws(() => validate(d));
});
