import React from "react";
const paths: Record<string, string> = {
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
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
