import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditHandle, type SelectionMode } from "./editing";
const handles = [
  "move",
  "rotate",
  "vertex:0",
  "ridge:1",
  "edge:0",
  "vertical:2",
  "face:0",
  "height",
  "roof",
  "radius-top",
  "radius-bottom",
];
test("Move and Rotate cannot pick geometry editing handles", () => {
  for (const mode of ["vertices", "edges", "faces"] as SelectionMode[]) {
    assert.deepEqual(
      handles.filter((h) => canEditHandle("move", mode, h)),
      ["move"],
    );
    assert.deepEqual(
      handles.filter((h) => canEditHandle("rotate", mode, h)),
      ["rotate"],
    );
    assert.equal(
      handles.some((h) => canEditHandle("draw", mode, h)),
      false,
    );
  }
});
test("selection modes isolate corners, edges and face handles", () => {
  assert.deepEqual(
    handles.filter((h) => canEditHandle("select", "vertices", h)),
    ["vertex:0", "ridge:1"],
  );
  assert.equal(canEditHandle("select", "edges", "face:0"), false);
  assert.equal(canEditHandle("select", "edges", "vertex:0"), false);
  assert.equal(canEditHandle("select", "edges", "vertical:2"), true);
  assert.equal(canEditHandle("select", "faces", "vertex:0"), false);
  assert.equal(canEditHandle("select", "faces", "edge:0"), false);
  assert.equal(canEditHandle("select", "faces", "face:0"), true);
  assert.equal(canEditHandle("select", "faces", "radius-top"), true);
});
