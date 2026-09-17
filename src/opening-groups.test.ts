import { test } from "node:test";
import assert from "node:assert/strict";
import { duplicateOpenings } from "./opening-groups";
import { part, fresh, validate } from "./model";
import { defaultInfill } from "./infills";
import { Stage } from "./stage";
test("duplicate openings preserve arrangement and infills with new IDs in valid space", () => {
  const p = part();
  p.width = 12;
  p.wallHeight = 6;
  p.openings = [
    {
      id: "a",
      name: "A",
      kind: "window",
      face: 0,
      x: 1,
      y: 1,
      width: 1,
      height: 1,
      infill: defaultInfill("window"),
    },
    {
      id: "b",
      name: "B",
      kind: "window",
      face: 0,
      x: 3,
      y: 1,
      width: 1,
      height: 1,
    },
  ];
  const d = fresh();
  d.parts = [p];
  const result = duplicateOpenings(d, p.id, ["a", "b"]);
  validate(result.plan);
  const copies = result.plan.parts[0].openings!.filter((o) =>
    result.ids.includes(o.id),
  );
  assert.equal(copies.length, 2);
  assert.equal(copies[1].x - copies[0].x, 2);
  assert.notEqual(copies[0].id, "a");
  assert.deepEqual(copies[0].infill, p.openings[0].infill);
  assert.notEqual(copies[0].infill, p.openings[0].infill);
  assert.equal(p.openings.length, 2);
});
test("duplicate refuses a full wall without changing the plan", () => {
  const p = part();
  p.width = 2;
  p.wallHeight = 2;
  p.openings = [
    {
      id: "a",
      name: "A",
      kind: "door",
      face: 0,
      x: 0.05,
      y: 0,
      width: 1.9,
      height: 1.95,
    },
  ];
  const d = fresh();
  d.parts = [p];
  assert.throws(() => duplicateOpenings(d, p.id, ["a"]), /no room/);
  assert.equal(p.openings.length, 1);
});
test("Shift selection toggles same-wall openings and rejects another wall", () => {
  let ids: string[] = [];
  let hint = "";
  const fake = {
    selected: "part",
    activeFace: { partId: "part", index: 0 },
    selectedOpenings: ["a"],
    cb: {
      select: () => {},
      face: () => {},
      opening: (_: string, values: string[]) => {
        ids = values;
      },
      hint: (v: string) => (hint = v),
    },
  };
  Stage.prototype.chooseOpening.call(
    fake as unknown as Stage,
    "part",
    "b",
    0,
    true,
  );
  assert.deepEqual(ids, ["a", "b"]);
  Stage.prototype.chooseOpening.call(
    fake as unknown as Stage,
    "part",
    "a",
    0,
    true,
  );
  assert.deepEqual(ids, []);
  Stage.prototype.chooseOpening.call(
    fake as unknown as Stage,
    "part",
    "c",
    1,
    true,
  );
  assert.match(hint, /same wall/);
});
