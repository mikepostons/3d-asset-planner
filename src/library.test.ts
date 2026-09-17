import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Library } from "../server/library";
import { demo } from "./model";
test("SQLite scenes persist across reopen and saves update rather than duplicate", () => {
  const dir = mkdtempSync(join(tmpdir(), "asset-library-")),
    path = join(dir, "test.sqlite");
  let db = new Library(path);
  try {
    const p = db.createProject("Works"),
      plan = demo();
    const saved = db.save(plan.id, { plan, projectId: p.id, version: 0 });
    assert.equal(saved.version, 1);
    db.close();
    db = new Library(path);
    assert.deepEqual(db.scene(plan.id)?.plan, plan);
    assert.equal(db.projects().length, 1);
    plan.name = "Harbour works";
    assert.equal(
      db.save(plan.id, { plan, projectId: null, version: 1 }).version,
      2,
    );
    assert.equal(db.scenes().length, 1);
    assert.equal(db.scene(plan.id)?.projectId, null);
    assert.throws(
      () => db.save(plan.id, { plan, version: 1 }),
      /saved elsewhere/,
    );
    assert.equal(db.scene(plan.id)?.version, 2);
    assert.throws(() =>
      db.save(plan.id, { plan, version: 2, projectId: "missing" }),
    );
    assert.equal(db.scene(plan.id)?.version, 2);
    assert.throws(() =>
      db.save(plan.id, { plan: { ...plan, parts: "broken" }, version: 2 }),
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
