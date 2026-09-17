export const referenceViews = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "iso-front-right",
  "iso-back-right",
  "iso-back-left",
  "iso-front-left",
] as const;
export function flatView(view: string) {
  return ["front", "back", "left", "right", "top"].includes(view);
}
export function viewPose(view: string, front: number) {
  const offsets: Record<string, number> = {
    front: 0,
    back: 180,
    left: -90,
    right: 90,
    main: 45,
    reverse: 225,
    "iso-front-right": 45,
    "iso-back-right": 135,
    "iso-back-left": 225,
    "iso-front-left": 315,
  };
  const a = ((front + (offsets[view] ?? 45)) * Math.PI) / 180;
  return {
    direction:
      view === "top"
        ? [0, 100, 0]
        : [
            Math.sin(a) * 100,
            flatView(view) ? 0 : 100 / Math.sqrt(2),
            Math.cos(a) * 100,
          ],
    up:
      view === "top"
        ? [
            Math.sin((front * Math.PI) / 180),
            0,
            -Math.cos((front * Math.PI) / 180),
          ]
        : [0, 1, 0],
  };
}
