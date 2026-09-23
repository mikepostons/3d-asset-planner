import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { applyTextureMaterials } from "./texture-materials";
import { fresh, part } from "./model";
import { preparationKey } from "./model-cleaner";
test("material assignments preserve UV preparation and convert mapping units to metres", async () => {
  const p = part(),
    plan = { ...fresh(), parts: [p] },
    key = `${p.id}:Walls`,
    root = new T.Group(),
    mesh = new T.Mesh(new T.BoxGeometry());
  mesh.userData = { surfaceKey: key, part: p.id };
  root.add(mesh);
  const before = preparationKey(plan),
    uv = mesh.geometry.getAttribute("uv"),
    original = Array.from(uv.array);
  const assigned = {
    ...plan,
    materialAssignments: { [key]: "stone" },
    preparedUVs: { [p.id]: { sourceKey: before, metresPerTile: 2 } },
  };
  assert.equal(preparationKey(assigned), before);
  await applyTextureMaterials(root, assigned, [
    {
      id: "stone",
      name: "Stone",
      tint: "#aabbcc",
      roughness: 0.6,
      scale: 3,
      rotation: 45,
    },
  ]);
  assert.equal((mesh.material as T.MeshStandardMaterial).name, "Stone");
  assert.equal((mesh.material as T.MeshStandardMaterial).roughness, 0.6);
  assert.deepEqual(
    Array.from(uv.array),
    original.map((n) => n * 2),
  );
  await applyTextureMaterials(root, assigned, [
    {
      id: "stone",
      name: "Stone",
      tint: "#aabbcc",
      roughness: 0.6,
      scale: 3,
      rotation: 45,
    },
  ]);
  assert.deepEqual(
    Array.from(uv.array),
    original.map((n) => n * 2),
  );
});
test("selection exports ignore missing materials outside their scope", async () => {
  const root = new T.Group();
  root.add(new T.Mesh(new T.BoxGeometry()));
  await applyTextureMaterials(
    root,
    { ...fresh(), materialAssignments: { "unexported:Walls": "missing" } },
    [],
  );
});
test("assigned missing material fails explicitly", async () => {
  const root = new T.Group(),
    m = new T.Mesh(new T.BoxGeometry());
  m.userData.surfaceKey = "test";
  root.add(m);
  await assert.rejects(
    applyTextureMaterials(
      root,
      { ...fresh(), materialAssignments: { test: "missing" } },
      [],
    ),
    /missing/,
  );
});
test("directory filters by keywords and project eligibility", async () => {
  const { materialMatches, validateTextureMaterial } =
    await import("./texture-material-model");
  const m = {
    id: "stone",
    name: "Wall",
    keywords: ["granite"],
    projectIds: ["mine"],
    tint: "#ffffff",
    roughness: 1,
    scale: 1,
    rotation: 0,
  };
  assert.ok(materialMatches(m, "granite", "mine"));
  assert.ok(!materialMatches(m, "granite", "harbour"));
  assert.ok(materialMatches({ ...m, projectIds: [] }, "granite", null));
  assert.throws(() =>
    validateTextureMaterial({
      ...m,
      normalImage: "https://example.com/map.png",
    }),
  );
});
test("scene override changes appearance without changing shared material", async () => {
  const root = new T.Group(),
    mesh = new T.Mesh(new T.BoxGeometry());
  mesh.userData.surfaceKey = "surface";
  root.add(mesh);
  const m = {
    id: "stone",
    name: "Stone",
    tint: "#ffffff",
    roughness: 1,
    scale: 1,
    rotation: 0,
  };
  await applyTextureMaterials(
    root,
    {
      ...fresh(),
      materialAssignments: { surface: m.id },
      materialOverrides: { surface: { tint: "#ff0000", scale: 2 } },
    },
    [m],
  );
  assert.equal(
    (mesh.material as T.MeshStandardMaterial).color.getHexString(),
    "ff0000",
  );
  assert.equal(m.tint, "#ffffff");
});
test("all map slots use matching transforms and correct colour spaces", async () => {
  const original = T.TextureLoader.prototype.loadAsync;
  T.TextureLoader.prototype.loadAsync = async () => new T.Texture();
  try {
    const root = new T.Group(),
      mesh = new T.Mesh(new T.BoxGeometry());
    mesh.userData.surfaceKey = "surface";
    root.add(mesh);
    const image = "data:image/png;base64,AA==";
    await applyTextureMaterials(
      root,
      { ...fresh(), materialAssignments: { surface: "stone" } },
      [
        {
          id: "stone",
          name: "Stone",
          tint: "#ffffff",
          roughness: 1,
          scale: 2,
          rotation: 90,
          image,
          normalImage: image,
          roughnessImage: image,
          metalnessImage: image,
          aoImage: image,
          normalStrength: 0.5,
          aoStrength: 0.8,
        },
      ],
    );
    const m = mesh.material as T.MeshStandardMaterial;
    assert.equal(m.map?.colorSpace, T.SRGBColorSpace);
    for (const t of [m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap]) {
      assert.equal(t?.colorSpace, T.NoColorSpace);
      assert.equal(t?.repeat.x, 0.5);
      assert.equal(t?.rotation, Math.PI / 2);
    }
    assert.equal(m.normalScale.x, 0.5);
    assert.equal(m.aoMapIntensity, 0.8);
    assert.equal(m.metalness, 1);
  } finally {
    T.TextureLoader.prototype.loadAsync = original;
  }
});

test("texture positions apply to all maps and surface overrides preserve library defaults", async () => {
  const load = T.TextureLoader.prototype.loadAsync;
  T.TextureLoader.prototype.loadAsync = async () => new T.Texture();
  try {
    const root = new T.Group(),
      mesh = new T.Mesh(new T.BoxGeometry());
    mesh.userData.surfaceKey = "wall";
    root.add(mesh);
    const image = "data:image/png;base64,AA==",
      record = {
        id: "stone",
        name: "Stone",
        tint: "#ffffff",
        roughness: 1,
        scale: 1,
        rotation: 0,
        offsetX: 0.1,
        offsetY: 0.2,
        image,
        normalImage: image,
        roughnessImage: image,
        aoImage: image,
        metalnessImage: image,
      };
    await applyTextureMaterials(
      root,
      {
        ...fresh(),
        materialAssignments: { wall: "stone" },
        materialOverrides: { wall: { scale: 2, offsetX: -0.25, offsetY: 0.5 } },
      },
      [record],
    );
    const material = mesh.material as T.MeshStandardMaterial;
    for (const map of [
      material.map,
      material.normalMap,
      material.roughnessMap,
      material.aoMap,
      material.metalnessMap,
    ]) {
      assert.deepEqual(map?.offset.toArray(), [-0.25, 0.5]);
      assert.deepEqual(map?.repeat.toArray(), [0.5, 0.5]);
    }
    assert.equal(record.offsetX, 0.1);
    assert.equal(record.scale, 1);
  } finally {
    T.TextureLoader.prototype.loadAsync = load;
  }
});
test("texture position validation accepts legacy and signed values but rejects invalid offsets", async () => {
  const { validateTextureMaterial } = await import("./texture-material-model");
  const { validate } = await import("./model");
  const material = {
    id: "stone",
    name: "Stone",
    tint: "#ffffff",
    roughness: 1,
    scale: 1,
    rotation: 0,
  };
  validateTextureMaterial(material);
  validateTextureMaterial({ ...material, offsetX: -0.5, offsetY: 0.25 });
  assert.throws(() =>
    validateTextureMaterial({ ...material, offsetX: Infinity }),
  );
  const plan = {
    ...fresh(),
    materialOverrides: { wall: { scale: 2, offsetX: -0.5, offsetY: 0.25 } },
  };
  assert.equal(
    validate(JSON.parse(JSON.stringify(plan))).materialOverrides?.wall.offsetX,
    -0.5,
  );
  assert.throws(() =>
    validate({ ...plan, materialOverrides: { wall: { offsetY: 1001 } } }),
  );
});

test('tint opacity blends colour without making the surface transparent', async () => {
  const record = {id:'tinted',name:'Tinted',tint:'#ff0000',roughness:1,scale:1,rotation:0};
  for (const amount of [0, .5, 1]) {
    const mesh = new T.Mesh(new T.BoxGeometry()); mesh.userData.surfaceKey='wall';
    await applyTextureMaterials(mesh,{...fresh(),materialAssignments:{wall:record.id},materialOverrides:{wall:{tintOpacity:amount}}},[record]);
    const material=mesh.material as T.MeshStandardMaterial;
    assert.ok(material.color.equals(new T.Color('white').lerp(new T.Color('red'),amount)));
    assert.equal(material.opacity,1);assert.equal(material.transparent,false);
    mesh.geometry.dispose();material.dispose();
  }
});

test('tint opacity is optional in old records and constrained to zero through one', async () => {
  const {validateTextureMaterial}=await import('./texture-material-model');
  const {validate}=await import('./model');
  const record={id:'tinted',name:'Tinted',tint:'#ffffff',roughness:1,scale:1,rotation:0};
  assert.doesNotThrow(()=>validateTextureMaterial(record));
  for (const tintOpacity of [-.1,1.1,NaN]) {
    assert.throws(()=>validateTextureMaterial({...record,tintOpacity}));
    assert.throws(()=>validate({...fresh(),materialOverrides:{wall:{tintOpacity}}}));
  }
  for (const tintOpacity of [0,.5,1]) assert.doesNotThrow(()=>validateTextureMaterial({...record,tintOpacity}));
});

test('glass presets and surface overrides produce transparent dielectric materials',async()=>{
 const mesh=new T.Mesh(new T.BoxGeometry());mesh.userData.surfaceKey='pane';
 const record={id:'glass',name:'Clear glass',kind:'glass' as const,tint:'#cceeff',roughness:.15,transparency:.7,reflection:.6,scale:1,rotation:0};
 await applyTextureMaterials(mesh,{...fresh(),materialAssignments:{pane:'glass'},materialOverrides:{pane:{transparency:.8,reflection:.4,roughness:.2}}},[record]);
 const material=mesh.material as T.MeshPhysicalMaterial;
 assert.ok(material instanceof T.MeshPhysicalMaterial);assert.ok(Math.abs(material.opacity-.2)<1e-9);
 assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(material.metalness,0);assert.equal(material.specularIntensity,.4);assert.equal(material.roughness,.2);
 assert.equal(record.transparency,.7);mesh.geometry.dispose();material.dispose();
});

test('glass fields reject invalid library and surface values',async()=>{
 const {validateTextureMaterial}=await import('./texture-material-model');const {validate}=await import('./model');
 const record={id:'glass',name:'Glass',kind:'glass' as const,tint:'#ffffff',roughness:.1,scale:1,rotation:0};
 for(const field of ['transparency','reflection'] as const)for(const value of [-1,2,NaN]){
  assert.throws(()=>validateTextureMaterial({...record,[field]:value}));
  assert.throws(()=>validate({...fresh(),materialOverrides:{pane:{[field]:value}}}));
 }
});
