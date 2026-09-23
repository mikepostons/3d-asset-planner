import { MaterialOpacitySlider } from "./MaterialOpacitySlider";
import type {Plan} from "./model";
import React, { useEffect, useState } from "react";
import { ToolIcon } from "./ToolIcon";
import { libraryRequest, type Project } from "./library";
import {
  materialMatches,
  type TextureMaterial,
} from "./texture-material-model";
const fresh = (): TextureMaterial => ({
  id: "draft",
  name: "New material",
  tint: "#ffffff",
  roughness: 1,
  scale: 1,
  rotation: 0,
  keywords: [],
  projectIds: [],
});
export function MaterialCards({
  records,
  selected,
  onSelect,
}: {
  records: TextureMaterial[];
  selected: string;
  onSelect: (m: TextureMaterial) => void;
}) {
  return (
    <div className="material-cards">
      {records.map((m) => (
        <button
          key={m.id}
          className={selected === m.id ? "active" : ""}
          aria-pressed={selected === m.id}
          onClick={() => onSelect(m)}
        >
          {m.image ? (
            <img src={m.image} alt="" />
          ) : (
            <span className="material-swatch" style={{ background: m.tint }} />
          )}
          <span>
            {m.name}
            <small>Version {m.version ?? 1}</small>
          </span>
        </button>
      ))}
      {!records.length && <p>No matching materials.</p>}
    </div>
  );
}
export function MaterialsManager({
  records,
  currentPlan,
  onChange,
  onClose,
}: {
  records: TextureMaterial[];
  currentPlan?: Plan;
  onChange: (r: TextureMaterial[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(fresh),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [usage, setUsage] = useState<number | null>(null);
  useEffect(() => {
    libraryRequest<Project[]>("/projects")
      .then(setProjects)
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    let active = true;
    setUsage(null);
    if (selected)
      libraryRequest<unknown[]>(`/materials/${selected}/usage`)
        .then((r) => {
          if (active) setUsage(r.length);
        })
        .catch((e) => {
          if (active) setError(String(e));
        });
    return () => {
      active = false;
    };
  }, [selected]);
  const [mode, setMode] = useState<"browse" | "edit" | "create">("browse");
  const [baseline, setBaseline] = useState(""),
    [pending, setPending] = useState<(() => void) | null>(null);
  const navigate = (action: () => void) => {
    if (mode !== "browse" && JSON.stringify(draft) !== baseline)
      setPending(() => action);
    else action();
  };
  const choose = (m: TextureMaterial) =>
    navigate(() => {
      setSelected(m.id);
      setDraft({ ...m });
      setBaseline(JSON.stringify(m));
      setMode("edit");
      setError("");
    });
  const create = () =>
    navigate(() => {
      const m = fresh();
      setSelected("");
      setDraft(m);
      setBaseline(JSON.stringify(m));
      setMode("create");
      setError("");
    });
  const patch = (p: Partial<TextureMaterial>) =>
    setDraft((d) => ({ ...d, ...p }));
  async function upload(file: File, field: string) {
    setBusy(true);
    setError("");
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 12_000_000
      )
        throw Error("Choose PNG, JPEG or WebP under 12 MB.");
      const image = await createImageBitmap(file);
      const ratio = Math.min(1, 2048 / Math.max(image.width, image.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(image.width * ratio));
      c.height = Math.max(1, Math.round(image.height * ratio));
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      const data = c.toDataURL("image/png");
      if (data.length > 12_000_000) throw Error("Please use a smaller image.");
      patch({
        [field]: data,
        ...(field === "metalnessImage"
          ? { metalness: 1 }
          : field === "roughnessImage"
            ? { roughness: 1 }
            : {}),
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(update: boolean) {
    setBusy(true);
    setError("");
    try {
      const material = await libraryRequest<TextureMaterial>("/materials", {
        ...draft,
        parentId: update ? selected : undefined,
        familyId: undefined,
        version: undefined,
      });
      onChange([material, ...records]);
      setSelected(material.id);
      setDraft(material);
      setPending(null);
      setBaseline(JSON.stringify(material));
      setMode("edit");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const fields = (
    items: ReadonlyArray<
      readonly [keyof TextureMaterial, string, number, number, number]
    >,
  ) => (
    <div className="material-fields">
      {items.map(([key, label, min, max, fallback]) => (
        <label key={key} className="field">
          {label}
          <input
            type="number"
            min={min}
            max={max}
            step={key === "rotation" ? 5 : 0.1}
            value={Number(draft[key] ?? fallback)}
            onChange={(e) => patch({ [key]: +e.target.value })}
          />
        </label>
      ))}
    </div>
  );
  const availableRecords=records.filter(m=>!m.archived);
  type Usage={id:string;name:string;surfaces:{key:string;partName:string;surface:string}[]};
  const [deletion,setDeletion]=useState<{material:TextureMaterial;usage:Usage[]}|null>(null);
  const [removed,setRemoved]=useState<TextureMaterial|null>(null);
  async function confirmDelete(){setBusy(true);setError('');try{
    const material=records.find(m=>m.id===selected)!;
    const usage=await libraryRequest<Usage[]>(`/materials/${selected}/usage`);
    if(currentPlan){const surfaces=Object.entries(currentPlan.materialAssignments??{}).filter(([,id])=>id===selected).map(([key])=>{const split=key.indexOf(':');return {key,partName:currentPlan.parts.find(p=>p.id===key.slice(0,split))?.name??'Terrain',surface:key.slice(split+1)};});if(surfaces.length)usage.unshift({id:'current',name:`${currentPlan.name} (current scene, including unsaved assignments)`,surfaces});}
    setDeletion({material,usage});
  }catch(e){setError(String(e));}finally{setBusy(false);}}
  async function removeMaterial(){if(!deletion)return;setBusy(true);setError('');try{
    const updated=await libraryRequest<TextureMaterial>(`/materials/${deletion.material.id}/archive`,{});
    onChange(records.map(m=>m.id===updated.id?updated:m));setRemoved(updated);setDeletion(null);setPending(null);setMode('browse');setSelected('');
  }catch(e){setError(String(e));}finally{setBusy(false);}}
  async function undoDelete(){if(!removed)return;setBusy(true);setError('');try{const updated=await libraryRequest<TextureMaterial>(`/materials/${removed.id}/restore`,{});onChange(records.map(m=>m.id===updated.id?updated:m));setRemoved(null);}catch(e){setError(String(e));}finally{setBusy(false);}}
  const visible = availableRecords.filter((m) =>
    materialMatches(m, search, project, project === "all"),
  );
  return (
    <div className="modal-backdrop materials-manager-backdrop">
      <section
        inert={!!deletion}
        className={`modal materials-manager manager-${mode}`}
        role="dialog"
        aria-modal="true"
        aria-label="Materials Manager"
      >
        <header>
          <div>
            <h2>
              {mode === "create" ? "Create material" : "Materials Manager"}
            </h2>
            <p className="micro">
              {mode === "create"
                ? "Add your texture maps and choose how this material is shared."
                : `${availableRecords.length} material${availableRecords.length === 1 ? "" : "s"} · Shared across your projects`}
            </p>
          </div>
          <div className="manager-actions">
            {mode !== "create" && (
              <button className="primary" disabled={busy} onClick={create}>
                ＋ Create New
              </button>
            )}
            <button
              disabled={busy}
              aria-label="Close materials manager"
              onClick={() => navigate(onClose)}
            >
              ×
            </button>
          </div>
        </header>
        {pending && (
          <div className="material-discard" role="alert">
            Discard unsaved material changes?
            <button onClick={() => setPending(null)}>Keep editing</button>
            <button
              onClick={() => {
                pending();
                setPending(null);
              }}
            >
              Discard changes
            </button>
          </div>
        )}
        {removed&&<div className="material-discard" role="status">Removed {removed.name} from the library. <button disabled={busy} onClick={()=>void undoDelete()}>Undo delete</button></div>}
        <div className="materials-manager-body" inert={!!deletion}>
          {mode !== "create" && (
            <div className="material-directory">
              <div className="material-directory-tools">
                <input
                  aria-label="Search all materials"
                  placeholder="Search name or keywords…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Filter by project"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                >
                  <option value="all">All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="material-grid-scroll">
                <MaterialCards
                  records={visible}
                  selected={selected}
                  onSelect={(m) => {
                    if (!busy) choose(m);
                  }}
                />
                {!availableRecords.length && (
                  <div className="material-empty">
                    <h3>Your material library starts here</h3>
                    <p>
                      Add a colour image and optional surface maps, then reuse
                      the material across your scenes.
                    </p>
                    <button onClick={create}>Create your first material</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {mode !== "browse" && (
            <aside
              className="material-editor"
              aria-label={
                mode === "create" ? "New material form" : "Edit material"
              }
            >
              <div className="material-editor-heading">
                <div>
                  <h3>{mode === "create" ? "Material details" : draft.name}</h3>
                  {selected && (
                    <span className="micro">Version {draft.version ?? 1}</span>
                  )}
                </div>
                <button
                  disabled={busy}
                  aria-label="Back to material library"
                  onClick={() =>
                    navigate(() => {
                      setMode("browse");
                      setSelected("");
                    })
                  }
                >
                  ← Back
                </button>
              </div>
              <div className="material-form" key={selected || "new"}>
                <fieldset disabled={busy} className="material-edit-fields">
                  <div className="material-form-column">
                  <div className="material-identity">
                    <div
                      className="material-preview-swatch"
                      style={{ background: draft.tint }}
                    >
                      {draft.image && (
                        <img src={draft.image} alt="Material colour preview" />
                      )}
                    </div>
                    <div>
                      <label className="field">
                        Name
                        <input
                          autoFocus
                          maxLength={150}
                          value={draft.name}
                          onChange={(e) => patch({ name: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        Keywords
                        <input
                          placeholder="stone, rough, exterior"
                          value={(draft.keywords ?? []).join(",")}
                          onChange={(e) =>
                            patch({ keywords: e.target.value.split(",") })
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <details open>
                    <summary>
                      Source images <span>6 map slots</span>
                    </summary>
                    <div className="material-map-grid">
                      {(
                        [
                          ["image", "Base colour"],
                          ["normalImage", "Normal (OpenGL)"],
                          ["bumpImage", "Bump / height"],
                          ["roughnessImage", "Roughness"],
                          ["metalnessImage", "Metallic"],
                          ["aoImage", "Ambient occlusion"],
                        ] as const
                      ).map(([field, label]) => (
                        <div className="material-map-slot" key={field}>
                          <label className="material-upload">
                            {draft[field] ? (
                              <img src={draft[field]} alt={`${label} map`} />
                            ) : (
                              <span className="map-placeholder">＋</span>
                            )}
                            <span>
                              {label}
                              <small>
                                {draft[field]
                                  ? "Replace image"
                                  : "Choose image"}
                              </small>
                            </span>
                            <input
                              aria-label={`${label} image`}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => {
                                if (e.target.files?.[0])
                                  void upload(e.target.files[0], field);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {draft[field] && (
                            <button
                              className="map-remove"
                              aria-label={`Remove ${label} map`}
                              onClick={() => patch({ [field]: undefined })}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="micro">
                      PNG, JPEG or WebP · up to 12 MB each. Roughness, metallic,
                      occlusion and bump use grayscale maps. Bump is used when no normal map is assigned; white is raised. It adds surface shading, not geometry.
                    </p>
                  </details>
                  </div>
                  <div className="material-form-column">
                  <details open>
                    <summary>Appearance</summary>
                    <label className="field">Material type<select value={draft.kind??"standard"} onChange={e=>patch(e.target.value==="glass"?{kind:"glass",roughness:.15,transparency:.65,reflection:.5}:{kind:"standard"})}><option value="standard">Standard surface</option><option value="glass">Glass</option></select></label>
                    {draft.kind==="glass" && <><p className="micro">Transparency makes the pane see-through. Reflection controls highlights; roughness softens them. Frames keep their own materials.</p>{fields([["transparency","Transparency",0,1,.65],["reflection","Reflection strength",0,1,.5]])}</>}
                    <label className="field material-tint">
                      Colour tint
                      <input
                        type="color"
                        value={draft.tint}
                        onChange={(e) => patch({ tint: e.target.value })}
                      />
                    </label>
                    <MaterialOpacitySlider value={draft.tintOpacity ?? 1} onCommit={value => patch({tintOpacity: value})} />
                    {fields([
                      ["roughness", "Roughness", 0, 1, 1],
                      ["metalness", "Metallic", 0, 1, 0],
                      ["normalStrength", "Normal strength", 0, 5, 1],
                      ["bumpStrength", "Bump strength", 0, 5, 1],
                      ["aoStrength", "Occlusion strength", 0, 5, 1],
                    ])}
                  </details>
                  <details>
                    <summary>Texture placement</summary>
                    <p className="micro">
                      Larger metres per tile makes the texture larger. Position
                      uses texture repeats; 1 moves one full tile. These
                      defaults can be overridden per surface.
                    </p>
                    {fields([
                      ["scale", "Metres per tile", 0.01, 100, 1],
                      ["rotation", "Rotation (°)", -360, 360, 0],
                      ["offsetX", "Horizontal position", -1000, 1000, 0],
                      ["offsetY", "Vertical position", -1000, 1000, 0],
                    ])}
                  </details>
                  <details>
                    <summary>
                      Projects{" "}
                      <span>
                        {draft.projectIds?.length
                          ? `${draft.projectIds.length} selected`
                          : "All projects"}
                      </span>
                    </summary>
                    <p className="micro">
                      Leave unchecked to make this material available in every
                      project.
                    </p>
                    {projects.map((p) => (
                      <label key={p.id} className="settings-check">
                        <input
                          type="checkbox"
                          checked={draft.projectIds?.includes(p.id) ?? false}
                          onChange={(e) =>
                            patch({
                              projectIds: e.target.checked
                                ? [...(draft.projectIds ?? []), p.id]
                                : (draft.projectIds ?? []).filter(
                                    (id) => id !== p.id,
                                  ),
                            })
                          }
                        />
                        {p.name}
                      </label>
                    ))}
                    {!projects.length && (
                      <p className="micro">
                        No projects yet. This material will be available
                        everywhere.
                      </p>
                    )}
                  </details>
                  </div>
                </fieldset>
              </div>
              <footer>
                {selected&&<button className="material-delete" disabled={busy} onClick={()=>void confirmDelete()}>Delete material</button>}
                {error && <p role="alert">{error}</p>}
                {selected && (
                  <p className="micro">
                    {usage === null
                      ? "Checking usage…"
                      : `Used in ${usage} saved scene${usage === 1 ? "" : "s"}.`}{" "}
                    Saving creates a new version; existing assignments stay
                    unchanged.
                  </p>
                )}
                <div className="manager-actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      navigate(() => {
                        setMode("browse");
                        setSelected("");
                      })
                    }
                  >
                    Cancel
                  </button>
                  {selected && (
                    <button
                      disabled={busy || !draft.name.trim()}
                      onClick={() => save(false)}
                    >
                      Save as copy
                    </button>
                  )}
                  <button
                    className="primary"
                    disabled={busy || !draft.name.trim()}
                    onClick={() => save(!!selected)}
                  >
                    <ToolIcon name="save" />
                    {busy
                      ? "Saving…"
                      : selected
                        ? "Save new version"
                        : "Create material"}
                  </button>
                </div>
              </footer>
            </aside>
          )}
        </div>
        {mode === "browse" && error && (
          <p className="material-library-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {deletion&&<div className="modal-backdrop material-delete-backdrop"><section role="dialog" aria-modal="true" aria-label="Delete material" className="modal material-delete-dialog"><h2>Delete {deletion.material.name}?</h2><p>Version {deletion.material.version??1} will be removed from the material picker. Models already using it keep their material and appearance. Other versions stay available.</p><p>Any unsaved material edits will be discarded.</p><div className="material-usage-list">{deletion.usage.length?deletion.usage.map(scene=><div key={scene.id}><h3>{scene.name}</h3><ul>{scene.surfaces.map(surface=><li key={surface.key}>{surface.partName} · {surface.surface}</li>)}</ul></div>):<p>No saved scenes or current assignments use this material.</p>}</div>{error&&<p role="alert">{error}</p>}<div className="manager-actions"><button disabled={busy} onClick={()=>setDeletion(null)}>Cancel</button><button disabled={busy} className="material-delete" onClick={()=>void removeMaterial()}>{busy?'Deleting…':'Delete material'}</button></div></section></div>}
    </div>
  );
}
