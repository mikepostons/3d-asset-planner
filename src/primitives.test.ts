import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  primitive,
  fresh,
  validate,
  scaleSelection,
  resizeModule,
} from "./model";
import { partGeometry } from "./geometry";

test("primitives round-trip; ring bore scales and rejects invalid walls", () => {
  const d = fresh();
  d.parts = ["cube", "cylinder", "donut"].map((k) =>
    primitive(k as "cube" | "cylinder" | "donut", 3),
  );
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  const ring = d.parts[2];
  assert.equal(scaleSelection(d, ring.id, 2).parts[2].innerDiameter, 3);
  assert.equal(resizeModule(d, 6, true).parts[2].innerDiameter, 3);
  assert.equal(resizeModule(d, 6, false).parts[2].innerDiameter, 1.5);
  ring.innerDiameter = ring.width;
  assert.throws(() => validate(d));
});

test("ring bore is open through both caps while annular wall remains pickable", () => {
  const p = primitive("donut", 3);
  for (const roof of [false, true]) {
    const geometry = partGeometry(p, roof);
    const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
    const mesh = new T.Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster(
      new T.Vector3(0, 10, 0),
      new T.Vector3(0, -1, 0),
    );
    assert.equal(ray.intersectObject(mesh).length, 0);
    ray.ray.origin.x = 1.1;
    assert.ok(ray.intersectObject(mesh).length > 0);
    geometry.dispose();
    material.dispose();
  }
});

test("tapered ring preserves four diameters and rejects either closed end", () => {
  const d = fresh(), p = primitive("donut", 3);
  p.topDiameter = 2; p.topInnerDiameter = 0.8; d.parts = [p];
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  const scaled = scaleSelection(d,p.id,2).parts[0];
  assert.equal(scaled.topInnerDiameter,1.6);
  assert.equal(scaled.topDiameter,4);
  assert.equal(resizeModule(d,6,true).parts[0].topInnerDiameter,1.6);
  for (const roof of [false,true]) {
    const g = partGeometry(p,roof), mesh = new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0));
    assert.equal(ray.intersectObject(mesh).length,0);
    const positions = g.getAttribute('position');
    const topRadii = Array.from({length:positions.count},(_,i)=>i).filter(i=>Math.abs(positions.getY(i)-(roof?3.12:3))<1e-5).map(i=>Math.hypot(positions.getX(i),positions.getZ(i)));
    assert.ok(Math.abs(Math.min(...topRadii)-0.4)<1e-5);
    assert.ok(Math.abs(Math.max(...topRadii)-1)<1e-5);
    g.dispose(); mesh.material.dispose();
  }
  p.topInnerDiameter = 2;
  assert.throws(()=>validate(d));
  p.topInnerDiameter = 0.8; p.innerDiameter = 3;
  assert.throws(()=>validate(d));
});

test("disabled roofs retain settings but contribute no roof geometry or height", async () => {
  const { part, topY, brief } = await import('./model');
  const p = part(), d = fresh();
  p.roofEnabled = false; p.rise = 8; d.parts = [p];
  assert.equal(topY(p), p.floors * p.floorHeight);
  assert.equal(partGeometry(p,true).getAttribute('position'), undefined);
  assert.ok(partGeometry(p,false).getAttribute('position').count > 0);
  assert.equal(validate(JSON.parse(JSON.stringify(d))).parts[0].roofEnabled,false);
  assert.match(brief(d),/roof disabled/);
  p.roofEnabled = true;
  assert.equal(topY(p),p.floors*p.floorHeight+8);
  assert.ok(partGeometry(p,true).getAttribute('position').count > 0);
});
