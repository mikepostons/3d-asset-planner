import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { part, fresh, validate, scalePart, resizeModule, brief } from "./model";
import { partGeometry } from "./geometry";
import { openingKinds, openingOutline, type Opening, wallFrame } from "./openings";
const opening = (kind: Opening["kind"]): Opening => ({
  id: "test-opening",
  name: kind,
  kind,
  face: 0,
  x: 3,
  y: kind.endsWith("door") ? 0 : 1,
  width: 2,
  height: 2,
});
function hits(p: ReturnType<typeof part>, x: number, y: number) {
  const geometry = partGeometry(p, false),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    mesh = new T.Mesh(geometry, material);
  mesh.updateMatrixWorld();
  const ray = new T.Raycaster(
    new T.Vector3(x, y, -4),
    new T.Vector3(0, 0, 1),
    0,
    2,
  );
  const result = ray.intersectObject(mesh).length;
  geometry.dispose();
  material.dispose();
  return result;
}
test("all five opening shapes cut hollow walls and leave neighbouring wall intact", () => {
  for (const kind of openingKinds) {
    const p = part();
    p.hollowWalls = true;
    p.wallThickness = 0.4;
    p.openings = [opening(kind)];
    const d = fresh();
    d.parts = [p];
    validate(d);
    assert.equal(hits(p, -0.5, kind.endsWith("door") ? 1 : 2), 0, kind);
    assert.ok(hits(p, -3, 1) > 0, kind + " adjacent wall");
    const g = partGeometry(p, false);
    assert.ok([...g.attributes.position.array].every(Number.isFinite));
    g.dispose();
  }
});
test("solid recess has a back; openings serialize, scale and reject overlap or wall overflow", () => {
  const p = part();
  p.openings = [opening("window")];
  assert.ok(hits(p, -0.5, 2) > 0);
  const d = fresh();
  d.parts = [p];
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  assert.match(brief(d), /test-opening/);
  assert.equal(scalePart(p, 2).openings![0].width, 4);
  assert.equal(resizeModule(d, 6, true).parts[0].openings![0].x, 6);
  p.openings.push({ ...opening("window"), id: "other" });
  assert.throws(() => validate(d), /separation/);
  p.openings.pop();
  p.width = 3;
  assert.throws(() => validate(d), /fit/);
});
test("local wall coordinates follow reshaped footprint and each face is stable", () => {
  const p = part();
  p.footprint = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.4, 0.5],
    [-0.5, 0.5],
  ];
  p.hollowWalls = true;
  p.openings = [opening("arched-door")];
  const d = fresh();
  d.parts = [p];
  validate(d);
  assert.equal(wallFrame(p, 0).length, p.width);
  const g = partGeometry(p, false);
  assert.ok([...g.attributes.position.array].every(Number.isFinite));
  g.dispose();
});

test("wall-local opening edits snap, anchor opposite edges and preserve circles", async () => {
  const { editOpening } = await import("./openings");
  const o = {
    id: "edit",
    name: "Window",
    kind: "window" as const,
    face: 2,
    x: 1,
    y: 1,
    width: 2,
    height: 2,
  };
  const moved = editOpening(o, "move", 0.62, 0.24, 0.5, 0);
  assert.equal(moved.x, 1.5);
  assert.equal(moved.y, 1);
  assert.equal(moved.face, 2);
  const resized = editOpening(o, "sw", -0.5, -0.5, 0.5, 0);
  assert.equal(resized.x + resized.width, 3);
  assert.equal(resized.y + resized.height, 3);
  const circle = editOpening(
    { ...o, kind: "circle-window" },
    "e",
    1,
    0,
    0.5,
    0,
  );
  assert.equal(circle.width, 3);
  assert.equal(circle.height, 3);
  assert.equal(circle.y, 0.5);
  assert.equal(o.width, 2);
});

test("hollow opening reveals project perpendicular to each wall without shrinking the inner cut", () => {
  for (const kind of openingKinds)
    for (let face = 0; face < 4; face++) {
      const p = part();
      p.hollowWalls = true;
      p.wallThickness = 0.6;
      p.footprint = [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.4, 0.5],
        [-0.5, 0.5],
      ];
      const o = { ...opening(kind), face, x: 1.2, width: 1.5 };
      p.openings = [o];
      const f = wallFrame(p, face);
      const g = partGeometry(p, false);
      const a = g.getAttribute("position");
      // Both jambs must have vertices directly behind their exterior endpoints,
      // even for off-centre openings and non-rectangular footprints.
      for (const v of openingOutline(o)) {
        const expected = f.point(v.x, v.y, 0.6);
        let found = false;
        for (let i = 0; i < a.count; i++)
          if (
            new T.Vector3().fromBufferAttribute(a, i).distanceTo(expected) <
            1e-5
          )
            found = true;
        assert.ok(found, kind + " face " + face + " perpendicular jamb");
      }
      g.dispose();
    }
});

test('fine opening snaps allow valid end-wall moves that coarse grid steps reject',async()=>{
 const {editOpening}=await import('./openings');const {defaultRoofDetails}=await import('./roof-details');
 const p=part();p.roofDetails={...defaultRoofDetails(),gableStart:'material',gableStartBaseFloor:1};
 const o={...opening('window'),face:3,x:1,y:4.5,width:1,height:1};
 const fine=editOpening(o,'move',.07,.3,.05,0);assert.ok(Math.abs(fine.x-1.05)<1e-8);assert.ok(Math.abs(fine.y-4.8)<1e-8);
 validate({...fresh(),parts:[{...p,openings:[fine]}]});
 const coarse=editOpening(o,'move',0,.3,.5,0);assert.throws(()=>validate({...fresh(),parts:[{...p,openings:[coarse]}]}),/fit within/);
 const precise=editOpening(o,'e',.03,0,.01,0);assert.ok(Math.abs(precise.width-1.03)<1e-8);
});
