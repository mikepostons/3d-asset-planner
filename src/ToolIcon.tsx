import React from "react";
const paths: Record<string, string> = {
  delete: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  new: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 7v10 M7 12h10",
  library: "M4 4h4v16H4z M10 4h4v16h-4z M16 5l4-1 3 15-4 1z",
  save: "M4 3h13l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8",
  package: "M3 7l9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5 M12 12v10 M7 4l10 6",
  export: "M12 15V3 M7 8l5-5 5 5 M4 14v7h16v-7",
  cleaner: "M19 3l-8 10 M8 10l7 5-4 7H3l1-7z M7 16l-2 6 M10 18l-1 4",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  openings: "M5 21V9a7 7 0 0 1 14 0v12Z M9 21v-9h6v9",
  add: "M12 4v16 M4 12h16",
  settings:
    "M9 2h6l.5 3 2 1 2.5-1 3 5-2 2v2l2 2-3 5-2.5-1-2 1-.5 3H9l-.5-3-2-1L4 21l-3-5 2-2v-2l-2-2 3-5 2.5 1 2-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  select: "M5 3l14 10-7 1-3 7-4-18z",
  draw: "M4 20l4-1 12-12-3-3L5 16l-1 4z M14 7l3 3",
  move: "M12 3v18 M3 12h18 M8 7l4-4 4 4 M8 17l4 4 4-4 M7 8l-4 4 4 4 M17 8l4 4-4 4",
  rotate: "M20 8a8 8 0 1 0 0 8 M20 3v5h-5",
  scale: "M4 14v6h6 M14 4h6v6 M4 20l6-6 M20 4l-6 6",
  undo: "M9 5L3 10l6 5 M3 10h11a6 6 0 0 1 0 12",
  redo: "M15 5l6 5-6 5 M21 10H10a6 6 0 0 0 0 12",
};
export function ToolIcon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] ?? paths.select} />
    </svg>
  );
}
