import { geometryKey } from "./geometry-key";
import React from "react";
import {
  clusterLayout,
  defaultClusters,
  defaultBands,
  clusterPlacements,
  type StoneClusters,
  type StoneBands,
} from "./stone-dressing";
import type { Part } from "./model";
export function StoneDressingControls({
  part: p,
  onChange,
  selectedFace,
  sceneParts,
  selectedCluster,
  onSelectCluster,
}: {
  selectedCluster: string | null;
  onSelectCluster: (id: string | null) => void;
  part: Part;
  sceneParts: Part[];
  selectedFace?: number;
  onChange: (patch: Partial<Part>) => void;
}) {
  const [positionError, setPositionError] = React.useState("");
  const placementKey = geometryKey({p,sceneParts});
  const placements = React.useMemo(() => clusterPlacements(p, sceneParts), [placementKey]);
  const s = p.stoneClusters ?? { ...defaultClusters(), enabled: false },
    b = p.stoneBands ?? defaultBands();
  const cs = (patch: Partial<StoneClusters>) =>
    onChange({ stoneClusters: { ...s, ...patch } });
  const cb = (patch: Partial<StoneBands>) =>
    onChange({ stoneBands: { ...b, ...patch } });
  const num = (
    label: string,
    value: number,
    change: (n: number) => void,
    min = 0,
    max = 5,
    step = 0.01,
  ) => (
    <label className="field">
      {label}
      <input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (e.target.value !== "") change(Number(e.target.value));
        }}
      />
    </label>
  );
  return (
    <>
      <details className="part-section">
        <summary>Stone clusters</summary>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => cs({ enabled: e.target.checked })}
          />
          Enable stone clusters
        </label>
        {p.shape === "circle" && <p className="hint">Clusters wrap around the outer wall and follow its taper. The top, bottom and inner bore stay clear.</p>}
        {s.enabled && (
          <>
            <div className="pair">
              {num(
                "Placement seed",
                s.seed,
                (seed) => cs({ seed }),
                0,
                2147483647,
                1,
              )}
              {num("Default stone size", s.size, (size) => cs({ size }), 0.03)}
              {num(
                "Size variation",
                s.variation,
                (variation) => cs({ variation }),
                0,
                0.7,
                0.05,
              )}
              {num("Edge / opening clearance", s.clearance, (clearance) =>
                cs({ clearance }),
              )}
            </div>
            {num(
              "Space between clusters",
              s.clusterSpacing ?? 0.6,
              (clusterSpacing) => cs({ clusterSpacing }),
              0,
              10,
            )}
            <details className="part-section">
              <summary>Finish & material</summary>
              <div className="pair">
                {num(
                  "Stone projection",
                  s.projection,
                  (projection) => cs({ projection }),
                  0.005,
                  2,
                )}
                {num("Stone gap", s.gap, (gap) => cs({ gap }), 0, 2)}
                {num(
                  "Stone chamfer",
                  s.chamfer,
                  (chamfer) => cs({ chamfer }),
                  0,
                  1,
                )}
              </div>
              <label className="field">
                Stone material
                <textarea
                  value={s.material}
                  onChange={(e) => cs({ material: e.target.value })}
                />
              </label>
            </details>
            <button
              className="wide"
              disabled={s.clusters.length >= 30}
              onClick={() =>
                cs({
                  clusters: [
                    ...s.clusters,
                    {
                      id: crypto.randomUUID(),
                      seed: 1,
                      layout: "auto",
                      count: 7,
                      spread: 1,
                      face: selectedFace,
                    },
                  ],
                })
              }
            >
              {p.shape === "circle" ? "Add outer-wall cluster" : "Add cluster"}
              {selectedFace !== undefined
                ? " to face " + (selectedFace + 1)
                : ""}{" "}
              ({s.clusters.length}/30)
            </button>
            {s.clusters.length > 0 && (
              <button className="wide" onClick={() => cs({ clusters: s.clusters.map(c => ({ ...c, layout: "auto" })) })}>
                Mix all cluster sizes
              </button>
            )}
            {s.clusters.length > 0 && <button className="danger wide" onClick={() => { cs({clusters: []}); onSelectCluster(null); }}>Delete all clusters</button>}
            {s.clusters.map((c, index) => {
              const change = (patch: Partial<typeof c>) =>
                cs({
                  clusters: s.clusters.map((q) =>
                    q.id === c.id ? { ...q, ...patch } : q,
                  ),
                });
              return (
                <details className="part-section" key={c.id}>
                  <summary>
                    Cluster {index + 1} ·{" "}
                    {clusterLayout(s, c)}
                  </summary>
                  <button className={selectedCluster === c.id ? "chosen" : ""} onClick={() => { onSelectCluster(selectedCluster === c.id ? null : c.id); setPositionError(""); }}>
                    {selectedCluster === c.id ? "Deselect cluster" : "Select / reposition cluster"}
                  </button>
                  {selectedCluster === c.id && (() => {
                    const anchor = c.position ?? placements.anchors[c.id];
                    if (!anchor) return <p className="muted">No valid placement. Reduce size or clearance first.</p>;
                    const radius = (p.width + (p.topDiameter ?? p.width)) / 4;
                    const move = (patch: Partial<typeof anchor>) => {
                      const position = {...anchor, ...patch};
                      const clusters = s.clusters.map(q => q.id === c.id ? {...q, position} : q);
                      const proposed = clusterPlacements({...p, stoneClusters: {...s, clusters}}, sceneParts);
                      if (!proposed.anchors[c.id] || s.clusters.some(q => placements.anchors[q.id] && !proposed.anchors[q.id])) {
                        setPositionError("That position is blocked or too close to an edge or another cluster."); return;
                      }
                      setPositionError(""); cs({clusters});
                    };
                    return <>
                      {num(p.shape === "circle" ? "Around wall (degrees)" : "Horizontal position (m)", p.shape === "circle" ? anchor.u / radius * 180 / Math.PI : anchor.u, n => move({u: p.shape === "circle" ? n * Math.PI / 180 * radius : n}), 0, p.shape === "circle" ? 360 : 1000, p.shape === "circle" ? 5 : 0.1)}
                      {num("Height of cluster centre (m)", anchor.y, y => move({y}), 0, 1000, 0.1)}
                      {positionError && <p role="alert">{positionError}</p>}
                      <button onClick={() => { change({position: undefined}); setPositionError(""); }}>Return to automatic placement</button>
                    </>;
                  })()}
                  {p.shape !== "circle" && (
                    <label className="field">
                      Placement face
                      <select
                        value={c.face ?? "auto"}
                        onChange={(e) =>
                          change({
                            position: undefined,
                            face:
                              e.target.value === "auto"
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                      >
                        <option value="auto">Automatic</option>
                        {[0, 1, 2, 3].map((face) => (
                          <option key={face} value={face}>
                            Face {face + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="pair">
                    {num(
                      "Cluster seed",
                      c.seed,
                      (seed) => change({ seed }),
                      0,
                      2147483647,
                      1,
                    )}
                    <label className="field">
                      Row pattern
                      <select
                        value={c.layout ?? "auto"}
                        onChange={(e) => {
                          const layout = e.target.value as NonNullable<
                            typeof c.layout
                          >;
                          change({
                            layout,
                            count: layout === "auto" ? c.count : layout
                              .split("-")
                              .map(Number)
                              .reduce((a, b) => a + b, 0),
                          });
                        }}
                      >
                        <option value="auto">Mixed (mostly small)</option>
                        {["1-2", "2-3", "2-3-2", "3-2-3"].map((layout) => (
                          <option key={layout} value={layout}>
                            {layout.replaceAll("-", " · ")} stones
                          </option>
                        ))}
                      </select>
                    </label>
                    {num(
                      "Cluster stone size",
                      c.size ?? s.size,
                      (size) => change({ size }),
                      0.03,
                    )}
                  </div>
                  <button
                    onClick={() => change({ seed: (c.seed + 1) % 2147483647 })}
                  >
                    Regenerate
                  </button>
                  <button onClick={() => change({ size: undefined })}>
                    Use default size
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      cs({ clusters: s.clusters.filter((q) => q.id !== c.id) })
                    }
                  >
                    Delete cluster
                  </button>
                </details>
              );
            })}
            {placements.warnings.map((w) => (
              <p className="muted" key={w}>
                {w} Reduce patch size or spacing, or regenerate.
              </p>
            ))}
            <p className="muted">
              Surface patches avoid openings, surrounds and edges. Cylinder and
              donut clusters use the outer wall only. Complete staggered patches
              are placed; stones are not scattered individually.
            </p>
          </>
        )}
      </details>
      {p.shape === "circle" && (
        <details className="part-section">
          <summary>Stone end bands</summary>
          <div className="pair">
            {(["top", "bottom"] as const).map((k) => (
              <label className="settings-check" key={k}>
                <input
                  type="checkbox"
                  checked={b[k]}
                  onChange={(e) => cb({ [k]: e.target.checked })}
                />
                {k === "top" ? "Top band" : "Bottom band"}
              </label>
            ))}
          </div>
          {(b.top || b.bottom) && (
            <>
              <div className="pair">
                {num("Band height", b.height, (height) => cb({ height }), 0.02)}
                {num("Band overhang", b.overhang, (overhang) =>
                  cb({ overhang }),
                )}
                {num(
                  "Stones per band",
                  b.count,
                  (count) => cb({ count }),
                  4,
                  96,
                  1,
                )}
                {num("Band gap", b.gap, (gap) => cb({ gap }), 0, 1)}
                {num(
                  "Band variation",
                  b.variation,
                  (variation) => cb({ variation }),
                  0,
                  0.5,
                  0.05,
                )}
                {num(
                  "Band seed",
                  b.seed,
                  (seed) => cb({ seed }),
                  0,
                  2147483647,
                  1,
                )}
              </div>
              {p.innerDiameter === undefined ? (
                <label className="settings-check">
                  <input
                    type="checkbox"
                    checked={b.solidCap}
                    onChange={(e) => cb({ solidCap: e.target.checked })}
                  />
                  Fill band centre with a solid cap
                </label>
              ) : (
                <p className="muted">Donut bands preserve the central bore.</p>
              )}
              <label className="field">
                Band material
                <textarea
                  value={b.material}
                  onChange={(e) => cb({ material: e.target.value })}
                />
              </label>
            </>
          )}
        </details>
      )}
    </>
  );
}
