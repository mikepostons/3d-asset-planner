import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  clusterLayout,
  defaultClusters,
  defaultBands,
  clusterPlacements,
  dressingGeometry,
} from "./stone-dressing";
import { part, fresh, validate, scalePart, brief } from "./model";
import { defaultDetails } from "./architectural-details";
function fixture() {
  const p = part();
  p.width = 12;
  p.wallHeight = 8;
  p.stoneClusters = {
    ...defaultClusters(),
    clearance: 0.3,
    clusters: [{ id: "patch", seed: 12, count: 20, spread: 2 }],
  };
  return p;
}
test("clusters are deterministic, separated, avoid edges/opening surrounds and scale", () => {
  const p = fixture();
  p.architecturalDetails = defaultDetails();
  p.openings = [
    {
      id: "window",
      name: "Window",
      kind: "window",
      face: 0,
      x: 2,
      y: 2,
      width: 2,
      height: 2,
    },
  ];
  const { stones } = clusterPlacements(p);
  assert.ok(stones.length > 0);
  assert.deepEqual(clusterPlacements(p).stones, stones);
  for (let i = 0; i < stones.length; i++) {
    const s = stones[i];
    assert.ok(s.u - s.width / 2 >= 0.3);
    assert.ok(s.y - s.height / 2 >= 0.3);
    if (s.face === 0)
      assert.ok(
        s.u + s.width / 2 + 0.3 <= 1.76 ||
          s.u - s.width / 2 - 0.3 >= 4.24 ||
          s.y + s.height / 2 + 0.3 <= 1.88 ||
          s.y - s.height / 2 - 0.3 >= 4.2,
      );
    for (const q of stones.slice(i + 1))
      if (q.face === s.face)
        assert.ok(
          Math.abs(q.u - s.u) >= (q.width + s.width) / 2 + 0.025 - 1e-8 ||
            Math.abs(q.y - s.y) >= (q.height + s.height) / 2 + 0.025 - 1e-8,
        );
  }
  const d = fresh();
  d.parts = [p];
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  assert.match(brief(d), /Stone clusters/);
  const scaled = scalePart(p, 2);
  assert.equal(scaled.stoneClusters!.size, 0.6);
  assert.equal(scaled.stoneClusters!.clusters[0].spread, 4);
  p.stoneClusters!.clusters[0].count = 100;
  assert.throws(() => validate(d), /cluster/);
});
test("tapered cylinder and donut stones follow only the outer wall", () => {
  for (const donut of [false, true]) {
    const p = fixture();
    p.shape = "circle";
    p.width = p.depth = 5;
    p.topDiameter = 3;
    if (donut) {
      p.innerDiameter = 3;
      p.topInnerDiameter = 2;
    }
    const items = dressingGeometry(p);
    assert.ok(items.length > 0);
    for (const { geometry } of items) {
      const a = geometry.getAttribute("position");
      for (let i = 0; i < a.count; i++) {
        const r = Math.hypot(a.getX(i), a.getZ(i)),
          surface = T.MathUtils.lerp(2.5, 1.5, a.getY(i) / 8);
        assert.ok(Number.isFinite(r));
        assert.ok(r >= surface - 0.014 && r < surface + 0.2);
      }
      geometry.dispose();
    }
  }
});
test("end bands preserve tapered donut bore even with coarse stone counts; solid caps only on cylinders", () => {
  const p = fixture();
  p.shape = "circle";
  p.width = p.depth = 5;
  p.topDiameter = 4;
  p.innerDiameter = 3;
  p.topInnerDiameter = 3.5;
  p.stoneClusters = undefined;
  p.stoneBands = {
    ...defaultBands(),
    top: true,
    bottom: true,
    count: 4,
    solidCap: true,
  };
  const items = dressingGeometry(p);
  assert.equal(items.length, 8);
  assert.ok(!items.some((v) => v.name === "Solid cap"));
  const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  for (const item of items) {
    const mesh = new T.Mesh(item.geometry, material);
    mesh.updateMatrixWorld();
    for (let j = 0; j < 32; j++) {
      const ray = new T.Raycaster(
        new T.Vector3(
          1.49 * Math.cos((j * Math.PI) / 16),
          20,
          1.49 * Math.sin((j * Math.PI) / 16),
        ),
        new T.Vector3(0, -1, 0),
      );
      assert.equal(ray.intersectObject(mesh).length, 0);
    }
    item.geometry.dispose();
  }
  material.dispose();
  delete p.innerDiameter;
  delete p.topInnerDiameter;
  const capped = dressingGeometry(p);
  assert.equal(capped.filter((v) => v.name === "Solid cap").length, 2);
  capped.forEach((v) => v.geometry.dispose());
});

test("adding a cluster preserves all existing stone positions", () => {
  const p = fixture(),
    before = clusterPlacements(p).stones;
  p.stoneClusters!.clusters.push({ id: "new", seed: 99, count: 12, spread: 1 });
  assert.deepEqual(
    clusterPlacements(p).stones.filter((s) => s.clusterId === "patch"),
    before,
  );
});

test("explicit cluster face survives seed changes and serialization", () => {
  for (let face = 0; face < 4; face++) {
    const p = fixture();
    p.stoneClusters!.clusters[0].face = face;
    for (const seed of [1, 9, 42]) {
      p.stoneClusters!.seed = seed;
      assert.ok(clusterPlacements(p).stones.every((s) => s.face === face));
    }
    const d = fresh();
    d.parts = [p];
    assert.equal(
      validate(JSON.parse(JSON.stringify(d))).parts[0].stoneClusters!
        .clusters[0].face,
      face,
    );
    p.stoneClusters!.clusters[0].face = 4;
    assert.throws(() => validate(d), /cluster/);
  }
});

test("clusters skip a wall covered by another part but return when it moves away", () => {
  const p = fixture();
  p.stoneClusters!.clusters[0].face = 0;
  const exposed = clusterPlacements(p).stones;
  assert.ok(exposed.length > 0);
  const extension = part();
  extension.id = "extension";
  extension.width = p.width + 2;
  extension.depth = 4;
  extension.wallHeight = 10;
  extension.roofEnabled = false;
  extension.z = -p.depth / 2 - extension.depth / 2;
  assert.equal(clusterPlacements(p, [p, extension]).stones.length, 0);
  extension.baseY = 20;
  assert.deepEqual(clusterPlacements(p, [p, extension]).stones, exposed);
});

test("row patterns are complete, staggered and separated from other clusters", () => {
  const p = fixture();
  p.stoneClusters!.variation = 0;
  p.stoneClusters!.clusterSpacing = 0.8;
  p.stoneClusters!.clusters = [
    { id: "a", seed: 1, count: 7, spread: 1, layout: "2-3-2", face: 0 },
    { id: "b", seed: 2, count: 3, spread: 1, layout: "1-2", face: 0 },
  ];
  const stones = clusterPlacements(p).stones;
  for (const [id, expected] of [
    ["a", [2, 3, 2]],
    ["b", [1, 2]],
  ] as const) {
    const patch = stones.filter((q) => q.clusterId === id);
    const rows = [...new Set(patch.map((q) => q.y))].sort((a, b) => a - b);
    assert.deepEqual(
      rows.map((y) => patch.filter((q) => q.y === y).length),
      [...expected],
    );
    const first = patch
      .filter((q) => q.y === rows[0])
      .sort((a, b) => a.u - b.u);
    const next = patch.filter((q) => q.y === rows[1]).sort((a, b) => a.u - b.u);
    assert.ok(Math.abs(first[0].u - next[0].u - (0.3 + 0.025) / 2) < 1e-6);
  }
  for (const a of stones.filter((q) => q.clusterId === "a"))
    for (const b of stones.filter((q) => q.clusterId === "b")) {
      assert.ok(
        Math.abs(a.u - b.u) >= (a.width + b.width) / 2 + 0.8 ||
          Math.abs(a.y - b.y) >= (a.height + b.height) / 2 + 0.8,
      );
    }
});

test("mixed layouts favour small patches, remain deterministic and preserve overrides", () => {
  const config = defaultClusters();
  const counts: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    const c = { id: `patch-${i}`, seed: 1, count: 8, spread: 1 };
    const layout = clusterLayout(config, c);
    assert.equal(layout, clusterLayout(config, { ...c, layout: "auto" }));
    assert.equal(layout, clusterLayout(config, c));
    counts[layout] = (counts[layout] ?? 0) + 1;
    assert.equal(clusterLayout(config, { ...c, layout: "2-3-2" }), "2-3-2");
  }
  assert.ok(counts["1-2"] > 420 && counts["1-2"] < 580);
  assert.ok(counts["2-3"] > counts["2-3-2"]);
  assert.ok(counts["2-3-2"] > counts["3-2-3"]);
  assert.ok(counts["3-2-3"] > 50);
  const p = fixture();
  p.stoneClusters!.clusters[0].layout = "auto";
  assert.ok(validate({ ...fresh(), parts: [p] }));
});

test("curved patches retain stone widths on strong tapers and separate around the seam", () => {
  for (const donut of [false, true]) {
    const p = fixture();
    p.shape = "circle";
    p.width = p.depth = 6;
    p.topDiameter = 1;
    if (donut) { p.innerDiameter = 4; p.topInnerDiameter = 0.5; }
    const s = p.stoneClusters!;
    s.variation = 0;
    s.clusters = Array.from({length: 8}, (_, i) => ({id: `curved-${i}`, seed: 1, count: 3, spread: 1, layout: "1-2" as const}));
    const {stones} = clusterPlacements(p);
    assert.ok(stones.length >= 12);
    const mid = (p.width + p.topDiameter) / 4;
    const items = dressingGeometry(p);
    assert.equal(items.length, stones.length);
    items.forEach(({geometry}, i) => {
      const stone = stones[i], a = geometry.getAttribute("position");
      const angles = Array.from({length:a.count}, (_, j) => {
        const d = Math.atan2(a.getZ(j), a.getX(j)) - stone.u / mid;
        return Math.atan2(Math.sin(d), Math.cos(d));
      });
      const r = T.MathUtils.lerp(3, 0.5, stone.y / 8);
      assert.ok(Math.abs((Math.max(...angles) - Math.min(...angles)) * r - stone.width) < 1e-5);
      geometry.dispose();
    });
    for (const a of stones) for (const b of stones) {
      if (a.clusterId === b.clusterId) continue;
      const angle = Math.abs(a.u-b.u)/mid;
      const distance = Math.min(angle, Math.PI*2-angle) * Math.min(T.MathUtils.lerp(3,.5,a.y/8),T.MathUtils.lerp(3,.5,b.y/8));
      assert.ok(distance >= (a.width+b.width)/2 + s.clusterSpacing! - 1e-8 || Math.abs(a.y-b.y) >= (a.height+b.height)/2 + s.clusterSpacing! - 1e-8);
    }
  }
});

test("manual cluster positions persist, scale, and reject blocked wall edges", () => {
  const p = fixture();
  const s = p.stoneClusters!;
  const c = s.clusters[0];
  c.layout = "1-2";
  c.position = {face: 0, u: 4, y: 3};
  const placed = clusterPlacements(p);
  assert.deepEqual(placed.anchors[c.id], c.position);
  assert.equal(placed.stones.length, 3);
  s.seed++;
  assert.deepEqual(clusterPlacements(p).anchors[c.id], c.position);
  const d = {...fresh(), parts: [p]};
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))).parts[0].stoneClusters!.clusters[0].position, c.position);
  const scaled = scalePart(p, 2);
  assert.deepEqual(scaled.stoneClusters!.clusters[0].position, {face:0,u:8,y:6});
  c.position.u = 0;
  assert.equal(clusterPlacements(p).stones.length, 0);
  c.position.y = NaN;
  assert.throws(() => validate(d), /cluster/);
});
