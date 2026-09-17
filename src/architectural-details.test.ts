import { test } from "node:test";
import assert from "node:assert/strict";
import {
  architecturalGeometry,
  defaultDetails,
  reconcileThresholds,
} from "./architectural-details";
import { part, fresh, validate, scalePart, brief } from "./model";
function fixture() {
  const p = part();
  p.architecturalDetails = { ...defaultDetails(), quoins: true };
  p.openings = [
    {
      id: "door",
      name: "Door",
      kind: "door",
      face: 0,
      x: 2,
      y: 0,
      width: 1,
      height: 2,
    },
  ];
  return p;
}
test("thresholds lift openings idempotently and restore their original elevation", () => {
  const p = fixture(),
    raised = reconcileThresholds(p);
  assert.equal(raised.openings![0].y, 0.12);
  assert.deepEqual(reconcileThresholds(raised), raised);
  const disabled = reconcileThresholds({
    ...raised,
    architecturalDetails: { ...raised.architecturalDetails!, enabled: false },
  });
  assert.equal(disabled.openings![0].y, 0);
  const override = reconcileThresholds({
    ...raised,
    openings: raised.openings!.map((o) => ({ ...o, detailsMode: "off" })),
  });
  assert.equal(override.openings![0].y, 0);
  const high = fixture();
  high.openings![0].height = 6;
  const d = fresh();
  d.parts = [reconcileThresholds(high)];
  assert.throws(() => validate(d), /fit/);
});
test("seeded geometry is finite, stable and responds to seed with outward projection", () => {
  const p = reconcileThresholds(fixture());
  const first = architecturalGeometry(p),
    second = architecturalGeometry(p);
  assert.ok(first.some((v) => v.name === "Quoin"));
  assert.ok(first.some((v) => v.name === "Threshold"));
  assert.deepEqual(
    Array.from(first[0].geometry.attributes.position.array),
    Array.from(second[0].geometry.attributes.position.array),
  );
  first.forEach((v) =>
    assert.ok(
      Array.from(v.geometry.attributes.position.array).every(Number.isFinite),
    ),
  );
  first[0].geometry.computeBoundingBox();
  assert.ok(first[0].geometry.boundingBox!.min.z < -p.depth / 2);
  p.architecturalDetails!.seed = 8;
  const changed = architecturalGeometry(p);
  assert.notDeepEqual(
    Array.from(first[0].geometry.attributes.position.array),
    Array.from(changed[0].geometry.attributes.position.array),
  );
  [...first, ...second, ...changed].forEach((v) => v.geometry.dispose());
});
test("details persist, scale and include export metadata; legacy parts remain valid", () => {
  const p = reconcileThresholds(fixture()),
    d = fresh();
  d.parts = [p];
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  assert.match(brief(d), /Architectural details/);
  const scaled = scalePart(p, 2);
  assert.equal(scaled.architecturalDetails!.projection, 0.16);
  assert.equal(scaled.openings![0].thresholdLift, 0.24);
  assert.equal(reconcileThresholds(scaled).openings![0].y, 0.24);
  p.architecturalDetails!.seed = NaN;
  assert.throws(() => validate(d), /settings/);
  d.parts = [part()];
  validate(d);
});

test("cill width and projection are independent, centred, scalable and legacy compatible", () => {
  const p = fixture();
  p.architecturalDetails = {
    ...defaultDetails(),
    cillWidthAdjustment: -0.2,
    cillProjection: 0.6,
  };
  const geometry = architecturalGeometry(p);
  const cill = geometry.find((v) => v.name === "Threshold")!.geometry;
  cill.computeBoundingBox();
  const box = cill.boundingBox!;
  assert.ok(Math.abs(box.max.x - box.min.x - 0.8) < 1e-5);
  assert.ok(
    Math.abs((box.max.x + box.min.x) / 2 - (-p.width / 2 + 2.5)) < 1e-5,
  );
  assert.ok(Math.abs(box.min.z - (-p.depth / 2 - 0.6)) < 1e-5);
  const lintel = geometry.find((v) => v.name === "Lintel")!.geometry;
  lintel.computeBoundingBox();
  assert.ok(Math.abs(lintel.boundingBox!.min.z - (-p.depth / 2 - 0.08)) < 1e-5);
  geometry.forEach((v) => v.geometry.dispose());
  const scaled = scalePart(p, 2).architecturalDetails!;
  assert.equal(scaled.cillWidthAdjustment, -0.4);
  assert.equal(scaled.cillProjection, 1.2);
  p.architecturalDetails.cillWidthAdjustment = -2;
  const d = fresh();
  d.parts = [p];
  assert.throws(() => validate(d), /Cill width/);
});

test("arched and circular surrounds keep clearance and a single centred crown keystone", async () => {
  const T = await import("three");
  for (const kind of [
    "arched-door",
    "arched-window",
    "circle-window",
  ] as const) {
    const p = fixture();
    p.architecturalDetails = {
      ...defaultDetails(),
      jambs: false,
      cills: false,
      quoins: false,
      arches: true,
      keystones: true,
    };
    p.openings = [
      {
        id: "arch",
        name: "Arch",
        kind,
        face: 0,
        x: 2,
        y: 1,
        width: 2,
        height: 2,
      },
    ];
    const items = architecturalGeometry(p);
    assert.equal(items.filter((v) => v.name === "Keystone").length, 1);
    assert.equal(items.length, kind === "circle-window" ? 31 : 15);
    const key = items.find((v) => v.name === "Keystone")!.geometry;
    key.computeBoundingBox();
    const box = key.boundingBox!;
    assert.ok(
      Math.abs((box.min.x + box.max.x) / 2 - (-p.width / 2 + 3)) < 1e-5,
    );
    const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
    const meshes = items.map((item) => {
      assert.ok(
        [...item.geometry.attributes.position.array].every(Number.isFinite),
      );
      const mesh = new T.Mesh(item.geometry, material);
      mesh.updateMatrixWorld();
      return mesh;
    });
    // Sample just inside the clear upper curve; trim must never obstruct it.
    const cy = kind === "circle-window" ? 2 : 2;
    for (let i = 1; i < 32; i++) {
      const angle = (i * Math.PI) / 32;
      const ray = new T.Raycaster(
        new T.Vector3(
          -p.width / 2 + 3 + 0.94 * Math.cos(angle),
          cy + 0.94 * Math.sin(angle),
          -10,
        ),
        new T.Vector3(0, 0, 1),
      );
      assert.equal(ray.intersectObjects(meshes).length, 0);
    }
    items.forEach((v) => v.geometry.dispose());
    material.dispose();
    p.architecturalDetails.arches = false;
    assert.equal(architecturalGeometry(p).length, 0);
    const scaled = scalePart(p, 2);
    assert.equal(scaled.architecturalDetails!.archWidth, 0.36);
  }
});

test("quoins wrap the outer corner as single alternating long-short blocks", async () => {
  const T = await import("three"),
    p = fixture();
  p.openings = [];
  p.architecturalDetails = {
    ...defaultDetails(),
    jambs: false,
    lintels: false,
    cills: false,
    quoins: true,
    variation: 0,
  };
  const items = architecturalGeometry(p);
  const first = items[0].geometry,
    second = items[1].geometry;
  first.computeBoundingBox();
  second.computeBoundingBox();
  const a = first.boundingBox!,
    b = second.boundingBox!;
  assert.ok(a.max.x - a.min.x > a.max.z - a.min.z);
  assert.ok(b.max.x - b.min.x < b.max.z - b.min.z);
  const mesh = new T.Mesh(
    first,
    new T.MeshBasicMaterial({ side: T.DoubleSide }),
  );
  mesh.updateMatrixWorld();
  // The former two-strip version left this outer corner entirely empty.
  const ray = new T.Raycaster(
    new T.Vector3(-p.width / 2 - 0.04, 2, -p.depth / 2 - 0.04),
    new T.Vector3(0, -1, 0),
  );
  assert.ok(ray.intersectObject(mesh).length > 0);
  items.forEach((v) => v.geometry.dispose());
  mesh.material.dispose();
});
