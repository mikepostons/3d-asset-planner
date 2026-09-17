import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  clone,
  part,
  sceneStructures,
  selectedParts,
  assignGroup,
  normaliseScene,
  translateSelection,
  validate,
  warnings,
  brief,
} from "./model";
test("structures follow connected geometry, including overlapping parts, and split when detached", () => {
  const d = demo();
  assert.equal(sceneStructures(d).length, 1);
  const q = part();
  q.x = 40;
  d.parts.push(q);
  assert.equal(sceneStructures(d).length, 2);
  d.parts[1].z = 40;
  assert.equal(sceneStructures(d).length, 3);
  d.parts[1].z = 0;
  assert.equal(sceneStructures(d).length, 2);
  assert.ok(!warnings(d).some((s) => /detached|exactly one|overlaps/.test(s)));
  assert.doesNotThrow(() => validate(d));
});
test("reparenting any connected part assigns its entire structure; disconnected parts can share a group", () => {
  const d = demo();
  d.groups = [{ id: "g", name: "Harbour" }];
  const q = part();
  q.x = 40;
  d.parts.push(q);
  let n = assignGroup(d, d.parts[1].id, "g");
  assert.deepEqual(
    n.parts.map((p) => p.groupId),
    ["g", "g", undefined],
  );
  n = assignGroup(n, q.id, "g");
  assert.equal(selectedParts(n, "group:g").length, 3);
  n = assignGroup(n, d.parts[0].id);
  assert.deepEqual(
    n.parts.map((p) => p.groupId),
    [undefined, undefined, "g"],
  );
  assert.equal(d.parts[0].groupId, undefined);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(n))), n);
  assert.match(brief(n), /Harbour/);
});
test("joining parts inherit a group and group translation preserves all relative positions and geometry", () => {
  const d = demo();
  d.groups = [{ id: "g", name: "Works" }];
  d.parts[1].groupId = "g";
  const n = normaliseScene(d);
  assert.equal(n.parts[0].groupId, "g");
  const moved = translateSelection(n, "group:g", 3, 2, -4);
  for (let i = 0; i < n.parts.length; i++) {
    assert.equal(moved.parts[i].x, n.parts[i].x + 3);
    assert.equal(moved.parts[i].z, n.parts[i].z - 4);
    assert.equal(moved.parts[i].baseY, 2);
    const original = clone(moved.parts[i]);
    original.x = n.parts[i].x;
    original.z = n.parts[i].z;
    delete original.baseY;
    assert.deepEqual(original, n.parts[i]);
  }
  const clamped = translateSelection(moved, "group:g", 0, -20, 0);
  assert.ok(clamped.parts.every((p) => p.baseY === 0));
});
test("invalid group references and duplicate groups are rejected; legacy plans remain supported", () => {
  const d = demo();
  assert.deepEqual(validate(d), d);
  d.parts[0].groupId = "missing";
  assert.throws(() => validate(d));
  d.groups = [
    { id: "missing", name: "A" },
    { id: "missing", name: "B" },
  ];
  assert.throws(() => validate(d));
});

test("groups control child aspects while ungrouped structure directions persist", async () => {
  const { mainAspect } = await import("./model");
  const d = demo();
  d.front = 90;
  const id = sceneStructures(d)[0].id;
  assert.equal(mainAspect(d, "structure:" + id), 90);
  d.groups = [{ id: "g", name: "Works", mainAspect: 180 }];
  d.parts.forEach((p) => (p.groupId = "g"));
  assert.equal(mainAspect(d, "group:g"), 180);
  assert.equal(mainAspect(d, "structure:" + id), 180);
  d.structureAspects = { [id]: 45 };
  assert.equal(mainAspect(d, "structure:" + id), 180);
  assert.equal(mainAspect(d, "group:g"), 180);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  assert.match(brief(d), /Main aspect: 180°/);
  d.parts.forEach((p) => delete p.groupId);
  assert.equal(mainAspect(d, "structure:" + id), 45);
  d.structureAspects[id] = 62;
  assert.equal(validate(d).structureAspects?.[id], 45);
  assert.equal(mainAspect(d, "structure:" + id), 45);
  d.structureAspects[id] = 360;
  assert.throws(() => validate(d));
  d.structureAspects[id] = 45;
  d.groups[0].mainAspect = NaN;
  assert.throws(() => validate(d));
});

test("collection scaling scales dimensions, spacing and elevations about a shared base pivot", async () => {
  const { scaleSelection, estimatedFloors, height } = await import("./model");
  const d = demo();
  d.groups = [{ id: "g", name: "Works" }];
  d.parts.forEach((p) => (p.groupId = "g"));
  d.parts[1].baseY = 2;
  const n = scaleSelection(d, "group:g", 2);
  assert.equal(n.parts[1].x - n.parts[0].x, (d.parts[1].x - d.parts[0].x) * 2);
  assert.equal(n.parts[1].z - n.parts[0].z, (d.parts[1].z - d.parts[0].z) * 2);
  assert.equal(n.parts[1].baseY, 4);
  assert.equal(n.parts[0].width, d.parts[0].width * 2);
  assert.equal(height(n.parts[0]), height(d.parts[0]) * 2);
  const p = d.parts[0];
  p.wallHeight = 3.9;
  p.floorHeight = 3;
  assert.equal(estimatedFloors(p), 1.3);
  p.wallHeight = 6;
  assert.equal(estimatedFloors(p), 2);
  p.wallHeight = undefined;
  p.floors = 1.5;
  assert.equal(height(p), 4.5);
  assert.doesNotThrow(() => validate(d));
});
