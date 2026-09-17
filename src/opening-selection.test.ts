import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { Stage } from "./stage";
import { part, fresh } from "./model";
test("decorative lines do not block opening picking, but solid meshes do", () => {
  const p = part();
  p.openings = [
    {
      id: "o",
      name: "Window",
      kind: "window",
      face: 0,
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    },
  ];
  const plan = fresh();
  plan.parts = [p];
  let blocker: T.Object3D = new T.LineSegments();
  const aids = new T.Group(),
    solids = new T.Group();
  const fake = {
    plan,
    aids,
    solids,
    xray: false,
    camera: new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100),
    renderer: {
      domElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 500,
          height: 500,
        }),
      },
    },
    getRay: () => {},
    openingPoint: () => new T.Vector2(2, 2),
    ray: {
      ray: { origin: new T.Vector3(0, 0, -20) },
      intersectObjects: (children: unknown) =>
        children === aids.children ? [] : [{ object: blocker, distance: 1 }],
    },
  };
  assert.equal(
    Stage.prototype.pickOpening.call(
      fake as unknown as Stage,
      { clientX: 250, clientY: 250 } as PointerEvent,
    )?.o.id,
    "o",
  );
  blocker = new T.Mesh();
  assert.equal(
    Stage.prototype.pickOpening.call(
      fake as unknown as Stage,
      { clientX: 250, clientY: 250 } as PointerEvent,
    ),
    undefined,
  );
});
