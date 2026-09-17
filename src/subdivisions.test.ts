import { test } from "node:test";
import assert from "node:assert/strict";
import { primitive, fresh, validate } from "./model";
import { subdivisionPreview } from "./subdivisions";
test("subdivision preview preserves the part and emits finite local body guides", () => {
  for (const kind of ["cube", "cylinder", "donut"] as const) {
    const p = primitive(kind, 3);
    p.subdivisions = { enabled: true, x: 8, y: 3, z: 2 };
    const before = JSON.stringify(p),
      preview = subdivisionPreview(p);
    assert.equal(JSON.stringify(p), before);
    assert.ok(
      [...preview.geometry.attributes.position.array].every(Number.isFinite),
    );
    assert.equal(
      preview.faces,
      kind === "cube" ? 2 * (24 + 16 + 6) : kind === "cylinder" ? 56 : 80,
    );
    preview.geometry.dispose();
    const d = fresh();
    d.parts = [p];
    assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
    p.subdivisions.x = 0;
    assert.throws(() => validate(d));
  }
});
