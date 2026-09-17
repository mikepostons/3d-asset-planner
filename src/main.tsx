import { ArchitecturalControls } from "./ArchitecturalControls";
import { reconcileThresholds, defaultDetails } from "./architectural-details";
import { duplicateOpenings } from "./opening-groups";
import {
  copyInfill,
  infillTargets,
  defaultInfill,
  type Infill,
} from "./infills";
import {
  openingKinds,
  openingName,
  type Opening,
  type OpeningKind,
} from "./openings";
import { bodyMaterial, materialMetadata } from "./materials";
import type { MaterialDescription } from "./model";
import { subdivisionDefaults } from "./subdivisions";
import { type Primitive } from "./model";
import { SceneLibrary } from "./SceneLibrary";
import { libraryRequest, type Project, type SavedScene } from "./library";
import { ToolIcon } from "./ToolIcon";
import { flatView } from "./views";
import { terrainPatches } from "./terrain";
import { referenceViews } from "./views";
import { type SelectionMode } from "./editing";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { Stage, type Tool } from "./stage";
import {
  type Plan,
  type Part,
  fresh,
  demo,
  clone,
  part,
  uid,
  height,
  ridgeEnds,
  baseY,
  resizeModule,
  scalePart,
  scaleSelection,
  estimatedFloors,
  selectedParts,
  sceneStructures,
  assignGroup,
  normaliseScene,
  mainAspect,
  aspectOwner,
  aspectDirections,
  validate,
  warnings,
  brief,
  slug,
} from "./model";
import "./style.css";
import { SceneTree } from "./SceneTree";
const STORE = new URLSearchParams(location.search).has("test")
  ? "mining-asset-planner-test"
  : "mining-asset-planner-v1";
function initial() {
  try {
    const s = localStorage.getItem(STORE);
    return s ? validate(JSON.parse(s)) : demo();
  } catch {
    return demo();
  }
}
function download(b: Blob, name: string) {
  const url = URL.createObjectURL(b),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Num({
  label,
  value,
  onChange,
  min = 0.1,
  max = 500,
  step = 0.5,
  unit = "m",
}: {
  label: string;
  value: number;
  onChange: (x: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <label className="field">
      {label}
      <span className="input-unit">
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(3))}
          onChange={(e) => {
            if (e.target.value === "") return;
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
        />
        <small>{unit}</small>
      </span>
    </label>
  );
}
function OpeningIcon({ kind }: { kind: OpeningKind }) {
  return (
    <svg
      width="32"
      height="36"
      viewBox="0 0 32 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {kind === "circle-window" ? (
        <circle cx="16" cy="18" r="11" />
      ) : kind.startsWith("arched") ? (
        <path d="M5 32V15a11 11 0 0 1 22 0v17Z" />
      ) : (
        <rect
          x="5"
          y={kind === "door" ? 3 : 8}
          width="22"
          height={kind === "door" ? 29 : 22}
          rx="1"
        />
      )}
      {kind.includes("window") && <path d="M16 8v20M6 18h20" />}
    </svg>
  );
}
function MaterialFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: MaterialDescription;
  onChange: (m: MaterialDescription) => void;
}) {
  const m = value ?? { name: "", description: "" };
  return (
    <fieldset className="material-fields">
      <legend>{label}</legend>
      <label className="field">
        Name
        <input
          aria-label={`${label} name`}
          value={m.name}
          maxLength={500}
          placeholder="e.g. Weathered slate"
          onChange={(e) => onChange({ ...m, name: e.target.value })}
        />
      </label>
      <label className="field">
        Description
        <textarea
          aria-label={`${label} description`}
          value={m.description}
          maxLength={19000}
          placeholder="Describe appearance, finish and wear…"
          onChange={(e) => onChange({ ...m, description: e.target.value })}
        />
      </label>
    </fieldset>
  );
}
function Floating({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [minimised, setMinimised] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  return (
    <section
      className={`floating ${className}`}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div
        className="panel-grip"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          const r = e.currentTarget.parentElement!.getBoundingClientRect();
          drag.current = { x: e.clientX, y: e.clientY, ox: r.left, oy: r.top };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = drag.current;
          if (!a) return;
          const el = e.currentTarget.parentElement!;
          const r = el.getBoundingClientRect();
          const left = Math.max(
            8,
            Math.min(innerWidth - r.width - 8, a.ox + e.clientX - a.x),
          );
          const top = Math.max(
            80,
            Math.min(innerHeight - 60, a.oy + e.clientY - a.y),
          );
          setOffset((o) => ({ x: o.x + left - r.left, y: o.y + top - r.top }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <span>⠿ &nbsp;{title}</span>
        <button
          aria-label={`${minimised ? "Expand" : "Minimise"} ${title}`}
          onClick={() => setMinimised(!minimised)}
        >
          {minimised ? "+" : "−"}
        </button>
      </div>
      <div hidden={minimised} className="panel-content">
        {children}
      </div>
    </section>
  );
}
type PendingScene =
  | { kind: "new" }
  | { kind: "open"; id: string }
  | { kind: "import"; plan: Plan };
type SavedReference = {
  id: string;
  version: number;
  projectId: string | null;
  snapshot: string;
};
function App() {
  const [d, setD] = useState<Plan>(initial),
    [selected, setSelected] = useState<string | null>(null),
    [tool, setTool] = useState<Tool>("select"),
    [activeFace, setActiveFace] = useState<{
      partId: string;
      index: number;
    } | null>(null),
    [activeOpening, setActiveOpening] = useState<string | null>(null),
    [openingSelection, setOpeningSelection] = useState<string[]>([]),
    [openingKind, setOpeningKind] = useState<OpeningKind>("door"),
    [openingMenu, setOpeningMenu] = useState(false),
    [addShape, setAddShape] = useState<Primitive>("cube"),
    [scaleFactor, setScaleFactor] = useState(1),
    [selectionMode, setSelectionMode] = useState<SelectionMode>("vertices"),
    [view, setView] = useState("main"),
    [drawShape, setDrawShape] = useState<"rectangle" | "circle">("rectangle"),
    [floorGuides, setFloorGuides] = useState(true),
    [terrainVisible, setTerrainVisible] = useState(true),
    [xray, setXray] = useState(false),
    [exportDialog, setExportDialog] = useState(false),
    [includeTerrain, setIncludeTerrain] = useState(true),
    [hint, setHint] = useState("Ready"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [moduleDialog, setModuleDialog] = useState(false),
    [newModule, setNewModule] = useState(3),
    [rescaleSettings, setRescaleSettings] = useState(false),
    [newSubdivision, setNewSubdivision] = useState(6),
    [showHelp, setShowHelp] = useState(false),
    [revision, setRevision] = useState(1),
    [savedReference, setSavedReference] = useState<SavedReference | null>(
      () => {
        try {
          return JSON.parse(localStorage.getItem(STORE + "-saved") ?? "null");
        } catch {
          return null;
        }
      },
    ),
    [libraryOpen, setLibraryOpen] = useState(false),
    [saveDialog, setSaveDialog] = useState(false),
    [pendingScene, setPendingScene] = useState<PendingScene | null>(null),
    [saving, setSaving] = useState(false),
    [switching, setSwitching] = useState(false),
    [saveName, setSaveName] = useState(""),
    [saveProject, setSaveProject] = useState(""),
    [projects, setProjects] = useState<Project[]>([]),
    [newProjectName, setNewProjectName] = useState(""),
    [libraryError, setLibraryError] = useState(""),
    [settingsTab, setSettingsTab] = useState("part"),
    [sceneDraft, setSceneDraft] = useState<Plan | null>(null),
    [revisionDraft, setRevisionDraft] = useState(1);
  const host = useRef<HTMLDivElement>(null),
    stage = useRef<Stage | null>(null),
    live = useRef(d),
    history = useRef<Plan[]>([]),
    future = useRef<Plan[]>([]),
    file = useRef<HTMLInputElement>(null);
  live.current = d;
  const commit = useCallback((next: Plan) => {
    try {
      next = { ...next, parts: next.parts.map(reconcileThresholds) };
      validate(next);
    } catch (e) {
      setMessage(String(e));
      return;
    }
    next = normaliseScene(next);
    if (JSON.stringify(next) === JSON.stringify(live.current)) return;
    history.current.push(clone(live.current));
    if (history.current.length > 100) history.current.shift();
    future.current = [];
    live.current = next;
    setD(next);
  }, []);
  useEffect(() => {
    try {
      stage.current = new Stage(host.current!, live.current, {
        select: (id) => {
          setSelected(id);
          if (id) setSettingsTab("part");
        },
        commit,
        face: setActiveFace,
        opening: (id, ids) => {
          setActiveOpening(id);
          setOpeningSelection(ids ?? (id ? [id] : []));
        },
        tool: (next) => {
          if (stage.current?.tool === "add" && next === "select")
            setSelectionMode("faces");
          setTool(next);
        },
        hint: setHint,
      });
    } catch (e) {
      setMessage(
        "The 3D view could not start. Enable WebGL in your browser. " +
          String(e),
      );
    }
    return () => stage.current?.dispose();
  }, [commit]);
  useEffect(() => {
    if (stage.current) {
      if (stage.current.selectionMode !== selectionMode) stage.current.cancel();
      stage.current.selectionMode = selectionMode;
      stage.current.drawShape = drawShape;
      stage.current.addShape = addShape;
      stage.current.showFloors = floorGuides;
      stage.current.showTerrain = terrainVisible;
      stage.current.xray = xray;
      stage.current.activeFace =
        activeFace?.partId === selected ? activeFace : null;
      stage.current.selectedOpening = activeOpening;
      stage.current.selectedOpenings = openingSelection;
      stage.current.openingKind = openingKind;
      stage.current.update(d, selected, tool);
    }
    try {
      localStorage.setItem(STORE, JSON.stringify(d));
    } catch {
      setMessage(
        "Browser recovery storage is unavailable. Save your scene locally to keep your work.",
      );
    }
  }, [
    d,
    selected,
    tool,
    drawShape,
    addShape,
    floorGuides,
    terrainVisible,
    xray,
    selectionMode,
    activeFace,
    activeOpening,
    openingSelection,
    openingKind,
  ]);
  function undo() {
    const old = history.current.pop();
    if (old) {
      future.current.push(clone(live.current));
      live.current = old;
      setD(old);
    }
  }
  function redo() {
    const next = future.current.pop();
    if (next) {
      history.current.push(clone(live.current));
      live.current = next;
      setD(next);
    }
  }
  function patch(v: Partial<Plan>) {
    commit({ ...clone(d), ...v });
  }
  function update(v: Partial<Part>) {
    const n = clone(d);
    const p = n.parts.find((p) => p.id === selected);
    if (p) {
      Object.assign(p, v);

      commit(n);
    }
  }
  function remove() {
    if (!selected || selected.includes(":")) return;
    patch({ parts: d.parts.filter((p) => p.id !== selected) });
    setSelected(null);
  }
  function duplicate() {
    const p = d.parts.find((p) => p.id === selected);
    if (!p) return;
    const q = {
      ...clone(p),
      id: uid(),
      name: p.name + " copy",
      openings: p.openings?.map((o) => ({ ...o, id: uid() })),
      role: "extension" as const,
      x: p.x + p.width,
    };
    patch({ parts: [...d.parts, q] });
    setSelected(q.id);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        busy ||
        sceneDraft ||
        moduleDialog ||
        exportDialog ||
        showHelp ||
        libraryModal
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
        return;
      }
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const part = live.current.parts.find((p) => p.id === selected);
        if (
          activeOpening &&
          part?.openings?.some((o) => o.id === activeOpening)
        ) {
          update({
            openings: part.openings.filter(
              (o) => !openingSelection.includes(o.id) && o.id !== activeOpening,
            ),
          });
          setActiveOpening(null);
        } else remove();
      } else if (e.key === "Escape") setTool("select");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (activeFace?.partId !== selected) {
      setActiveFace(null);
      setActiveOpening(null);
      setOpeningMenu(false);
      if (tool === "openings") setTool("select");
    }
  }, [selected, activeFace, tool]);
  useEffect(() => {
    if (!activeOpening) setOpeningSelection([]);
  }, [activeOpening]);
  useEffect(() => {
    const ids = openingSelection.filter((id) =>
      d.parts
        .find((p) => p.id === selected)
        ?.openings?.some((o) => o.id === id),
    );
    if (ids.length !== openingSelection.length) {
      setOpeningSelection(ids);
      setActiveOpening(ids.at(-1) ?? null);
    }
  }, [d, selected, openingSelection]);
  function camera(v: string) {
    setView(v);
    stage.current?.setView(v, true);
  }
  const dirty =
    !savedReference ||
    savedReference.id !== d.id ||
    savedReference.snapshot !== JSON.stringify(d);
  const libraryModal =
    libraryOpen || saveDialog || !!pendingScene || saving || switching;
  useEffect(() => {
    try {
      if (savedReference)
        localStorage.setItem(STORE + "-saved", JSON.stringify(savedReference));
      else localStorage.removeItem(STORE + "-saved");
    } catch {}
  }, [savedReference]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  async function showSave() {
    setLibraryError("");
    setSaveName(live.current.name);
    setSaveProject(
      savedReference?.id === live.current.id
        ? (savedReference.projectId ?? "")
        : "",
    );
    setSaveDialog(true);
    try {
      setProjects(await libraryRequest<Project[]>("/projects"));
    } catch (e) {
      setLibraryError(String(e));
    }
  }
  async function persist(
    name = live.current.name,
    projectId = savedReference?.id === live.current.id
      ? savedReference.projectId
      : null,
    planOverride?: Plan,
  ): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setLibraryError("");
    const plan = clone(planOverride ?? live.current);
    plan.name = name.trim() || "Untitled scene";
    try {
      const result = await libraryRequest<{ version: number }>(
        "/scenes/" + encodeURIComponent(plan.id),
        {
          plan,
          projectId: projectId || null,
          version: savedReference?.id === plan.id ? savedReference.version : 0,
        },
        "PUT",
      );
      setSavedReference({
        id: plan.id,
        version: result.version,
        projectId: projectId || null,
        snapshot: JSON.stringify(plan),
      });
      if (planOverride) commit(plan);
      else if (live.current.id === plan.id && live.current.name !== plan.name)
        commit({ ...live.current, name: plan.name });
      setSaveDialog(false);
      setMessage("Scene saved locally.");
      return true;
    } catch (e) {
      setLibraryError(String(e));
      setMessage("Scene could not be saved: " + String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }
  function save() {
    if (savedReference?.id === d.id) void persist();
    else void showSave();
  }
  function backup() {
    download(
      new Blob([JSON.stringify(live.current, null, 2)], {
        type: "application/json",
      }),
      slug(live.current.name) + ".plan.json",
    );
  }
  async function switchScene(action: PendingScene) {
    setSwitching(true);
    try {
      let plan: Plan,
        reference: SavedReference | null = null;
      if (action.kind === "open") {
        const record = await libraryRequest<SavedScene>(
          "/scenes/" + encodeURIComponent(action.id),
        );
        plan = validate(record.plan);
        reference = {
          id: plan.id,
          version: record.version,
          projectId: record.projectId,
          snapshot: JSON.stringify(plan),
        };
      } else if (action.kind === "import") {
        plan = validate(action.plan);
        plan.id = uid();
      } else plan = fresh();
      stage.current?.cancel();
      history.current = [];
      future.current = [];
      live.current = plan;
      setD(plan);
      setSavedReference(reference);
      setSelected(null);
      setLibraryOpen(false);
      setPendingScene(null);
      setTool(action.kind === "new" ? "draw" : "select");
      setView(action.kind === "new" ? "top" : "main");
      setTimeout(
        () =>
          stage.current?.setView(action.kind === "new" ? "top" : "main", true),
        0,
      );
    } catch (e) {
      setLibraryError(String(e));
      setMessage("Could not open scene. The current scene has been kept.");
    } finally {
      setSwitching(false);
    }
  }
  function requestSwitch(action: PendingScene) {
    setLibraryError("");
    setLibraryOpen(false);
    if (dirty) setPendingScene(action);
    else void switchScene(action);
  }
  async function open(f: File) {
    try {
      if (f.size > 2_000_000) throw Error("Plan file is too large.");
      requestSwitch({
        kind: "import",
        plan: validate(JSON.parse(await f.text())),
      });
    } catch (e) {
      setMessage("Could not import scene: " + String(e));
    } finally {
      if (file.current) file.current.value = "";
    }
  }
  async function pack() {
    if (!d.parts.length) {
      setMessage("Draw at least one part before exporting the scene.");
      return;
    }
    if (!stage.current) return;
    setBusy(true);
    try {
      const zip = new JSZip(),
        prefix = slug(d.name),
        v = "v" + String(revision).padStart(3, "0");
      const images = await stage.current.captures(includeTerrain);
      const exportPlan = {
        ...d,
        terrainLayout: includeTerrain ? d.terrainLayout : ("none" as const),
        terrain:
          includeTerrain && d.terrainLayout && d.terrainLayout !== "none"
            ? d.terrain === "none"
              ? ("minimal" as const)
              : d.terrain
            : ("none" as const),
      };
      zip.file(`${prefix}.plan.json`, JSON.stringify(exportPlan, null, 2));
      zip.file(`${prefix}-brief.md`, brief(exportPlan));
      for (const [aspect, blob] of Object.entries(images))
        zip.file(`${prefix}-${aspect}-day-${v}.png`, await blob.arrayBuffer());
      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            format: "asset-planner-reference-pack",
            version: 1,
            exportedAt: new Date().toISOString(),
            scene: d.name,
            groups: (d.groups ?? []).map((g) => ({
              ...g,
              mainAspect: mainAspect(d, "group:" + g.id),
            })),
            structures: sceneStructures(d).map((s) => ({
              id: s.id,
              name: s.name,
              mainAspect: mainAspect(d, "structure:" + s.id),
              parts: s.parts.map((p) => p.id),
            })),
            revision,
            units: d.units,
            majorCubeMetres: d.moduleSize,
            geometryAuthority: "plan JSON and all nine rendered views",
            rendering:
              "orthographic; common scale across five flat views and four isometric corners",
            openings: exportPlan.parts.map((p) => ({
              partId: p.id,
              hollowWalls: p.hollowWalls ?? false,
              wallThickness: p.wallThickness ?? 0.4,
              openings: p.openings ?? [],
              architecturalDetails: p.architecturalDetails ?? null,
            })),
            materialAssignments: materialMetadata(exportPlan),
            terrain: exportPlan.terrain,
            terrainGeometryIncluded:
              includeTerrain && (d.terrainLayout ?? "none") !== "none",
            terrainLayout: exportPlan.terrainLayout ?? "none",
            terrainPatches: terrainPatches(exportPlan),
            views: referenceViews,
            notes:
              "Structural blockout reference images. Terrain footprints are included in this manifest; no production mesh is exported.",
            warnings: warnings(d),
          },
          null,
          2,
        ),
      );
      download(
        await zip.generateAsync({ type: "blob" }),
        `${prefix}-reference-pack-${v}.zip`,
      );
      setMessage(
        "Reference pack downloaded: plan, brief, nine views and manifest.",
      );
    } catch (e) {
      setMessage("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
      setExportDialog(false);
    }
  }
  const p = d.parts.find((p) => p.id === selected),
    step = d.moduleSize / d.subdivision,
    issues = warnings(d);
  const selectedGroup = d.groups?.find((g) => selected === `group:${g.id}`);
  const selectedStructure = sceneStructures(d).find(
    (s) => selected === `structure:${s.id}`,
  );
  const selectionMembers = selectedParts(d, selected);
  const selectionTitle =
    p?.name ?? selectedGroup?.name ?? selectedStructure?.name ?? d.name;
  const selectionType = p
    ? p.shape === "circle"
      ? p.innerDiameter !== undefined
        ? "HOLLOW CYLINDER PART"
        : "CYLINDER PART"
      : "PART"
    : selectedGroup
      ? "GROUP"
      : selectedStructure
        ? "STRUCTURE"
        : "SCENE";
  const counted = (n: number, noun: string) =>
    `${n} ${noun}${n === 1 ? "" : "s"}`;
  const groupStructureCount = selectedGroup
    ? sceneStructures(d).filter(
        (s) =>
          s.parts.length > 1 &&
          s.parts.some((q) => q.groupId === selectedGroup.id),
      ).length
    : 0;
  const selectionDetails = p
    ? `${p.width.toFixed(2)} × ${p.depth.toFixed(2)} m · ${height(p).toFixed(2)} m high · ${baseY(p).toFixed(2)} m elevation`
    : selectedGroup || selectedStructure
      ? `${counted(selectionMembers.length, "part")}${selectedGroup ? ` · ${counted(groupStructureCount, "structure")}` : " · connected"}`
      : `${counted(d.parts.length, "part")} · ${counted(d.groups?.length ?? 0, "group")} · Select a component to inspect it`;
  function draftPatch(values: Partial<Plan>) {
    setSceneDraft((old) => (old ? { ...old, ...values } : old));
  }
  function aspectSettings() {
    const owner = aspectOwner(d, selected);
    if (!owner) return null;
    const structure = sceneStructures(d).find(
      (s) => `structure:${s.id}` === owner,
    );
    const canEdit =
      owner === selected ||
      (structure?.parts.length === 1 && structure.parts[0].id === selected);
    if (!canEdit)
      return (
        <p className="micro">
          Main aspect is set by the{" "}
          {owner.startsWith("group:") ? "group" : "structure"}.{" "}
          <button
            onClick={() => {
              setSelected(owner);
              setSettingsTab("part");
            }}
          >
            Edit main aspect
          </button>
        </p>
      );
    return (
      <>
        <label className="field">
          Main aspect
          <select
            aria-label="Main aspect"
            value={mainAspect(d, selected)}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (owner.startsWith("group:"))
                patch({
                  groups: d.groups?.map((g) =>
                    g.id === owner.slice(6) ? { ...g, mainAspect: value } : g,
                  ),
                });
              else
                patch({
                  structureAspects: {
                    ...d.structureAspects,
                    [owner.slice(10)]: value,
                  },
                });
            }}
          >
            {aspectDirections.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <p className="micro">
          The green ground arrow marks this{" "}
          {owner.startsWith("group:") ? "group" : "structure"}’s main aspect.
          All children use this direction.
        </p>
        <button
          onClick={() => {
            stage.current?.setView("main", true, mainAspect(d, selected));
            setView("main");
          }}
        >
          View main aspect
        </button>
      </>
    );
  }
  return (
    <div className="app">
      <header
        inert={
          !!sceneDraft ||
          moduleDialog ||
          exportDialog ||
          showHelp ||
          libraryModal
        }
      >
        <div className="brand">
          <span className="brand-mark">▧</span>
          <div>ASSET DESIGNER</div>
        </div>
        <div className="document">
          <input
            aria-label="Scene name"
            value={d.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <button
            className={"save-status " + (!dirty ? "is-saved" : "")}
            title="Save or change this scene’s project"
            onClick={() => void showSave()}
            aria-live="polite"
          >
            {saving
              ? "Saving…"
              : !dirty
                ? "● Saved locally"
                : savedReference?.id === d.id
                  ? "● Unsaved changes"
                  : "○ Not saved"}
          </button>
        </div>
        <nav>
          <div className="undo">
            <button
              aria-label="Undo"
              disabled={!history.current.length}
              onClick={undo}
            >
              <ToolIcon name="undo" />
            </button>
            <button
              aria-label="Redo"
              disabled={!future.current.length}
              onClick={redo}
            >
              <ToolIcon name="redo" />
            </button>
          </div>

          <button
            aria-label="Settings"
            onClick={() => {
              setNewModule(d.moduleSize);
              setNewSubdivision(d.subdivision);
              setRescaleSettings(false);
              setSaveProject(
                savedReference?.id === d.id
                  ? (savedReference.projectId ?? "")
                  : "",
              );
              setLibraryError("");
              setModuleDialog(true);
              libraryRequest<Project[]>("/projects")
                .then(setProjects)
                .catch((e) => setLibraryError(String(e)));
            }}
          >
            <ToolIcon name="settings" /> <span>Settings</span>
          </button>
          <button aria-label="Help" onClick={() => setShowHelp(true)}>
            ?
          </button>
          <button onClick={() => requestSwitch({ kind: "new" })}>New</button>
          <button onClick={() => setLibraryOpen(true)}>Library</button>
          <button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save scene"}
          </button>
          <button
            className="primary"
            disabled={busy || !d.parts.length}
            onClick={() => setExportDialog(true)}
          >
            {busy ? "Exporting…" : "Export references ↗"}
          </button>
        </nav>
        <input
          hidden
          type="file"
          ref={file}
          accept=".json"
          onChange={(e) => e.target.files?.[0] && open(e.target.files[0])}
        />
      </header>
      <div
        className="workspace"
        inert={
          !!sceneDraft ||
          moduleDialog ||
          exportDialog ||
          showHelp ||
          libraryModal
        }
      >
        <Floating title="Scene components" className="left">
          <SceneTree
            selectedOpening={activeOpening}
            selectedOpenings={openingSelection}
            selectOpening={(partId, id, face, shift) => {
              stage.current?.chooseOpening(partId, id, face, shift);
              setSettingsTab("part");
              setTool("select");
              setSelectionMode("faces");
            }}
            plan={d}
            selected={selected}
            commit={commit}
            select={(id) => {
              setSelected(id);
              setActiveOpening(null);
              setSettingsTab("part");
              setTool(id.includes(":") ? "move" : "select");
            }}
          />
        </Floating>
        <main>
          <div className="canvas-toolbar">
            <div className="segmented">
              {(
                ["select", "draw", "add", "move", "rotate", "scale"] as Tool[]
              ).map((t) => (
                <button
                  key={t}
                  disabled={!!selected?.includes(":") && t === "rotate"}
                  title={
                    selected?.includes(":") && t === "rotate"
                      ? "Select an individual part for this tool"
                      : undefined
                  }
                  className={tool === t ? "chosen" : ""}
                  onClick={() => {
                    setTool(t);
                    if (t === "draw") camera("top");
                  }}
                >
                  <ToolIcon name={t} />
                  <span>{t[0].toUpperCase() + t.slice(1)}</span>
                </button>
              ))}
            </div>
            {activeFace?.partId === selected && activeFace && (
              <div className="opening-picker">
                <button
                  className={tool === "openings" ? "chosen" : ""}
                  aria-expanded={openingMenu}
                  onClick={() => setOpeningMenu((v) => !v)}
                >
                  <ToolIcon name="openings" /> Openings ▾
                </button>
                {openingMenu && (
                  <div
                    className="opening-menu"
                    role="group"
                    aria-label="Opening shapes"
                  >
                    {openingKinds.map((kind) => (
                      <button
                        key={kind}
                        onClick={() => {
                          setOpeningKind(kind);
                          setTool("openings");
                          setOpeningMenu(false);
                          setHint(
                            `Draw ${openingName(kind).toLowerCase()} on highlighted wall`,
                          );
                        }}
                      >
                        <OpeningIcon kind={kind} />
                        <span>{openingName(kind)}</span>
                      </button>
                    ))}
                    <label className="settings-check opening-wall-toggle">
                      <input
                        type="checkbox"
                        checked={p?.hollowWalls ?? false}
                        onChange={(e) =>
                          update({ hollowWalls: e.target.checked })
                        }
                      />{" "}
                      Hollow walls (through-openings)
                    </label>
                    <p className="micro">
                      Draw on highlighted wall {activeFace.index + 1}. Escape
                      cancels.
                    </p>
                  </div>
                )}
                {tool === "openings" && (
                  <span className="micro">
                    {openingName(openingKind)} · drag on wall
                  </span>
                )}
              </div>
            )}
            {tool === "add" && (
              <div className="segmented add-controls">
                <select
                  aria-label="Shape to add"
                  value={addShape}
                  onChange={(e) => setAddShape(e.target.value as Primitive)}
                >
                  <option value="cube">Cube</option>
                  <option value="cylinder">Cylinder</option>
                  <option value="donut">Donut (hollow cylinder)</option>
                </select>
                <span className="micro">Click to place · Esc cancels</span>
              </div>
            )}
            {tool === "scale" && (
              <div
                className="scale-controls"
                role="group"
                aria-label="Uniform scale"
              >
                <label className="scale-field">
                  <span className="scale-label">Factor</span>
                  <input
                    aria-label="Scale factor"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.1"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(Number(e.target.value))}
                    title="Multiplier: 0.5 halves the size; 2 doubles it"
                  />
                  <span className="scale-unit" aria-hidden="true">
                    ×
                  </span>
                </label>
                <button
                  className="scale-apply"
                  disabled={
                    !selected ||
                    !selectionMembers.length ||
                    !Number.isFinite(scaleFactor) ||
                    scaleFactor <= 0
                  }
                  onClick={() => {
                    if (!selected) return;
                    try {
                      commit(
                        validate(scaleSelection(d, selected, scaleFactor)),
                      );
                      setScaleFactor(1);
                      setHint(
                        "Selection scaled uniformly around its base centre",
                      );
                    } catch (error) {
                      setMessage(String(error));
                    }
                  }}
                >
                  Apply scale
                </button>
              </div>
            )}
            {tool === "select" && (
              <div
                className="segmented"
                role="group"
                aria-label="Selection mode"
              >
                {(["vertices", "edges", "faces"] as SelectionMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      aria-pressed={selectionMode === mode}
                      className={selectionMode === mode ? "chosen" : ""}
                      onClick={() => setSelectionMode(mode)}
                    >
                      {mode === "vertices"
                        ? "Vertices"
                        : mode === "edges"
                          ? "Edges"
                          : "Faces"}
                    </button>
                  ),
                )}
              </div>
            )}
            {tool === "draw" && (
              <div className="segmented">
                <button
                  className={drawShape === "rectangle" ? "chosen" : ""}
                  onClick={() => setDrawShape("rectangle")}
                >
                  ▱ Rectangle
                </button>
                <button
                  className={drawShape === "circle" ? "chosen" : ""}
                  onClick={() => setDrawShape("circle")}
                >
                  ◯ Circle
                </button>
              </div>
            )}
            <div className="view-tools">
              <div className="guides">
                <button
                  aria-pressed={floorGuides}
                  className={floorGuides ? "chosen" : ""}
                  onClick={() => setFloorGuides(!floorGuides)}
                >
                  Floor guides
                </button>
                <button
                  aria-pressed={
                    terrainVisible && (d.terrainLayout ?? "none") !== "none"
                  }
                  disabled={(d.terrainLayout ?? "none") === "none"}
                  className={
                    terrainVisible &&
                    d.terrainLayout &&
                    d.terrainLayout !== "none"
                      ? "chosen"
                      : ""
                  }
                  onClick={() => setTerrainVisible((v) => !v)}
                >
                  Terrain
                </button>
                <button
                  aria-pressed={xray}
                  className={xray ? "chosen" : ""}
                  onClick={() => setXray((v) => !v)}
                  title="See through components; reference exports stay solid"
                >
                  X-ray
                </button>
              </div>
              <div className="views">
                <div className="segmented" aria-label="View dimension">
                  <button
                    aria-pressed={flatView(view)}
                    className={flatView(view) ? "chosen" : ""}
                    onClick={() => camera("top")}
                  >
                    2D
                  </button>
                  <button
                    aria-pressed={!flatView(view)}
                    className={!flatView(view) ? "chosen" : ""}
                    onClick={() => camera("main")}
                  >
                    3D
                  </button>
                </div>
                <select
                  aria-label="Camera view"
                  value={view}
                  onChange={(e) => camera(e.target.value)}
                >
                  {flatView(view) ? (
                    ["top", "front", "back", "left", "right"].map((v) => (
                      <option key={v} value={v}>
                        {v[0].toUpperCase() + v.slice(1)}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="main">Front right</option>
                      <option value="reverse">Back left</option>
                      <option value="iso-front-left">Front left</option>
                      <option value="iso-back-right">Back right</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
          <div className="viewport" ref={host} />
          <div className="view-caption">
            <span className="overline">{selectionType}</span>
            <h1>{selectionTitle || "Untitled scene"}</h1>
            <p>{selectionDetails}</p>
          </div>
          {!d.parts.length && (
            <div className="empty">
              <h2>Start with a footprint.</h2>
              <p>Choose Draw, then drag across the grid.</p>
            </div>
          )}
          <div className="canvas-bottom">
            <span>
              <i /> {hint}
            </span>
            <span>
              Orbit: drag empty space · Pan: right drag · Zoom: scroll
            </span>
          </div>
          <div className="handle-key">
            <span>
              {tool === "move"
                ? "Select the centre handle for XYZ arrows · drag centre to move across ground"
                : tool === "select"
                  ? selectionMode === "vertices"
                    ? "Vertices · wall corners and ridge endpoints"
                    : selectionMode === "edges"
                      ? "Edges · hover an edge; roof and cap controls available"
                      : "Faces · hover a wall face; height and cap controls available"
                  : tool === "rotate"
                    ? "Drag the rotation ring · Shift for finer steps"
                    : tool === "scale"
                      ? "Select a part, structure or group · 0.5 halves size; 2 doubles it"
                      : tool === "add"
                        ? "Click to place a shape · Escape cancels"
                        : "Drag to draw a footprint"}
            </span>
          </div>
        </main>
        <Floating title="Settings" className="right">
          <div className="settings-tabs">
            <button
              className={settingsTab === "building" ? "chosen" : ""}
              onClick={() => {
                setSceneDraft(clone(d));
                setRevisionDraft(revision);
              }}
            >
              Scene Settings
            </button>
            <button
              className={settingsTab === "part" ? "chosen" : ""}
              onClick={() => setSettingsTab("part")}
            >
              Component Settings
            </button>
          </div>
          <div className="component-scroll" hidden={settingsTab !== "part"}>
            <div className="section-head">
              {selected?.includes(":")
                ? "COLLECTION PROPERTIES"
                : p
                  ? "PART PROPERTIES"
                  : "SELECT A COMPONENT"}
            </div>
            {selected?.includes(":") ? (
              <div>
                <h3>
                  {selected.startsWith("group:") ? "Group" : "Structure"}{" "}
                  settings
                </h3>
                <p>
                  {selectedParts(d, selected).length} parts selected. Use Move
                  and its XYZ arrows to move them together.
                </p>
                <label className="field">
                  Name
                  <input
                    aria-label="Collection name"
                    value={
                      selected.startsWith("group:")
                        ? (d.groups?.find((g) => g.id === selected.slice(6))
                            ?.name ?? "")
                        : (sceneStructures(d).find(
                            (s) => s.id === selected.slice(10),
                          )?.name ?? "")
                    }
                    onChange={(e) => {
                      if (selected.startsWith("group:"))
                        patch({
                          groups: d.groups?.map((g) =>
                            g.id === selected.slice(6)
                              ? { ...g, name: e.target.value }
                              : g,
                          ),
                        });
                      else
                        patch({
                          structureNames: {
                            ...d.structureNames,
                            [selected.slice(10)]: e.target.value,
                          },
                        });
                    }}
                  />
                </label>
                {aspectSettings()}
                {selected.startsWith("group:") && (
                  <button
                    onClick={() => {
                      const n = clone(d);
                      n.groups = n.groups?.filter(
                        (g) => g.id !== selected.slice(6),
                      );
                      n.parts.forEach((p) => {
                        if (p.groupId === selected.slice(6)) delete p.groupId;
                      });
                      commit(n);
                      setSelected(null);
                    }}
                  >
                    Ungroup (keep parts)
                  </button>
                )}
              </div>
            ) : p ? (
              <>
                <input
                  className="part-title"
                  aria-label="Part name"
                  value={p.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
                <details className="part-section">
                  <summary>Organisation & aspect</summary>
                  {aspectSettings()}
                  <label className="field">
                    Group
                    <select
                      aria-label="Component group"
                      value={p.groupId ?? ""}
                      onChange={(e) =>
                        commit(
                          assignGroup(d, p.id, e.target.value || undefined),
                        )
                      }
                    >
                      <option value="">Ungrouped</option>
                      {(d.groups ?? []).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
                {p.shape !== "circle" && (
                  <details className="part-section" open={!!activeOpening}>
                    <summary>
                      Walls & openings ({p.openings?.length ?? 0})
                    </summary>
                    <label className="settings-check">
                      <input
                        type="checkbox"
                        checked={p.hollowWalls ?? false}
                        onChange={(e) =>
                          update({ hollowWalls: e.target.checked })
                        }
                      />{" "}
                      Hollow walls
                    </label>
                    <Num
                      label="Wall thickness"
                      value={p.wallThickness ?? 0.4}
                      min={0.05}
                      max={Math.min(5, Math.min(p.width, p.depth) / 2 - 0.05)}
                      step={0.05}
                      onChange={(wallThickness) => update({ wallThickness })}
                    />
                    <p className="micro">
                      {p.hollowWalls
                        ? "Through-openings with interior walls and a simple floor."
                        : "Solid body: openings become shallow recesses. Enable Hollow walls for through-openings."}{" "}
                      Select → Faces, click a wall, then use Openings to draw.
                    </p>
                    {(p.openings ?? []).map((o) => (
                      <button
                        className={
                          activeOpening === o.id ? "wide chosen" : "wide"
                        }
                        key={o.id}
                        onClick={() => {
                          setActiveOpening(o.id);
                          setOpeningSelection([o.id]);
                          setActiveFace({ partId: p.id, index: o.face });
                        }}
                      >
                        {o.name} · wall {o.face + 1}
                      </button>
                    ))}
                    {(() => {
                      const o = p.openings?.find((o) => o.id === activeOpening);
                      if (!o) return null;
                      const change = (patch: Partial<Opening>) =>
                        update({
                          openings: p.openings!.map((q) =>
                            q.id === o.id ? { ...q, ...patch } : q,
                          ),
                        });
                      const selectedIds = openingSelection.length
                        ? openingSelection
                        : [o.id];
                      const changeInfill = (patch: Partial<Infill>) =>
                        change({ infill: { ...o.infill!, ...patch } });
                      return (
                        <div className="opening-properties">
                          <p className="muted">
                            {selectedIds.length} opening
                            {selectedIds.length === 1 ? "" : "s"} selected ·
                            Shift-click openings on this wall to add/remove.
                            Drag a selected centre to move together.
                          </p>
                          <button
                            className="wide"
                            onClick={() => {
                              try {
                                const result = duplicateOpenings(
                                  d,
                                  p.id,
                                  selectedIds,
                                );
                                commit(result.plan);
                                setOpeningSelection(result.ids);
                                setActiveOpening(result.ids.at(-1)!);
                                setTool("select");
                                setHint(
                                  "Copies selected · drag a centre handle to move together",
                                );
                              } catch (error) {
                                setMessage(String(error));
                              }
                            }}
                          >
                            Duplicate selected openings ({selectedIds.length})
                          </button>
                          <label className="field">
                            Opening name
                            <input
                              aria-label="Opening name"
                              value={o.name}
                              onChange={(e) => change({ name: e.target.value })}
                            />
                          </label>
                          <div className="pair">
                            <Num
                              label="Opening width"
                              value={o.width}
                              min={0.1}
                              max={500}
                              step={step}
                              onChange={(width) =>
                                change({
                                  width,
                                  ...(o.kind === "circle-window"
                                    ? { height: width }
                                    : {}),
                                })
                              }
                            />
                            <Num
                              label="Opening height"
                              value={o.height}
                              min={0.1}
                              max={500}
                              step={step}
                              onChange={(height) =>
                                change({
                                  height,
                                  ...(o.kind === "circle-window"
                                    ? { width: height }
                                    : {}),
                                })
                              }
                            />
                          </div>
                          <Num
                            label="Offset from wall start"
                            value={o.x}
                            min={0.05}
                            max={500}
                            step={step}
                            onChange={(x) => change({ x })}
                          />
                          <Num
                            label="Sill / base height"
                            value={o.y}
                            min={0}
                            max={500}
                            step={step}
                            onChange={(y) => change({ y })}
                          />
                          <details className="part-section">
                            <summary>Opening surrounds</summary>
                            <label className="field">
                              Detail settings
                              <select
                                value={o.detailsMode ?? "inherit"}
                                onChange={(e) => {
                                  const mode = e.target.value as
                                    "inherit" | "off" | "custom";
                                  update(
                                    reconcileThresholds({
                                      ...p,
                                      openings: p.openings!.map((q) =>
                                        q.id === o.id
                                          ? {
                                              ...q,
                                              detailsMode: mode,
                                              architecturalDetails:
                                                mode === "custom"
                                                  ? (q.architecturalDetails ??
                                                    structuredClone(
                                                      p.architecturalDetails ??
                                                        defaultDetails(),
                                                    ))
                                                  : q.architecturalDetails,
                                            }
                                          : q,
                                      ),
                                    }),
                                  );
                                }}
                              >
                                <option value="inherit">
                                  Use component settings
                                </option>
                                <option value="off">
                                  Disabled for this opening
                                </option>
                                <option value="custom">Custom settings</option>
                              </select>
                            </label>
                            {o.detailsMode === "custom" && (
                              <ArchitecturalControls
                                opening
                                value={o.architecturalDetails}
                                onChange={(architecturalDetails) =>
                                  update(
                                    reconcileThresholds({
                                      ...p,
                                      openings: p.openings!.map((q) =>
                                        q.id === o.id
                                          ? { ...q, architecturalDetails }
                                          : q,
                                      ),
                                    }),
                                  )
                                }
                              />
                            )}
                          </details>
                          <details className="part-section" open>
                            <summary>Infill</summary>
                            <label className="field">
                              Fill opening
                              <select
                                aria-label="Opening infill"
                                value={o.infill?.type ?? "empty"}
                                onChange={(e) =>
                                  change({
                                    infill:
                                      e.target.value === "empty"
                                        ? undefined
                                        : defaultInfill(
                                            e.target.value as Infill["type"],
                                          ),
                                  })
                                }
                              >
                                <option value="empty">Empty</option>
                                <option value="door">Door</option>
                                <option value="window">Window</option>
                              </select>
                            </label>
                            {o.infill && (
                              <>
                                <details className="part-section">
                                  <summary>Fit & depth</summary>
                                  <div className="pair">
                                    <Num
                                      label="Inset depth"
                                      value={o.infill.inset}
                                      min={0}
                                      max={5}
                                      step={0.01}
                                      onChange={(inset) =>
                                        changeInfill({ inset })
                                      }
                                    />
                                    <Num
                                      label="Panel thickness"
                                      value={o.infill.thickness}
                                      min={0.005}
                                      max={1}
                                      step={0.01}
                                      onChange={(thickness) =>
                                        changeInfill({ thickness })
                                      }
                                    />
                                  </div>
                                  {!p.hollowWalls && (
                                    <p className="muted">
                                      Enable hollow walls for a clear view
                                      through windows. Solid parts retain a
                                      recess backing.
                                    </p>
                                  )}
                                </details>
                                <details className="part-section" open>
                                  <summary>
                                    {o.infill.type === "door"
                                      ? "Door leaves"
                                      : "Frame & bars"}
                                  </summary>
                                  {o.infill.type === "door" ? (
                                    <>
                                      <label className="settings-check">
                                        <input
                                          type="checkbox"
                                          checked={o.infill.doubleDoor}
                                          onChange={(e) =>
                                            changeInfill({
                                              doubleDoor: e.target.checked,
                                            })
                                          }
                                        />{" "}
                                        Double door
                                      </label>
                                      {o.infill.doubleDoor && (
                                        <Num
                                          label="Gap between leaves"
                                          value={o.infill.gapWidth ?? 0.01}
                                          min={0}
                                          max={5}
                                          step={0.005}
                                          onChange={(gapWidth) =>
                                            changeInfill({ gapWidth })
                                          }
                                        />
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Num
                                        label="Frame / bar width"
                                        value={o.infill.frameWidth}
                                        min={0.005}
                                        max={1}
                                        step={0.01}
                                        onChange={(frameWidth) =>
                                          changeInfill({ frameWidth })
                                        }
                                      />
                                      <label className="field">
                                        Window bars
                                        <select
                                          value={o.infill.bars}
                                          onChange={(e) =>
                                            changeInfill({
                                              bars: e.target.value as
                                                "auto" | "manual",
                                            })
                                          }
                                        >
                                          <option value="auto">Auto</option>
                                          <option value="manual">Manual</option>
                                        </select>
                                      </label>
                                      {o.infill.bars === "manual" && (
                                        <div className="pair">
                                          <Num
                                            label="Horizontal bars"
                                            value={o.infill.horizontal}
                                            min={0}
                                            max={12}
                                            step={1}
                                            onChange={(horizontal) =>
                                              changeInfill({ horizontal })
                                            }
                                          />
                                          <Num
                                            label="Vertical bars"
                                            value={o.infill.vertical}
                                            min={0}
                                            max={12}
                                            step={1}
                                            onChange={(vertical) =>
                                              changeInfill({ vertical })
                                            }
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}
                                </details>
                                <details className="part-section">
                                  <summary>Materials</summary>
                                  {(o.infill.type === "door"
                                    ? ["doorMaterial"]
                                    : ["frameMaterial", "glassMaterial"]
                                  ).map((key) => (
                                    <label className="field" key={key}>
                                      {key === "doorMaterial"
                                        ? "Door material"
                                        : key === "frameMaterial"
                                          ? "Frame material"
                                          : "Glass material"}
                                      <textarea
                                        value={o.infill![key as "doorMaterial"]}
                                        onChange={(e) =>
                                          changeInfill({
                                            [key]: e.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                  ))}
                                </details>
                                <details className="part-section">
                                  <summary>Apply to other openings</summary>
                                  <p className="muted">
                                    Copies infill settings and materials across
                                    this scene, replacing existing infills.
                                    Similar size means width and height within
                                    20%. Undo reverses the whole change.
                                  </p>
                                  {[false, true].map((similar) => {
                                    const count = infillTargets(
                                      d,
                                      o,
                                      similar,
                                    ).length;
                                    return (
                                      <button
                                        key={String(similar)}
                                        className="wide"
                                        disabled={!count}
                                        onClick={() => {
                                          commit(copyInfill(d, o, similar));
                                          setHint(
                                            "Infill applied to " +
                                              count +
                                              " other openings",
                                          );
                                        }}
                                      >
                                        All{" "}
                                        {o.infill!.type === "door"
                                          ? "doors"
                                          : "windows"}
                                        {similar ? " (similar size)" : ""} ·{" "}
                                        {count}
                                      </button>
                                    );
                                  })}
                                </details>
                              </>
                            )}
                          </details>
                          <button
                            className="danger wide"
                            onClick={() => {
                              update({
                                openings: p.openings!.filter(
                                  (q) => !selectedIds.includes(q.id),
                                ),
                              });
                              setActiveOpening(null);
                            }}
                          >
                            Delete selected openings ({selectedIds.length})
                          </button>
                        </div>
                      );
                    })()}
                  </details>
                )}
                {p.shape !== "circle" && (
                  <details className="part-section">
                    <summary>Architectural details</summary>
                    <ArchitecturalControls
                      value={p.architecturalDetails}
                      onChange={(architecturalDetails) =>
                        update(
                          reconcileThresholds({ ...p, architecturalDetails }),
                        )
                      }
                    />
                  </details>
                )}
                <details className="part-section" open>
                  <summary>Dimensions</summary>
                  <div className="pair">
                    <Num
                      label={
                        p.innerDiameter !== undefined
                          ? "Bottom outer diameter"
                          : p.shape === "circle"
                            ? "Bottom diameter"
                            : "Width"
                      }
                      value={p.width}
                      min={
                        p.innerDiameter !== undefined
                          ? p.innerDiameter + 0.1
                          : p.shape === "circle"
                            ? 0.1
                            : step
                      }
                      step={step}
                      onChange={(width) =>
                        update(
                          p.shape === "circle"
                            ? {
                                width,
                                depth: width,
                                ...(p.innerDiameter !== undefined
                                  ? {
                                      topInnerDiameter:
                                        p.topInnerDiameter ?? p.innerDiameter,
                                    }
                                  : {}),
                                topDiameter: p.topDiameter ?? p.width,
                              }
                            : { width },
                        )
                      }
                    />
                    <Num
                      label={
                        p.innerDiameter !== undefined
                          ? "Bottom inner diameter"
                          : p.shape === "circle"
                            ? "Top diameter"
                            : "Depth"
                      }
                      value={
                        p.shape === "circle"
                          ? (p.innerDiameter ?? p.topDiameter ?? p.width)
                          : p.depth
                      }
                      min={p.shape === "circle" ? 0.1 : step}
                      max={p.innerDiameter !== undefined ? p.width - 0.1 : 500}
                      step={step}
                      onChange={(depth) =>
                        update(
                          p.shape === "circle"
                            ? p.innerDiameter !== undefined
                              ? {
                                  innerDiameter: depth,
                                  topInnerDiameter:
                                    p.topInnerDiameter ?? p.innerDiameter,
                                }
                              : { topDiameter: depth }
                            : { depth },
                        )
                      }
                    />
                  </div>
                  {p.innerDiameter !== undefined && (
                    <div className="pair">
                      <Num
                        label="Top outer diameter"
                        value={p.topDiameter ?? p.width}
                        min={(p.topInnerDiameter ?? p.innerDiameter) + 0.1}
                        max={500}
                        step={step}
                        onChange={(topDiameter) => update({ topDiameter })}
                      />
                      <Num
                        label="Top inner diameter"
                        value={p.topInnerDiameter ?? p.innerDiameter}
                        min={0.1}
                        max={(p.topDiameter ?? p.width) - 0.1}
                        step={step}
                        onChange={(topInnerDiameter) =>
                          update({ topInnerDiameter })
                        }
                      />
                    </div>
                  )}
                </details>
                <details className="part-section">
                  <summary>Position</summary>
                  <div className="pair">
                    <Num
                      label="Position X"
                      value={p.x}
                      min={-1000}
                      max={1000}
                      step={step}
                      onChange={(x) => update({ x })}
                    />
                    <Num
                      label="Position Z"
                      value={p.z}
                      min={-1000}
                      max={1000}
                      step={step}
                      onChange={(z) => update({ z })}
                    />
                  </div>
                </details>
                <details className="part-section">
                  <summary>Floors / walls</summary>
                  <div className="pair">
                    <Num
                      label="Floors"
                      value={Number(estimatedFloors(p).toFixed(2))}
                      min={0.1}
                      max={1000}
                      step={0.1}
                      unit=""
                      onChange={(floors) =>
                        update({
                          floors,
                          cornerHeights: undefined,
                          wallHeight: undefined,
                        })
                      }
                    />
                    <Num
                      label="Floor height"
                      value={p.floorHeight}
                      min={0.5}
                      max={20}
                      step={0.25}
                      onChange={(floorHeight) =>
                        update({
                          floorHeight,
                          wallHeight: height(p),
                          cornerHeights: undefined,
                        })
                      }
                    />
                  </div>
                  <Num
                    label={
                      p.shape === "circle" ? "Height" : "Wall / eaves height"
                    }
                    value={height(p)}
                    min={0.1}
                    max={500}
                    step={step}
                    onChange={(wallHeight) =>
                      update({ wallHeight, cornerHeights: undefined })
                    }
                  />
                  <p className="micro">
                    Floor count updates from this height. Drag in grid
                    subdivisions; nearby eaves and roof tops snap automatically.
                  </p>
                </details>
                <details className="part-section">
                  <summary>Elevation / rotation</summary>
                  <Num
                    label="Base elevation"
                    value={baseY(p)}
                    min={0}
                    max={500}
                    step={step}
                    onChange={(baseY) => update({ baseY })}
                  />
                  <Num
                    label="Part rotation"
                    value={p.rotation}
                    min={0}
                    max={360}
                    step={15}
                    unit="°"
                    onChange={(rotation) => update({ rotation })}
                  />
                  {p.cornerBases && (
                    <button
                      className="wide"
                      onClick={() => update({ cornerBases: undefined })}
                    >
                      Level wall bases
                    </button>
                  )}
                  {p.cornerHeights && (
                    <button
                      className="wide"
                      onClick={() => update({ cornerHeights: undefined })}
                    >
                      Level wall tops
                    </button>
                  )}
                  <p className="micro">
                    Floor guides use this part’s {p.floorHeight} m floor height.
                    Base elevation lifts a part onto a roof.
                  </p>
                </details>
                <details className="part-section">
                  <summary>Roof</summary>
                  <label className="settings-check">
                    <input
                      type="checkbox"
                      checked={p.roofEnabled !== false}
                      onChange={(e) =>
                        update({ roofEnabled: e.target.checked })
                      }
                    />{" "}
                    Roof enabled
                  </label>
                  {p.roofEnabled !== false && (
                    <>
                      <label className="field">
                        Roof shape
                        <select
                          aria-label="Roof shape"
                          value={p.roof}
                          onChange={(e) =>
                            update({
                              roof: e.target.value as Part["roof"],
                              ridgeEnds: undefined,
                            })
                          }
                        >
                          <option value="gable" disabled={p.shape === "circle"}>
                            Gable / pitched
                          </option>
                          <option
                            value="lean-to"
                            disabled={p.shape === "circle"}
                          >
                            Lean-to / single slope
                          </option>
                          <option value="flat">Flat</option>
                        </select>
                      </label>
                      {p.roof === "gable" && (
                        <label className="field">
                          Ridge direction
                          <select
                            value={p.ridge}
                            onChange={(e) =>
                              update({
                                ridge: e.target.value as Part["ridge"],
                                ridgeEnds: undefined,
                              })
                            }
                          >
                            <option value="width">Along width</option>
                            <option value="depth">Along depth</option>
                          </select>
                        </label>
                      )}
                      {p.roof === "gable" && (
                        <>
                          <div className="pair">
                            {[0, 1].map((i) => {
                              const defaults = ridgeEnds({
                                  ...p,
                                  ridgeEnds: undefined,
                                }),
                                ends = ridgeEnds(p),
                                axis = p.ridge === "width" ? 0 : 2,
                                span = p.ridge === "width" ? p.width : p.depth;
                              const value =
                                (i === 0
                                  ? ends[i][axis] - defaults[i][axis]
                                  : defaults[i][axis] - ends[i][axis]) * span;
                              return (
                                <Num
                                  key={i}
                                  label={`Ridge ${i === 0 ? "start" : "end"} offset`}
                                  value={value}
                                  min={-span * 4.5}
                                  max={span * 0.49}
                                  step={step}
                                  onChange={(n) => {
                                    const next = clone(ends);
                                    next[i][axis] =
                                      defaults[i][axis] +
                                      ((i === 0 ? 1 : -1) * n) / span;
                                    update({ ridgeEnds: next });
                                  }}
                                />
                              );
                            })}
                          </div>
                          <p className="micro">
                            Positive offsets pull inward; negative offsets
                            extend outward to meet adjoining roofs. Hover
                            endpoints for XYZ arrows.
                          </p>
                          <button
                            className="wide"
                            onClick={() => update({ ridgeEnds: undefined })}
                          >
                            Reset ridge ends
                          </button>
                        </>
                      )}
                      {p.roof === "lean-to" && (
                        <label className="field">
                          High edge
                          <select
                            value={p.highEdge}
                            onChange={(e) =>
                              update({
                                highEdge: e.target.value as Part["highEdge"],
                              })
                            }
                          >
                            {["front", "back", "left", "right"].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {p.roof !== "flat" && (
                        <>
                          <Num
                            label="Roof rise"
                            value={p.rise}
                            min={0}
                            max={50}
                            step={step}
                            onChange={(rise) =>
                              update({
                                rise,
                                ridgeEnds: p.ridgeEnds?.map(([x, y, z]) => [
                                  x,
                                  Math.max(0, y + rise - p.rise),
                                  z,
                                ]),
                              })
                            }
                          />
                          <div className="metric">
                            ROOF PITCH{" "}
                            <strong>
                              {(
                                (Math.atan(
                                  p.rise /
                                    (p.roof === "gable"
                                      ? (p.ridge === "width"
                                          ? p.depth
                                          : p.width) / 2
                                      : p.highEdge === "left" ||
                                          p.highEdge === "right"
                                        ? p.width
                                        : p.depth),
                                ) *
                                  180) /
                                Math.PI
                              ).toFixed(1)}
                              °
                            </strong>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </details>
                <details className="part-section">
                  <summary>Subdivisions</summary>
                  <label className="settings-check">
                    <input
                      type="checkbox"
                      checked={p.subdivisions?.enabled ?? false}
                      onChange={(e) =>
                        update({
                          subdivisions: {
                            ...subdivisionDefaults(p),
                            enabled: e.target.checked,
                          },
                        })
                      }
                    />{" "}
                    Preview subdivisions
                  </label>
                  {p.subdivisions?.enabled && (
                    <>
                      {(["x", "y", "z"] as const).map((axis, i) => (
                        <Num
                          key={axis}
                          label={
                            p.shape === "circle"
                              ? ["Around", "Height", "Radial / wall thickness"][
                                  i
                                ]
                              : `${axis.toUpperCase()} divisions`
                          }
                          value={subdivisionDefaults(p)[axis]}
                          min={p.shape === "circle" && axis === "x" ? 3 : 1}
                          max={64}
                          step={1}
                          unit=""
                          onChange={(n) =>
                            update({
                              subdivisions: {
                                ...subdivisionDefaults(p),
                                [axis]: Math.round(n),
                              },
                            })
                          }
                        />
                      ))}
                      <p className="micro">
                        Body surface estimate:{" "}
                        {(() => {
                          const { x, y, z } = subdivisionDefaults(p);
                          return p.shape === "circle"
                            ? x * y * (p.innerDiameter === undefined ? 1 : 2) +
                                2 * x * z
                            : 2 * (x * y + x * z + y * z);
                        })()}{" "}
                        patches. Roof excluded.
                      </p>
                    </>
                  )}
                  <p className="micro">
                    Preview only — no new editable vertices yet. Counts are
                    segments, not extra cuts. Reference images exclude these
                    guides. Conversion and UV unwrapping will be added with mesh
                    editing.
                  </p>
                </details>
                <details className="part-section">
                  <summary>Materials</summary>
                  <MaterialFields
                    label="Body material"
                    value={bodyMaterial(p)}
                    onChange={(bodyMaterial) => update({ bodyMaterial })}
                  />
                  {p.roofEnabled !== false ? (
                    <MaterialFields
                      label="Roof material"
                      value={p.roofMaterial}
                      onChange={(roofMaterial) => update({ roofMaterial })}
                    />
                  ) : (
                    <p className="micro">
                      Enable the roof to edit its material. Any previous roof
                      description is retained.
                    </p>
                  )}
                  <p className="micro">
                    Descriptions are exported as material metadata. They do not
                    change viewport colours or generate textures.
                  </p>
                </details>
              </>
            ) : (
              <p className="aside-note">
                Select a part to edit dimensions and roof shape. Drag the
                coloured handles in 3D for quick changes.
              </p>
            )}
          </div>
          {settingsTab === "part" && p && !selected?.includes(":") && (
            <div className="pair actions part-actions">
              <button onClick={duplicate}>Duplicate</button>
              <button className="danger" onClick={remove}>
                Delete part
              </button>
            </div>
          )}
        </Floating>
      </div>
      {libraryOpen && (
        <SceneLibrary
          currentId={d.id}
          onOpen={(id) => requestSwitch({ kind: "open", id })}
          onClose={() => setLibraryOpen(false)}
          onImport={() => file.current?.click()}
          onBackup={backup}
        />
      )}
      {pendingScene && !saveDialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved scene"
          >
            <h2>Save this scene first?</h2>
            <p>
              “{d.name}” has unsaved changes. Save them before{" "}
              {pendingScene.kind === "new"
                ? "starting a blank scene"
                : "opening another scene"}
              .
            </p>
            {libraryError && <p role="alert">{libraryError}</p>}
            <div className="save-actions">
              <button onClick={() => setPendingScene(null)}>Cancel</button>
              <button onClick={() => void switchScene(pendingScene)}>
                Discard & continue
              </button>
              <button className="primary" onClick={() => void showSave()}>
                Save & continue
              </button>
            </div>
          </section>
        </div>
      )}
      {saveDialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Save scene locally"
          >
            <h2>Save scene locally</h2>
            <label className="field">
              Scene name
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="field">
              Project
              <select
                value={saveProject}
                onChange={(e) => setSaveProject(e.target.value)}
                disabled={saving}
              >
                <option value="">Unfiled scenes</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="new-project"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const p = await libraryRequest<Project>("/projects", {
                    name: newProjectName,
                  });
                  setProjects((old) => [...old, p]);
                  setSaveProject(p.id);
                  setNewProjectName("");
                } catch (e) {
                  setLibraryError(String(e));
                }
              }}
            >
              <input
                aria-label="New project name"
                placeholder="New project name"
                value={newProjectName}
                disabled={saving}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <button disabled={saving || !newProjectName.trim()}>
                Create
              </button>
            </form>
            {libraryError && <p role="alert">{libraryError}</p>}
            <div className="pair">
              <button disabled={saving} onClick={() => setSaveDialog(false)}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={saving || !saveName.trim()}
                onClick={async () => {
                  const action = pendingScene;
                  if (await persist(saveName, saveProject || null)) {
                    if (action) await switchScene(action);
                  }
                }}
              >
                {saving
                  ? "Saving…"
                  : pendingScene
                    ? "Save & continue"
                    : "Save scene"}
              </button>
            </div>
          </section>
        </div>
      )}
      {sceneDraft && (
        <div className="modal-backdrop">
          <section
            className="modal scene-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Scene settings"
          >
            <h2>Scene settings</h2>
            <div>
              <label className="field">
                Scene front
                <select
                  aria-label="Scene front"
                  value={sceneDraft.front}
                  onChange={(e) => {
                    draftPatch({ front: +e.target.value });
                  }}
                >
                  {[0, 90, 180, 270].map((n, i) => (
                    <option key={n} value={n}>
                      {
                        ["+Z · Front", "+X · Right", "−Z · Back", "−X · Left"][
                          i
                        ]
                      }
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Terrain intent
                <select
                  value={sceneDraft.terrain}
                  onChange={(e) =>
                    draftPatch({
                      terrain: e.target.value as Plan["terrain"],
                      ...(e.target.value === "none"
                        ? { terrainLayout: "none" as const }
                        : {}),
                    })
                  }
                >
                  <option value="minimal">Minimal sloped terrain</option>
                  <option value="full">Full terrain</option>
                  <option value="none">Components only</option>
                </select>
              </label>
              <p className="micro">
                Surface appearance for the art brief. Terrain layout below
                controls the blockout geometry.
              </p>
              <label className="field">
                Terrain layout
                <select
                  aria-label="Terrain layout"
                  value={sceneDraft.terrainLayout ?? "none"}
                  onChange={(e) =>
                    draftPatch({
                      terrainLayout: e.target.value as Plan["terrainLayout"],
                      terrain:
                        e.target.value === "none"
                          ? "none"
                          : sceneDraft.terrain === "none"
                            ? "minimal"
                            : sceneDraft.terrain,
                    })
                  }
                >
                  <option value="none">No terrain</option>
                  <option value="scene">One connected scene terrain</option>
                  <option value="collections">
                    Per group / ungrouped structure
                  </option>
                </select>
              </label>
              <Num
                label="Terrain margin"
                value={sceneDraft.terrainMargin ?? 1.5}
                min={0.25}
                max={30}
                step={0.25}
                onChange={(terrainMargin) => draftPatch({ terrainMargin })}
              />
              <p className="micro">
                One patch per group or ungrouped structure/part. Touching
                patches join; children never receive extra terrain. Use Terrain
                above the canvas to show or hide it.
              </p>
              <MaterialFields
                label="Terrain material"
                value={sceneDraft.terrainMaterial}
                onChange={(terrainMaterial) => draftPatch({ terrainMaterial })}
              />
              <label className="field">
                Scene notes
                <textarea
                  value={sceneDraft.notes}
                  placeholder="Purpose, condition, architectural details…"
                  onChange={(e) => draftPatch({ notes: e.target.value })}
                />
              </label>
              <Num
                label="Export version"
                value={revisionDraft}
                min={1}
                max={999}
                step={1}
                unit=""
                onChange={(v) => setRevisionDraft(Math.round(v))}
              />
              {issues.length > 0 && (
                <div className="warnings">
                  <strong>Before you export</strong>
                  {issues.map((s, i) => (
                    <p key={i}>{s}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="pair">
              <button onClick={() => setSceneDraft(null)}>Cancel</button>
              <button
                className="primary"
                onClick={() => {
                  commit(sceneDraft);
                  setRevision(revisionDraft);
                  setSceneDraft(null);
                }}
              >
                Save settings
              </button>
            </div>
          </section>
        </div>
      )}
      {exportDialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Export reference options"
          >
            <h2>Export scene references</h2>
            <p>
              Nine images at matching scale: front, back, left, right, top-down,
              and an isometric view from each of the four corners.
            </p>
            <label className="field">
              Terrain layout
              <select
                disabled={busy}
                value={d.terrainLayout ?? "none"}
                onChange={(e) =>
                  patch({
                    terrainLayout: e.target.value as Plan["terrainLayout"],
                    terrain:
                      e.target.value === "none"
                        ? "none"
                        : d.terrain === "none"
                          ? "minimal"
                          : d.terrain,
                  })
                }
              >
                <option value="none">No terrain</option>
                <option value="scene">One connected scene terrain</option>
                <option value="collections">
                  Per group / ungrouped structure
                </option>
              </select>
            </label>
            <p className="micro">
              This updates Scene Settings. Patches extend by{" "}
              {d.terrainMargin ?? 1.5} m; touching patches join without
              overlapping. Terrain is a simple sloped blockout at ground level.
            </p>
            <label className="field">
              <span>
                <input
                  type="checkbox"
                  checked={includeTerrain}
                  disabled={busy}
                  onChange={(e) => setIncludeTerrain(e.target.checked)}
                />{" "}
                Include terrain in exported images
              </span>
            </label>
            <p className="micro">
              Editor visibility does not affect export. The pack also includes
              the plan, art brief and view/terrain manifest.
            </p>
            <div className="pair">
              <button disabled={busy} onClick={() => setExportDialog(false)}>
                Cancel
              </button>
              <button disabled={busy || !d.parts.length} onClick={pack}>
                {busy ? "Exporting…" : "Export reference pack"}
              </button>
            </div>
          </section>
        </div>
      )}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {moduleDialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <h2 className="settings-heading">
              <ToolIcon name="settings" /> Settings
            </h2>
            <fieldset className="settings-fields" disabled={saving}>
              <label className="field">
                Project
                <select
                  aria-label="Scene project"
                  value={saveProject}
                  onChange={(e) => setSaveProject(e.target.value)}
                >
                  <option value="">Unfiled scenes</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="micro">
                Save settings stores this scene in the selected project,
                including any unsaved edits.
              </p>
              <h3>Grid & snapping</h3>
              <label className="field">
                Snap divisions
                <select
                  aria-label="Snap divisions"
                  value={newSubdivision}
                  onChange={(e) => setNewSubdivision(+e.target.value)}
                >
                  {[1, 2, 4, 6].map((x) => (
                    <option key={x} value={x}>
                      {x === 1 ? "Whole cube" : `1/${x} cube`} ·{" "}
                      {(newModule / x).toFixed(2)} m
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Set the physical size of the major grid cube. Smaller divisions
                handle doors, windows and finer adjustments.
              </p>
              <Num
                label="Cube size"
                value={newModule}
                min={0.5}
                max={20}
                step={0.5}
                onChange={setNewModule}
              />
              <p className="micro">
                {d.moduleSize} m → {newModule} m · rescale factor{" "}
                {(newModule / d.moduleSize).toFixed(2)}×
              </p>
              {newModule !== d.moduleSize && (
                <label className="settings-check">
                  <input
                    type="checkbox"
                    checked={rescaleSettings}
                    onChange={(e) => setRescaleSettings(e.target.checked)}
                  />{" "}
                  Rescale existing components to match the new cube size
                </label>
              )}
              {!rescaleSettings && (
                <p className="micro">Existing component sizes stay the same.</p>
              )}
            </fieldset>
            {libraryError && <p role="alert">{libraryError}</p>}
            <div className="pair">
              <button disabled={saving} onClick={() => setModuleDialog(false)}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={async () => {
                  const next = {
                    ...resizeModule(d, newModule, rescaleSettings),
                    subdivision: newSubdivision,
                  };
                  if (await persist(next.name, saveProject || null, next)) {
                    setModuleDialog(false);
                    setTimeout(() => stage.current?.setView(view, true), 10);
                  }
                }}
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </section>
        </div>
      )}
      {showHelp && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Designer help"
          >
            <span className="overline">QUICK START</span>
            <h2>Designing a scene.</h2>
            <ol>
              <li>Choose Draw and drag a footprint on the grid.</li>
              <li>
                Add adjoining rectangles for extensions, or choose Circle and
                drag from its centre for a chimney. Drawing over a roof sets its
                base elevation.
              </li>
              <li>
                Switch to 3D, select a part and pull the teal height handle.
              </li>
              <li>
                Choose a roof and pull its blue ridge handle. Use the face, edge
                or corner handles to reshape the footprint.
              </li>
              <li>
                Create groups in Scene components. Drag a part or structure into
                a group, or back to Ungrouped. Select a group or structure to
                move it together. Use the pencil to rename items.
              </li>
              <li>Set the scene front direction, materials and notes.</li>
              <li>Save your editable plan, then export a reference pack.</li>
            </ol>
            <p>
              Use Rotate and drag the ring (15° steps, Shift for 1°). Hover wall
              vertices or ridge ends for XYZ arrows. Upper Y handles adjust wall
              corners; lower Y handles adjust bottom corners. Use Move and drag
              the central handle to move a whole part on the ground. Select
              offers separate Vertices, Edges and Faces modes. In Select mode,
              drag empty space to orbit. Escape cancels an edit. ⌘Z undoes; ⇧⌘Z
              redoes.
            </p>
            <p className="micro">
              Parts are continuous blockout volumes, not individual cubes.
              Overlapping roofs are not joined automatically. The export
              contains structural references, not a finished game asset.
            </p>
            <button className="primary wide" onClick={() => setShowHelp(false)}>
              Start planning
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
