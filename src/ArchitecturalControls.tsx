import React from "react";
import {
  type ArchitecturalDetails,
  defaultDetails,
} from "./architectural-details";
export function ArchitecturalControls({
  value,
  onChange,
  opening = false,
}: {
  value?: ArchitecturalDetails;
  onChange: (v: ArchitecturalDetails) => void;
  opening?: boolean;
}) {
  const v = value ?? { ...defaultDetails(), enabled: false };
  const update = (patch: Partial<ArchitecturalDetails>) =>
    onChange({ ...v, ...patch });
  const number = (
    key: keyof ArchitecturalDetails,
    label: string,
    min = 0,
    max = 5,
    step = 0.01,
  ) => (
    <label className="field" key={key}>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={
          (key === "archWidth"
            ? (v.archWidth ?? v.jambWidth)
            : key === "keystoneExtra"
              ? (v.keystoneExtra ?? 0.08)
              : key === "cillWidthAdjustment"
                ? (v.cillWidthAdjustment ?? 2 * v.overhang)
                : key === "cillProjection"
                  ? (v.cillProjection ?? v.projection)
                  : v[key]) as number
        }
        onChange={(e) => {
          if (e.target.value !== "") update({ [key]: Number(e.target.value) });
        }}
      />
    </label>
  );
  return (
    <div>
      <label className="settings-check">
        <input
          type="checkbox"
          checked={v.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        Enable architectural details
      </label>
      {v.enabled && (
        <>
          <div className="pair">
            {(
              [
                "jambs",
                "lintels",
                "arches",
                "keystones",
                "cills",
                ...(opening ? [] : ["quoins"]),
              ] as const
            ).map((key) => (
              <label className="settings-check" key={key}>
                <input
                  type="checkbox"
                  checked={
                    key === "arches"
                      ? (v.arches ?? true)
                      : key === "keystones"
                        ? (v.keystones ?? false)
                        : v[key as "jambs"]
                  }
                  onChange={(e) => update({ [key]: e.target.checked })}
                />
                {key === "cills"
                  ? "Cills / thresholds"
                  : key[0].toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
          <details className="part-section" open>
            <summary>Finish & variation</summary>
            <div className="pair">
              {number("projection", "Projection")}
              {number("gap", "Mortar gap")}
              {number("chamfer", "Chamfer")}
              {number("variation", "Size variation (0–0.5)", 0, 0.5, 0.05)}
              {number("seed", "Random seed", 0, 2147483647, 1)}
            </div>
            <p className="muted">
              Seeded width variation affects jambs and quoins. Chamfers are
              limited to fit each stone.
            </p>
          </details>
          <details className="part-section">
            <summary>Sizes</summary>
            <div className="pair">
              {number("courseHeight", "Stone course height", 0.05)}
              {v.jambs && number("jambWidth", "Jamb width", 0.01)}
              {v.lintels && number("lintelHeight", "Lintel height", 0.01)}
              {(v.arches ?? true) &&
                number("archWidth", "Arch surround width", 0.01)}
              {(v.arches ?? true) &&
                v.keystones &&
                number("keystoneExtra", "Keystone extra size")}
              {v.cills && number("cillHeight", "Cill / threshold height", 0.01)}
              {v.lintels && number("overhang", "Lintel side overhang")}
              {v.cills &&
                number(
                  "cillWidthAdjustment",
                  "Cill width adjustment (total)",
                  -10,
                  10,
                )}
              {v.cills && number("cillProjection", "Cill projection", 0, 5)}
              {!opening &&
                v.quoins &&
                number("quoinWidth", "Quoin width", 0.01)}
            </div>
            {v.cills && (
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={v.raiseDoors}
                  onChange={(e) => update({ raiseDoors: e.target.checked })}
                />
                Raise doors above thresholds
              </label>
            )}
          </details>
          <details className="part-section">
            <summary>Materials</summary>
            {(["material", "cillMaterial", "quoinMaterial"] as const)
              .filter((k) => !opening || k !== "quoinMaterial")
              .map((key) => (
                <label className="field" key={key}>
                  {key === "material"
                    ? "Opening surrounds"
                    : key === "cillMaterial"
                      ? "Cills / thresholds"
                      : "Quoins"}
                  <textarea
                    value={v[key]}
                    onChange={(e) => update({ [key]: e.target.value })}
                  />
                </label>
              ))}
          </details>
          <p className="muted">
            Arches follow arched and circular openings. Keystones replace the
            crown stone. Check close-set surrounds for overlap.
          </p>
        </>
      )}
    </div>
  );
}
