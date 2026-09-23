import * as T from "three";
import { bumpToNormalImage } from "./bump-map";
import type { Plan } from "./model";

import { type TextureMaterial } from "./texture-material-model";
export type { TextureMaterial } from "./texture-material-model";
export function surfaceKey(mesh: T.Object3D) {
  return mesh.userData.surfaceKey as string | undefined;
}
export async function applyTextureMaterials(
  root: T.Object3D,
  plan: Plan,
  supplied?: TextureMaterial[],
) {
  const available = new Set<string>();
  root.traverse((o) => {
    const k = surfaceKey(o);
    if (k) available.add(k);
  });
  const bindings = Object.fromEntries(
    Object.entries(plan.materialAssignments ?? {}).filter(([k]) =>
      available.has(k),
    ),
  );
  if (!Object.keys(bindings).length) return;
  let records =
    supplied ??
    (await (
      await import("./library")
    ).libraryRequest<TextureMaterial[]>("/materials"));
  records = [...records];
  for (const [key, id] of Object.entries(bindings)) {
    const override = plan.materialOverrides?.[key],
      source = records.find((r) => r.id === id);
    if (override && source) {
      const localId = `local-${key}`;
      records.push({ ...source, ...override, id: localId });
      bindings[key] = localId;
    }
  }
  const ready = new Map<string, T.MeshStandardMaterial>();
  try {
    for (const id of new Set(Object.values(bindings))) {
      const record = records.find((m) => m.id === id);
      if (!record)
        throw Error(
          "A material is missing from the local library. Reassign it in Material Designer.",
        );
      const material = new T.MeshPhysicalMaterial({
        color: new T.Color("#ffffff").lerp(new T.Color(record.tint), record.tintOpacity ?? 1),
        roughness: record.roughness,
        side: T.DoubleSide,
      });
      if(record.kind === "glass") {
        material.opacity=1-(record.transparency??.65);
        material.transparent=material.opacity<1;
        material.depthWrite=!material.transparent;
        material.specularIntensity=record.reflection??.5;
        material.ior=1.5;
      }
      material.name = record.name;
      ready.set(id, material);
      material.metalness = record.kind === "glass" ? 0 : record.metalness ?? (record.metalnessImage ? 1 : 0);
      material.normalScale.setScalar(record.normalStrength ?? 1);
      material.aoMapIntensity = record.aoStrength ?? 1;
      const normalImage = record.normalImage ?? (record.bumpImage ? await bumpToNormalImage(record.bumpImage, record.bumpStrength ?? 1) : undefined);
      if (!record.normalImage) material.normalScale.setScalar(1);
      for (const [field, slot] of [
        ["image", "map"],
        ["normalImage", "normalMap"],
        ["roughnessImage", "roughnessMap"],
        ["metalnessImage", "metalnessMap"],
        ["aoImage", "aoMap"],
      ] as const) {
        const image = field === "normalImage" ? normalImage : record[field];
        if (!image) continue;
        const texture = await new T.TextureLoader().loadAsync(image);
        texture.colorSpace =
          field === "image" ? T.SRGBColorSpace : T.NoColorSpace;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.repeat.setScalar(1 / record.scale);
        texture.rotation = (record.rotation * Math.PI) / 180;
        texture.offset.set(record.offsetX ?? 0, record.offsetY ?? 0);
        material[slot] = texture;
        material.needsUpdate = true;
      }
    }
    const old = new Set<T.Material>();
    root.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const id = bindings[surfaceKey(o) ?? ""];
      if (!id) return;
      if (!o.geometry.getAttribute("uv"))
        throw Error(
          "Generate and save UVs in Cleaner before applying textured materials.",
        );
      const uv = o.geometry.getAttribute("uv");
      const unit = plan.preparedUVs?.[o.userData.part]?.metresPerTile ?? 1;
      if (!o.userData.materialMetreUV) {
        for (let i = 0; i < uv.count; i++)
          uv.setXY(i, uv.getX(i) * unit, uv.getY(i) * unit);
        uv.needsUpdate = true;
        o.userData.materialMetreUV = true;
      }
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        old.add(m);
      o.material = ready.get(id)!;
    });
    const used = new Set<T.Material>();
    root.traverse((o) => {
      if (o instanceof T.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          used.add(m);
    });
    old.forEach((m) => {
      if (!used.has(m)) m.dispose();
    });
    for (const m of ready.values())
      if (!used.has(m)) {
        for (const slot of [
          m.map,
          m.normalMap,
          m.roughnessMap,
          m.metalnessMap,
          m.aoMap,
        ])
          slot?.dispose();
        m.dispose();
      }
  } catch (e) {
    for (const m of ready.values()) {
      for (const slot of [
        m.map,
        m.normalMap,
        m.roughnessMap,
        m.metalnessMap,
        m.aoMap,
      ])
        slot?.dispose();
      m.dispose();
    }
    throw e;
  }
}

export function assignedMaterialCount(root: T.Object3D) {
  const used = new Set<T.Material>();
  root.traverse((o) => {
    if (o instanceof T.Mesh)
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        used.add(m);
  });
  return used.size;
}
