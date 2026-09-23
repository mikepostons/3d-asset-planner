import {reflectionEnvironment} from "./reflection-environment";
import { MaterialOpacitySlider } from "./MaterialOpacitySlider";
import { MaterialsManager, MaterialCards } from "./MaterialsManager";
import { materialMatches } from "./texture-material-model";
import React, { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Plan } from "./model";
import { libraryRequest } from "./library";
import {
  applyTextureMaterials,
  surfaceKey,
  type TextureMaterial,
} from "./texture-materials";
import { ToolIcon } from "./ToolIcon";
import { disposeExport } from "./model-export";
function PlacementNumber({
  value,
  disabled,
  min,
  max,
  step,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      type="number"
      value={text}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onBlur={() => {
        const next = Number(text);
        if (
          !text.trim() ||
          !Number.isFinite(next) ||
          next < min ||
          next > max
        ) {
          setText(String(value));
          return;
        }
        if (next !== value) onCommit(next);
      }}
    />
  );
}
export function MaterialDesigner({
  root,
  plan,
  projectId,
  onClose,
  onSave,
}: {
  root: T.Group;
  plan: Plan;
  projectId: string | null;
  onClose: () => void;
  onSave: (
    bindings: Record<string, string>,
    overrides: NonNullable<Plan["materialOverrides"]>,
  ) => Promise<boolean>;
}) {
  const [manager, setManager] = useState(false),
    [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState(plan.materialOverrides ?? {});
  const [records, setRecords] = useState<TextureMaterial[]>([]),
    [bindings, setBindings] = useState({ ...plan.materialAssignments }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const [targets] = useState(() => {
    const map = new Map<string, string>();
    root.traverse((o) => {
      const k = surfaceKey(o);
      if (o instanceof T.Mesh && k)
        map.set(
          k,
          `${plan.parts.find((p) => p.id === o.userData.part)?.name ?? "Scene"} · ${o.name}`,
        );
    });
    return [...map];
  });
  const [target, setTarget] = useState(targets[0]?.[0] ?? ""),
    [materialId, setMaterialId] = useState("");
  const targetRef = useRef(target);
  targetRef.current = target;
  const host = useRef<HTMLDivElement>(null),
    preview = useRef<T.Group | undefined>(undefined),
    sceneRef = useRef<T.Scene | undefined>(undefined);
  const previewRequest = useRef(0);
  const renderPreview = async (
    b: Record<string, string>,
    r: TextureMaterial[],
    local = overrides,
  ) => {
    const request = ++previewRequest.current;
    const copy = root.clone(true);
    copy.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry = o.geometry.clone();
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
      }
    });
    try {
      await applyTextureMaterials(
        copy,
        { ...plan, materialAssignments: b, materialOverrides: local },
        r,
      );
      if (!sceneRef.current || request !== previewRequest.current) {
        disposeExport(copy);
        return;
      }
      if (preview.current) {
        sceneRef.current.remove(preview.current);
        disposeExport(preview.current);
      }
      preview.current = copy;
      sceneRef.current.add(copy);
    } catch (e) {
      disposeExport(copy);
      throw e;
    }
  };
  useEffect(() => {
    const el = host.current!,
      scene = new T.Scene();
    sceneRef.current = scene;
    scene.background = new T.Color("#202d33");
    scene.add(new T.HemisphereLight(0xffffff, 0x607080, 3));
    const light = new T.DirectionalLight(0xffffff, 3);
    light.position.set(10, 20, 8);
    scene.add(light);
    const renderer = new T.WebGLRenderer({ antialias: true });
    const disposeEnvironment=reflectionEnvironment(renderer,scene);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const box = new T.Box3().setFromObject(root),
      centre = box.getCenter(new T.Vector3()),
      size = box.getSize(new T.Vector3()).length() || 1,
      camera = new T.PerspectiveCamera(40, 1, 0.01, 10000);
    camera.position.copy(centre).add(new T.Vector3(size, size * 0.7, size));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(centre);
    controls.update();
    const observer = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    });
    observer.observe(el);
    let down = [0, 0];
    const start = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pick = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 ||
        !preview.current
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect(),
        ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray
        .intersectObject(preview.current, true)
        .find((h) => h.object instanceof T.Mesh && surfaceKey(h.object));
      if (hit) setTarget(surfaceKey(hit.object)!);
    };
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    const highlight = new T.Box3Helper(new T.Box3(), 0x53d7c2);
    scene.add(highlight);
    renderer.setAnimationLoop(() => {
      const selected =
        preview.current
          ?.getObjectsByProperty("type", "Mesh")
          .filter((o) => surfaceKey(o) === targetRef.current) ?? [];
      highlight.visible = selected.length > 0;
      if (selected.length) {
        highlight.box.makeEmpty();
        selected.forEach((o) =>
          highlight.box.union(new T.Box3().setFromObject(o)),
        );
      }
      renderer.render(scene, camera);
    });
    libraryRequest<TextureMaterial[]>("/materials")
      .then(async (r) => {
        setRecords(r);
        await renderPreview(bindings, r);
      })
      .catch(async (e) => {
        setError(String(e));
        await renderPreview({}, []);
      })
      .finally(() => setBusy(false));
    return () => {
      ++previewRequest.current;
      sceneRef.current = undefined;
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      highlight.geometry.dispose();
      (highlight.material as T.Material).dispose();
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      disposeEnvironment();
      renderer.dispose();
      renderer.domElement.remove();
      if (preview.current) disposeExport(preview.current);
      disposeExport(root);
    };
  }, [root]);
  async function change(b: Record<string, string>, r = records) {
    setBusy(true);
    setError("");
    try {
      await renderPreview(b, r);
      setBindings(b);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function updatePlacement(key: string, value: string | number) {
    const next = {
      ...overrides,
      [target]: { ...overrides[target], [key]: value },
    };
    setBusy(true);
    setError("");
    try {
      await renderPreview(bindings, records, next);
      setOverrides(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setMaterialId(bindings[target] ?? "");
    setSearch("");
  }, [target, bindings]);
  return (
    <div className="modal-backdrop">
      <section
        inert={manager}
        className="modal cleaner-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Material Designer"
      >
        <button
          className="cleaner-close"
          aria-label="Close Material Designer"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
        <div className="cleaner-columns">
          <aside className="cleaner-controls">
            <div className="material-designer-title">
              <h2>Material Designer</h2>
              <button disabled={busy} onClick={() => setManager(true)}>
                Manage materials
              </button>
            </div>
            <p className="micro">
              Click the model or choose a surface, then select a material.
              Create materials in the manager. Textures repeat using metre-based
              scale.
            </p>
            <label className="field">
              Surface
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {targets.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Find material
              <input
                placeholder="Search materials…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <MaterialCards
              records={records.filter(
                (r) =>
                  (!r.archived && materialMatches(r, search, projectId)) ||
                  r.id === bindings[target],
              )}
              selected={materialId}
              onSelect={(r) => {
                if (busy || !target) return;
                setMaterialId(r.id);
                void change({ ...bindings, [target]: r.id });
              }}
            />
            <p className="micro" role="status">
              {busy ? "Updating preview…" : ""}
            </p>
            <p className="micro">
              Assigned:{" "}
              {records.find((r) => r.id === bindings[target])?.name ??
                "Original material"}
            </p>
            <div className="pair">
              <button
                disabled={busy || !target || !materialId}
                onClick={() => change({ ...bindings, [target]: materialId })}
              >
                Assign
              </button>
              <button
                disabled={busy || !target}
                onClick={() => {
                  const b = { ...bindings };
                  delete b[target];
                  void change(b);
                }}
              >
                Clear
              </button>
            </div>
            <button
              disabled={busy || !materialId}
              onClick={() =>
                change({
                  ...bindings,
                  ...Object.fromEntries(
                    targets.map(([key]) => [key, materialId]),
                  ),
                })
              }
            >
              Assign to all shown surfaces
            </button>
            {error && <p role="alert">{error}</p>}
            <details open className="texture-placement">
              <summary>Texture placement & appearance</summary>
              <label className="field">Surface type<select disabled={busy||!bindings[target]} value={overrides[target]?.kind??records.find(r=>r.id===bindings[target])?.kind??"standard"} onChange={e=>void updatePlacement("kind",e.target.value)}><option value="standard">Standard surface</option><option value="glass">Glass</option></select></label>
              {(overrides[target]?.kind??records.find(r=>r.id===bindings[target])?.kind)==="glass" && <div className="material-fields">{(["transparency","reflection","roughness"] as const).map(key=><label className="field" key={key}>{key==="reflection"?"Reflection strength":key==="transparency"?"Transparency":"Roughness"}<PlacementNumber value={overrides[target]?.[key]??records.find(r=>r.id===bindings[target])?.[key]??(key==="transparency"?.65:key==="reflection"?.5:.15)} disabled={busy} min={0} max={1} step={.05} onCommit={v=>void updatePlacement(key,v)}/></label>)}</div>}
              <p className="micro">To edit terrain, open Materials with no component selected. Each terrain patch can use its own material.</p>
              <p className="micro">
                Only this surface. Larger metres per tile makes the texture
                larger. Position is in repeats: 1 = one tile.
              </p>
              <div className="material-fields">
                {(
                  ["scale", "offsetX", "offsetY", "rotation", "tint"] as const
                ).map((key) => (
                  <label className="field" key={key}>
                    {key === "scale"
                      ? "Metres per tile"
                      : key === "rotation"
                        ? "Rotation (°)"
                        : key === "offsetX"
                          ? "Horizontal position"
                          : key === "offsetY"
                            ? "Vertical position"
                            : "Tint"}
                    {key === "tint" ? (
                      <input
                        type="color"
                        value={
                          overrides[target]?.tint ??
                          records.find((r) => r.id === bindings[target])
                            ?.tint ??
                          "#ffffff"
                        }
                        disabled={busy || !bindings[target]}
                        onChange={(e) =>
                          void updatePlacement("tint", e.target.value)
                        }
                      />
                    ) : (
                      <PlacementNumber
                        key={`${target}-${key}`}
                        value={
                          overrides[target]?.[key] ??
                          records.find((r) => r.id === bindings[target])?.[
                            key
                          ] ??
                          (key === "scale" ? 1 : 0)
                        }
                        disabled={busy || !bindings[target]}
                        min={key === "scale" ? 0.01 : -1000}
                        max={key === "scale" ? 100 : 1000}
                        step={key === "rotation" ? 5 : 0.1}
                        onCommit={(value) => void updatePlacement(key, value)}
                      />
                    )}
                  </label>
                ))}
                <MaterialOpacitySlider key={target} value={overrides[target]?.tintOpacity ?? records.find(r => r.id === bindings[target])?.tintOpacity ?? 1} disabled={busy || !bindings[target]} onCommit={value => void updatePlacement("tintOpacity", value)} />
              </div>
              <button
                disabled={busy}
                onClick={async () => {
                  const next = { ...overrides };
                  delete next[target];
                  setBusy(true);
                  try {
                    await renderPreview(bindings, records, next);
                    setOverrides(next);
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Use material defaults
              </button>
            </details>
            <button
              className="primary cleaner-save"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (await onSave(bindings, overrides)) onClose();
                  else
                    setError(
                      "Scene save failed. Your assignments remain here.",
                    );
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ToolIcon name="save" /> Save assignments
            </button>
          </aside>
          <div ref={host} className="cleaner-viewer" />
        </div>
      </section>
      {manager && (
        <MaterialsManager
          currentPlan={{...plan,materialAssignments:bindings}}
          records={records}
          onChange={setRecords}
          onClose={() => setManager(false)}
        />
      )}
    </div>
  );
}
