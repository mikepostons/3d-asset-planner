import React, { useEffect, useState } from "react";

/** Keep dragging responsive; rebuild textured previews only when released. */
export function MaterialOpacitySlider({ value, disabled = false, onCommit }: {
  value: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (input: HTMLInputElement) => {
    const next = Number(input.value) / 100;
    if (next !== value) onCommit(next);
  };
  return <label className="field material-opacity">
    <span>Tint opacity <output>{Math.round(draft * 100)}%</output></span>
    <input aria-label="Tint opacity" type="range" min="0" max="100" step="1"
      value={Math.round(draft * 100)} disabled={disabled}
      onChange={e => setDraft(Number(e.target.value) / 100)}
      onPointerUp={e => commit(e.currentTarget)}
      onKeyUp={e => commit(e.currentTarget)}
      onBlur={e => commit(e.currentTarget)} />
  </label>;
}
