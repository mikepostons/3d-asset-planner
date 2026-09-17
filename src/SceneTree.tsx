import React, { useState, useRef } from "react";
import {
  type Plan,
  type Part,
  sceneStructures,
  assignGroup,
  uid,
  clone,
} from "./model";
export function SceneTree({
  plan,
  selected,
  select,
  commit,
  selectedOpening,
  selectedOpenings,
  selectOpening,
}: {
  selectedOpening: string | null;
  selectedOpenings: string[];
  selectOpening: (
    partId: string,
    id: string,
    face: number,
    shift?: boolean,
  ) => void;
  plan: Plan;
  selected: string | null;
  select: (id: string) => void;
  commit: (d: Plan) => void;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setClosed((old) => {
      const n = new Set(old);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const pointerDrag = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const structures = sceneStructures(plan);
  function drop(e: React.DragEvent, groupId?: string) {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("application/asset-component");
    if (id) commit(assignGroup(plan, id, groupId));
  }
  function renamePart(p: Part, name: string) {
    const n = clone(plan);
    n.parts.find((q) => q.id === p.id)!.name = name;
    commit(n);
  }
  function row(
    id: string,
    name: string,
    rename: (name: string) => void,
    count?: number,
    children?: React.ReactNode,
  ) {
    return (
      <div key={id} className="scene-node">
        <div
          className={"scene-row " + (selected === id ? "active" : "")}
          onPointerDown={(e) => {
            if (
              e.button !== 0 ||
              (e.target as HTMLElement).closest(".tree-toggle,.tree-rename")
            )
              return;
            pointerDrag.current = { id, x: e.clientX, y: e.clientY };
            suppressClick.current = false;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const start = pointerDrag.current;
            if (
              start &&
              Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5
            ) {
              suppressClick.current = true;
              e.currentTarget.style.cursor = "grabbing";
            }
          }}
          onPointerUp={(e) => {
            const start = pointerDrag.current;
            pointerDrag.current = null;
            e.currentTarget.style.cursor = "";
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
            if (!start) return;
            if (!suppressClick.current) {
              select(start.id);
              return;
            }
            const target = document
              .elementFromPoint(e.clientX, e.clientY)
              ?.closest<HTMLElement>("[data-drop-group]");
            if (target)
              commit(
                assignGroup(
                  plan,
                  start.id,
                  target.dataset.dropGroup || undefined,
                ),
              );
          }}
          onPointerCancel={() => {
            pointerDrag.current = null;
          }}
          onClickCapture={(e) => {
            if (suppressClick.current) {
              e.stopPropagation();
              suppressClick.current = false;
            }
          }}
        >
          {children ? (
            <button
              className="tree-toggle"
              aria-label={`${closed.has(id) ? "Expand" : "Collapse"} ${name}`}
              onClick={() => toggle(id)}
            >
              {closed.has(id) ? "▸" : "▾"}
            </button>
          ) : (
            <span className="tree-leaf">◇</span>
          )}
          <button
            className="tree-select"
            onClick={() => select(id)}
            title="Select component"
          >
            <span className="tree-label">{name}</span>
            {count !== undefined && (
              <span className="component-count" aria-label={`${count} parts`}>
                {count}
              </span>
            )}
          </button>
          <button
            className="tree-rename"
            aria-label={`Rename ${name}`}
            onClick={() => {
              select(id);
              setEditing(id);
            }}
          >
            ✎
          </button>
        </div>
        {editing === id && (
          <input
            className="tree-name"
            aria-label={`Name for ${name}`}
            autoFocus
            defaultValue={name}
            onBlur={(e) => {
              rename(e.target.value.trim() || name);
              setEditing(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(null);
            }}
          />
        )}
        {children && !closed.has(id) && (
          <div className="tree-children">{children}</div>
        )}
      </div>
    );
  }
  const [editing, setEditing] = useState<string | null>(null);
  function partRow(p: Part) {
    return row(
      p.id,
      p.name,
      (n) => renamePart(p, n),
      undefined,
      p.openings?.length ? (
        <details className="opening-tree" open>
          <summary>
            Openings{" "}
            <span className="component-count">{p.openings.length}</span>
          </summary>
          {p.openings.map((o) => (
            <div key={o.id}>
              <button
                className={
                  selectedOpenings.includes(o.id) && selected === p.id
                    ? "chosen wide"
                    : "wide"
                }
                onClick={(e) => selectOpening(p.id, o.id, o.face, e.shiftKey)}
              >
                {o.name}
              </button>
              {o.infill && (
                <button
                  className="wide"
                  style={{ paddingLeft: 24 }}
                  onClick={(e) => selectOpening(p.id, o.id, o.face, e.shiftKey)}
                >
                  ↳{" "}
                  {o.infill.type === "door"
                    ? o.infill.doubleDoor
                      ? "Double door"
                      : "Door panel"
                    : "Window · frame & pane"}
                </button>
              )}
            </div>
          ))}
        </details>
      ) : undefined,
    );
  }
  function contents(groupId?: string) {
    return structures
      .filter((s) => s.parts[0].groupId === groupId)
      .map((s) =>
        s.parts.length === 1
          ? partRow(s.parts[0])
          : row(
              "structure:" + s.id,
              s.name,
              (n) =>
                commit({
                  ...clone(plan),
                  structureNames: { ...plan.structureNames, [s.id]: n },
                }),
              s.parts.length,
              s.parts.map(partRow),
            ),
      );
  }
  return (
    <div className="scene-tree">
      <div className="section-head">
        <span>SCENE COMPONENTS</span>
        <span className="badge">{plan.parts.length}</span>
      </div>
      <p className="aside-note">
        Connected parts form structures. Drag components into groups.
      </p>
      <button
        className="add-part"
        onClick={() => {
          const id = uid();
          commit({
            ...clone(plan),
            groups: [
              ...(plan.groups ?? []),
              { id, name: `Group ${(plan.groups?.length ?? 0) + 1}` },
            ],
          });
          select("group:" + id);
        }}
      >
        ＋ New group
      </button>
      {(plan.groups ?? []).map((g) => (
        <div
          className="tree-drop"
          key={g.id}
          data-drop-group={g.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => drop(e, g.id)}
        >
          {row(
            "group:" + g.id,
            g.name,
            (name) =>
              commit({
                ...clone(plan),
                groups: plan.groups?.map((q) =>
                  q.id === g.id ? { ...q, name } : q,
                ),
              }),
            plan.parts.filter((p) => p.groupId === g.id).length,
            <>
              {contents(g.id)}
              {!plan.parts.some((p) => p.groupId === g.id) && (
                <p className="micro">Drop components here</p>
              )}
            </>,
          )}
        </div>
      ))}
      <div
        className="tree-drop"
        data-drop-group=""
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => drop(e)}
      >
        <h4>Ungrouped</h4>
        {contents()}
        <p className="micro">Drop here to remove from a group</p>
      </div>
    </div>
  );
}
