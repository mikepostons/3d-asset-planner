import { infillGeometry } from "./infills";
import {
  editOpening,
  wallFrame,
  openingOutline,
  openingName,
  type OpeningKind,
  type Opening,
} from "./openings";
import { subdivisionPreview } from "./subdivisions";
import { terrainPatches } from "./terrain";
import { referenceViews, flatView, viewPose } from "./views";
import { canEditHandle, type SelectionMode } from "./editing";
import { partGeometry } from "./geometry";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  type Plan,
  type Part,
  clone,
  height,
  snap,
  part,
  uid,
  footprint,
  validFootprint,
  snapTo,
  bounds,
  baseY,
  topY,
  ridgeEnds,
  insideFootprint,
  floorLevels,
  validate,
  selectedParts,
  mainAspect,
  aspectOwner,
  translateSelection,
} from "./model";
import { primitive, type Primitive } from "./model";
export type Tool =
  "openings" | "add" | "select" | "draw" | "move" | "rotate" | "scale";
type Callbacks = {
  face: (face: { partId: string; index: number } | null) => void;
  opening: (id: string | null, ids?: string[]) => void;
  tool: (tool: Tool) => void;
  select: (id: string | null) => void;
  commit: (d: Plan) => void;
  hint: (s: string) => void;
};
export class Stage {
  scene = new T.Scene();
  camera = new T.OrthographicCamera(-20, 20, 15, -15, 0.1, 2000);
  renderer: T.WebGLRenderer;
  controls: OrbitControls;
  solids = new T.Group();
  aids = new T.Group();
  grid = new T.Group();
  hover = new T.Group();
  ray = new T.Raycaster();
  plan: Plan;
  selected: string | null = null;
  tool: Tool = "select";
  activeFace: { partId: string; index: number } | null = null;
  selectedOpening: string | null = null;
  selectedOpenings: string[] = [];
  openingKind: OpeningKind = "door";
  openingDrag: {
    start: T.Vector2;
    partId: string;
    face: number;
    capture: number;
    candidate?: Opening;
    original?: Opening;
    originals?: Opening[];
    candidates?: Opening[];
    handle?: string;
  } | null = null;
  selectionMode: SelectionMode = "vertices";
  view = "main";
  drawShape: "rectangle" | "circle" = "rectangle";
  addShape: Primitive = "cube";
  preview = new T.Group();
  showFloors = true;
  showTerrain = true;
  xray = false;
  tooltip = document.createElement("div");
  exporting = false;
  terrain = new T.Group();
  moveAxes = false;
  cb: Callbacks;
  host: HTMLElement;
  observer: ResizeObserver;
  raf = 0;
  span = 26;
  drag: null | {
    kind: string;
    initial: Plan;
    id?: string;
    start: T.Vector3;
    plane: T.Plane;
    capture: number;
    ghost?: T.LineSegments;
    axis?: "x" | "y" | "z";
    level?: number;
    drawY?: number;
    last?: Plan;
  } = null;
  constructor(host: HTMLElement, d: Plan, cb: Callbacks) {
    this.host = host;
    this.tooltip.className = "handle-tooltip";
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.hidden = true;
    document.body.append(this.tooltip);
    this.plan = d;
    this.cb = cb;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor("#20292e");
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.scene.add(this.solids, this.aids, this.grid, this.hover, this.terrain);
    this.scene.add(new T.HemisphereLight(0xffffff, 0x626b66, 2.1));
    const sun = new T.DirectionalLight(0xffffff, 2.3);
    sun.position.set(12, 22, 16);
    this.scene.add(sun);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minZoom = 0.2;
    this.controls.maxZoom = 15;
    this.controls.mouseButtons = {
      LEFT: T.MOUSE.ROTATE,
      MIDDLE: T.MOUSE.DOLLY,
      RIGHT: T.MOUSE.PAN,
    };
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.update(d, null, "select");
    this.setView("main", true);
    const el = this.renderer.domElement;
    el.addEventListener("dblclick", this.doubleClick);
    el.addEventListener("pointerdown", this.down, true);
    el.addEventListener("pointermove", this.move, true);
    el.addEventListener("pointerleave", this.leave);
    el.addEventListener("pointerup", this.up, true);
    el.addEventListener("pointercancel", this.cancel, true);
    window.addEventListener("keydown", this.key);
    this.animate();
  }
  disposeGroup(g: T.Group) {
    g.traverse((o) => {
      if (o instanceof T.Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
      if (o instanceof T.Mesh || o instanceof T.Line) {
        o.geometry.dispose();
        const m = o.material;
        Array.isArray(m) ? m.forEach((x) => x.dispose()) : m.dispose();
      }
    });
    g.clear();
  }
  update(d: Plan, selected: string | null, tool: Tool) {
    if (
      (this.drag || this.openingDrag) &&
      (tool !== this.tool || selected !== this.selected)
    )
      this.cancel();
    if (tool !== this.tool || selected !== this.selected) this.moveAxes = false;
    this.disposeGroup(this.preview);
    this.plan = d;
    this.selected = selected;
    this.tool = tool;
    this.controls.enableRotate = !flatView(this.view) && tool === "select";
    this.host.style.cursor =
      tool === "draw" || tool === "add" || tool === "openings"
        ? "crosshair"
        : tool === "move"
          ? "move"
          : "default";
    if (this.activeFace?.partId !== selected) this.activeFace = null;
    this.rebuild();
  }
  roof(p: Part) {
    return new T.Mesh(
      partGeometry(p, true),
      new T.MeshStandardMaterial({
        color: 0x526d77,
        roughness: 1,
        side: T.DoubleSide,
        flatShading: true,
      }),
    );
  }
  rebuild() {
    this.tooltip.hidden = true;
    this.disposeGroup(this.hover);
    this.disposeGroup(this.solids);
    this.disposeGroup(this.aids);
    this.disposeGroup(this.grid);
    this.disposeGroup(this.terrain);
    for (const patch of terrainPatches(this.plan)) {
      const points = patch.outline;
      const centre = points.reduce(
        (a, p) => [a[0] + p[0] / points.length, a[1] + p[1] / points.length],
        [0, 0],
      );
      const vertices: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        const inner = (p: number[]) => {
          const dx = p[0] - centre[0],
            dz = p[1] - centre[1],
            len = Math.hypot(dx, dz);
          const f = Math.max(
            0.5,
            1 - Math.min(0.45, (this.plan.terrainMargin ?? 1.5) * 0.4) / len,
          );
          return [centre[0] + dx * f, centre[1] + dz * f];
        };
        const aa = inner(a),
          bb = inner(b);
        vertices.push(
          centre[0],
          -0.025,
          centre[1],
          bb[0],
          -0.025,
          bb[1],
          aa[0],
          -0.025,
          aa[1],
        );
        vertices.push(
          aa[0],
          -0.025,
          aa[1],
          bb[0],
          -0.025,
          bb[1],
          b[0],
          -0.35,
          b[1],
          aa[0],
          -0.025,
          aa[1],
          b[0],
          -0.35,
          b[1],
          a[0],
          -0.35,
          a[1],
        );
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      geometry.computeVertexNormals();
      this.terrain.add(
        new T.Mesh(
          geometry,
          new T.MeshStandardMaterial({
            color: 0x68715b,
            roughness: 1,
            side: T.DoubleSide,
          }),
        ),
      );
    }
    this.terrain.visible = this.showTerrain;
    const members = selectedParts(this.plan, this.selected);
    const collection = members.length > 0 && this.selected !== members[0].id;
    for (const p of this.plan.parts) {
      const group = new T.Group();
      group.position.set(p.x, baseY(p), p.z);
      group.rotation.y = (p.rotation * Math.PI) / 180;
      const wall = new T.Mesh(
        partGeometry(p, false),
        new T.MeshStandardMaterial({
          color: p.role === "main" ? 0x9caeaf : 0x6d9993,
          side: T.DoubleSide,
          roughness: 1,
        }),
      );
      wall.userData.wall = true;
      wall.userData.part = p.id;
      group.add(wall);
      for (const o of p.openings ?? [])
        for (const item of infillGeometry(p, o)) {
          const mesh = new T.Mesh(
            item.geometry,
            new T.MeshStandardMaterial({
              color: item.color,
              roughness: 0.85,
              side: T.DoubleSide,
            }),
          );
          mesh.name = item.role;
          mesh.userData = { part: p.id, openingId: o.id, infill: true };
          group.add(mesh);
        }
      const roof = p.roofEnabled === false ? null : this.roof(p);
      if (roof) {
        roof.userData.part = p.id;
        group.add(roof);
      }
      this.solids.add(group);
      if (this.activeFace?.partId === p.id && p.shape !== "circle") {
        const f = wallFrame(p, this.activeFace.index);
        const attr = wall.geometry.getAttribute("position"),
          positions: number[] = [];
        for (let i = 0; i < attr.count; i += 3) {
          const pts = [0, 1, 2].map((k) =>
            new T.Vector3().fromBufferAttribute(attr, i + k),
          );
          if (
            pts.every(
              (v) => Math.abs(v.clone().sub(f.a).dot(f.inward)) < 0.0001,
            )
          )
            positions.push(...pts.flatMap((v) => v.toArray()));
        }
        const geom = new T.BufferGeometry();
        geom.setAttribute(
          "position",
          new T.Float32BufferAttribute(positions, 3),
        );
        const overlay = new T.Mesh(
          geom,
          new T.MeshBasicMaterial({
            color: 0xe0fff7,
            transparent: true,
            opacity: 0.18,
            side: T.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          }),
        );
        overlay.position.copy(group.position);
        overlay.rotation.copy(group.rotation);
        overlay.renderOrder = 3;
        this.aids.add(overlay);
      }
      for (const o of p.openings ?? []) {
        const f = wallFrame(p, o.face),
          outline = openingOutline(o),
          points = outline.map((v) => f.point(v.x, v.y));
        points.push(points[0].clone());
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints(points),
          new T.LineBasicMaterial({
            color:
              this.selectedOpenings.includes(o.id) && p.id === this.selected
                ? 0xffce7b
                : 0x6de8d5,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
          }),
        );
        line.position.copy(group.position);
        line.rotation.copy(group.rotation);
        line.renderOrder = 8;
        this.aids.add(line);
        if (this.selectedOpenings.includes(o.id) && p.id === this.selected) {
          const back = points.map((v) =>
            v
              .clone()
              .addScaledVector(
                f.inward,
                p.hollowWalls
                  ? (p.wallThickness ?? 0.4)
                  : Math.min(p.wallThickness ?? 0.4, 0.2),
              ),
          );
          const segments: T.Vector3[] = [];
          for (let k = 0; k < points.length - 1; k++)
            segments.push(points[k], back[k], back[k], back[k + 1]);
          const depth = new T.LineSegments(
            new T.BufferGeometry().setFromPoints(segments),
            new T.LineBasicMaterial({
              color: 0xffce7b,
              transparent: true,
              opacity: 0.55,
              depthTest: false,
            }),
          );
          depth.position.copy(group.position);
          depth.rotation.copy(group.rotation);
          depth.renderOrder = 8;
          this.aids.add(depth);
          if (this.tool === "select") {
            for (const [key, u, v] of [
              ["move", 0.5, 0.5],
              ["w", 0, 0.5],
              ["e", 1, 0.5],
              ["s", 0.5, 0],
              ["n", 0.5, 1],
              ["sw", 0, 0],
              ["se", 1, 0],
              ["nw", 0, 1],
              ["ne", 1, 1],
            ] as [string, number, number][]) {
              if (this.selectedOpenings.length > 1 && key !== "move") continue;
              const handle = new T.Mesh(
                new T.SphereGeometry(key === "move" ? 0.14 : 0.1, 12, 8),
                new T.MeshBasicMaterial({
                  color: key === "move" ? 0x61ead2 : 0xffce7b,
                  depthTest: false,
                }),
              );
              handle.position.copy(
                f
                  .point(o.x + o.width * u, o.y + o.height * v)
                  .applyAxisAngle(
                    new T.Vector3(0, 1, 0),
                    (p.rotation * Math.PI) / 180,
                  )
                  .add(group.position),
              );
              handle.userData = {
                openingHandle: key,
                openingId: o.id,
                partId: p.id,
              };
              handle.renderOrder = 12;
              this.aids.add(handle);
            }
          }
        }
      }
      if (p.subdivisions?.enabled) {
        const { geometry } = subdivisionPreview(p);
        const overlay = new T.LineSegments(
          geometry,
          new T.LineBasicMaterial({
            color: 0xf4c977,
            transparent: true,
            opacity: 0.8,
            depthTest: !this.xray,
          }),
        );
        overlay.position.copy(group.position);
        overlay.rotation.copy(group.rotation);
        overlay.renderOrder = 5;
        this.aids.add(overlay);
      }
      for (const mesh of roof ? [wall, roof] : [wall]) {
        mesh.material.transparent = this.xray;
        mesh.material.opacity = this.xray ? 0.22 : 1;
        mesh.material.depthWrite = !this.xray;
      }
      for (const mesh of roof ? [wall, roof] : [wall]) {
        const line = new T.LineSegments(
          new T.EdgesGeometry(mesh.geometry, 25),
          new T.LineBasicMaterial({
            color: this.xray ? 0xa1d7d1 : 0x394c47,
            transparent: true,
            opacity: this.xray ? 0.75 : 0.35,
            depthTest: !this.xray,
          }),
        );
        line.position.copy(mesh.position);
        group.add(line);
      }
      if (
        members.some((m) => m.id === p.id) &&
        (p.id !== members[0]?.id || (collection && this.tool !== "move"))
      )
        this.aids.add(new T.BoxHelper(group, 0x48d4c0));
      if (p.id === members[0]?.id && (!collection || this.tool === "move")) {
        const outline = new T.BoxHelper(group, 0x48d4c0);
        this.aids.add(outline);
        const rot = (x: number, z: number) =>
          new T.Vector3(x, 0, z).applyAxisAngle(
            new T.Vector3(0, 1, 0),
            (p.rotation * Math.PI) / 180,
          );
        if (this.tool === "rotate" && !collection) {
          const ring = new T.Mesh(
            new T.TorusGeometry(
              Math.max(p.width, p.depth) * 0.65 + 0.7,
              0.07,
              8,
              80,
            ),
            new T.MeshBasicMaterial({ color: 0x53d7c2, depthTest: false }),
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(p.x, baseY(p) + 0.1, p.z);
          ring.userData = { handle: "rotate", part: p.id };
          ring.renderOrder = 12;
          this.aids.add(ring);
        } else if (this.tool === "move") {
          this.handle("move", p, 0, height(p) / 2, 0, 0x53d7c2);
          if (this.moveAxes)
            this.axes(
              new T.Vector3(p.x, baseY(p) + height(p) / 2, p.z),
              "move",
              p,
            );
        } else this.handle("height", p, 0, height(p) + 0.3, 0, 0x48d4c0);
        if (
          p.roofEnabled !== false &&
          p.roof === "gable" &&
          this.tool !== "rotate"
        )
          for (const [i, q] of ridgeEnds(p).entries()) {
            const v = rot(q[0] * p.width, q[2] * p.depth);
            this.handle(`ridge:${i}`, p, v.x, height(p) + q[1], v.z, 0xb3d9ff);
          }
        if (p.shape === "circle" && this.tool !== "rotate") {
          this.handle("radius-bottom", p, p.width / 2, 0.05, 0, 0x53d7c2);
          if (p.innerDiameter !== undefined) {
            this.handle(
              "radius-inner-bottom",
              p,
              -p.innerDiameter / 2,
              0.05,
              0,
              0xffcb80,
            );
            this.handle(
              "radius-inner-top",
              p,
              -(p.topInnerDiameter ?? p.innerDiameter) / 2,
              height(p) + 0.12,
              0,
              0xffb460,
            );
          }
          this.handle(
            "radius-top",
            p,
            (p.topDiameter ?? p.width) / 2,
            height(p) + 0.12,
            0,
            0x75b7ef,
          );
        }

        if (
          p.roofEnabled !== false &&
          p.roof === "gable" &&
          canEditHandle(this.tool, this.selectionMode, "roof")
        ) {
          const ends = ridgeEnds(p).map(([x, y, z]) => {
            const v = rot(x * p.width, z * p.depth);
            return v.setY(height(p) + y).add(new T.Vector3(p.x, baseY(p), p.z));
          });
          const delta = ends[1].clone().sub(ends[0]);
          const line = new T.Mesh(
            new T.CylinderGeometry(0.16, 0.16, delta.length(), 8),
            new T.MeshBasicMaterial({
              color: 0x75b7ef,
              transparent: true,
              opacity: 0.35,
              depthTest: false,
            }),
          );
          line.position.copy(ends[0]).add(ends[1]).multiplyScalar(0.5);
          line.quaternion.setFromUnitVectors(
            new T.Vector3(0, 1, 0),
            delta.normalize(),
          );
          line.userData = { handle: "roof", part: p.id };
          line.renderOrder = 12;
          this.aids.add(line);
        }
        if (
          p.roofEnabled !== false &&
          p.roof === "lean-to" &&
          this.tool !== "rotate"
        ) {
          let x = 0,
            z = 0;
          if (p.roof === "lean-to") {
            x =
              p.highEdge === "left"
                ? -p.width / 2
                : p.highEdge === "right"
                  ? p.width / 2
                  : 0;
            z =
              p.highEdge === "front"
                ? p.depth / 2
                : p.highEdge === "back"
                  ? -p.depth / 2
                  : 0;
          }
          const rr = rot(x, z);
          this.handle(
            "roof",
            p,
            rr.x,
            height(p) + p.rise + 0.5,
            rr.z,
            0x75b7ef,
          );
        }
      }
      if (this.showFloors && p.shape !== "circle")
        for (const y of floorLevels(p, p.floorHeight)) {
          const pts = worldCorners(p).map((v) => {
            v.x = p.x + (v.x - p.x) * 1.002;
            v.z = p.z + (v.z - p.z) * 1.002;
            return v.setY(y);
          });
          pts.push(pts[0].clone());
          const line = new T.Line(
            new T.BufferGeometry().setFromPoints(pts),
            new T.LineDashedMaterial({
              color: 0xd0dedc,
              dashSize: 0.2,
              gapSize: 0.12,
              transparent: true,
              opacity: 0.7,
              depthTest: true,
            }),
          );
          line.computeLineDistances();
          line.renderOrder = 8;
          this.aids.add(line);
          if (p.id === this.selected)
            this.label(
              `~${Math.round((y - baseY(p)) / p.floorHeight)} floor(s) · ${y.toFixed(2)} m`,
              pts
                .slice(0, -1)
                .sort(
                  (a, b) =>
                    a.distanceToSquared(this.camera.position) -
                    b.distanceToSquared(this.camera.position),
                )[0]
                .clone(),
              this.aids,
            );
        }
    }
    const size = Math.max(
      60,
      ...this.plan.parts.map(
        (p) => Math.max(Math.abs(p.x) + p.width, Math.abs(p.z) + p.depth) * 2,
      ),
    );
    const major = this.plan.moduleSize;
    const count = Math.min(180, Math.ceil(size / major));
    const coarse = new T.GridHelper(count * major, count, 0x4e656b, 0x3a4b52);
    this.grid.add(coarse);
    if (count * this.plan.subdivision <= 360) {
      const fine = new T.GridHelper(
        count * major,
        count * this.plan.subdivision,
        0x2a363d,
        0x2a363d,
      );
      fine.position.y = -0.008;
      this.grid.add(fine);
    }
    const owner = aspectOwner(this.plan, this.selected);
    const aspectParts = owner
      ? selectedParts(this.plan, owner)
      : this.plan.parts;
    const box = new T.Box3();
    for (const p of aspectParts) {
      const b = bounds(p);
      box.expandByPoint(new T.Vector3(b.minX, 0, b.minZ));
      box.expandByPoint(new T.Vector3(b.maxX, 0, b.maxZ));
    }
    const centre = box.isEmpty()
      ? new T.Vector3()
      : box.getCenter(new T.Vector3());
    centre.y = 0.12;
    const aspectSize = box.isEmpty()
      ? new T.Vector3(6, 0, 6)
      : box.getSize(new T.Vector3());
    const radius = Math.max(4, Math.hypot(aspectSize.x, aspectSize.z) / 2 + 2);
    const angle = (mainAspect(this.plan, this.selected) * Math.PI) / 180;
    this.grid.add(
      new T.ArrowHelper(
        new T.Vector3(Math.sin(angle), 0, Math.cos(angle)),
        centre,
        radius,
        0x48d4c0,
        1,
        0.5,
      ),
    );
  }
  handle(
    kind: string,
    p: Part,
    x: number,
    y: number,
    z: number,
    color: number,
  ) {
    if (!canEditHandle(this.tool, this.selectionMode, kind)) return;
    const m = new T.Mesh(
      new T.SphereGeometry(kind === "move" ? 0.38 : 0.24, 16, 12),
      new T.MeshBasicMaterial({
        color,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    m.position.set(p.x + x, baseY(p) + y, p.z + z);
    m.userData = { handle: kind, part: p.id };
    m.renderOrder = 10;
    this.aids.add(m);
  }

  getRay(e: MouseEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
  }
  planePoint(plane: T.Plane) {
    return this.ray.ray.intersectPlane(plane, new T.Vector3());
  }
  doubleClick = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this.getRay(e);
    if (
      this.ray
        .intersectObjects(this.solids.children, true)
        .some((h) => h.object.userData.part)
    )
      return;
    this.cancel();
    this.cb.tool("select");
    this.cb.hint("Select mode");
  };
  chooseOpening(partId: string, id: string, face: number, shift = false) {
    const same = this.selected === partId && this.activeFace?.index === face;
    if (shift && this.selectedOpenings.length && !same) {
      this.cb.hint("Select openings on the same wall to move them together.");
      return false;
    }
    const ids =
      shift && same
        ? this.selectedOpenings.includes(id)
          ? this.selectedOpenings.filter((v) => v !== id)
          : [...this.selectedOpenings, id]
        : [id];
    this.cb.select(partId);
    this.cb.face({ partId, index: face });
    this.cb.opening(ids.at(-1) ?? null, ids);
    return true;
  }
  down = (e: PointerEvent) => {
    this.tooltip.hidden = true;
    if (e.button !== 0) return;
    if (this.tool === "select") {
      const hit = this.pickOpening(e);
      if (hit) {
        const { p, o, handle } = hit;
        const point = this.openingPoint(e, p, o.face);
        if (e.shiftKey) {
          this.chooseOpening(p.id, o.id, o.face, true);
          e.stopImmediatePropagation();
          return;
        }
        const already =
          this.selected === p.id && this.selectedOpenings.includes(o.id);
        if (!already) this.chooseOpening(p.id, o.id, o.face);
        if (point && already) {
          this.openingDrag = {
            start: point,
            partId: p.id,
            face: o.face,
            capture: e.pointerId,
            original: { ...o },
            originals:
              handle === "move"
                ? (p.openings ?? [])
                    .filter((v) => this.selectedOpenings.includes(v.id))
                    .map((v) => ({ ...v }))
                : undefined,
            handle,
          };
          this.controls.enabled = false;
          this.renderer.domElement.setPointerCapture(e.pointerId);
        }
        e.stopImmediatePropagation();
        return;
      }
    }
    if (this.tool === "openings") {
      const p = this.plan.parts.find((p) => p.id === this.activeFace?.partId);
      if (!p || !this.activeFace) return;
      const point = this.openingPoint(e, p, this.activeFace.index);
      if (!point) return;
      this.openingDrag = {
        start: point,
        partId: p.id,
        face: this.activeFace.index,
        capture: e.pointerId,
      };
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();
      return;
    }
    if (this.tool === "add") {
      const p = this.placement(e);
      if (!p) return;
      const d = clone(this.plan);
      p.name += " " + (d.parts.length + 1);
      p.role = d.parts.length ? "extension" : "main";
      d.parts.push(p);
      this.disposeGroup(this.preview);
      this.cb.commit(d);
      this.cb.select(p.id);
      this.selectionMode = "faces";
      this.cb.tool("select");
      this.cb.hint("Shape placed · edit dimensions in Component Settings");
      e.stopImmediatePropagation();
      return;
    }
    this.getRay(e);
    const hits = this.ray
      .intersectObjects([...this.aids.children, ...this.hover.children])
      .filter(
        (x) =>
          x.object.userData.handle &&
          canEditHandle(
            this.tool,
            this.selectionMode,
            x.object.userData.handle,
          ) &&
          !(this.view === "top" && x.object.userData.axis === "y"),
      );
    const handle = hits[0]?.object;
    const axis = handle?.userData.axis as "x" | "y" | "z" | undefined;
    const level = handle?.userData.level as number | undefined;
    const body = this.ray
      .intersectObjects(this.solids.children, true)
      .find((x) => x.object.userData.part);
    let kind = handle?.userData.handle as string | undefined,
      id = (handle?.userData.part || body?.object.userData.part) as
        string | undefined;
    if (
      this.tool === "select" &&
      this.selectionMode === "faces" &&
      body?.object.userData.wall &&
      !axis
    ) {
      const part = this.plan.parts.find(
        (p) => p.id === body.object.userData.part,
      );
      if (part && part.shape !== "circle") {
        const local = body.object.parent!.worldToLocal(body.point.clone());
        const normal = body.face?.normal;
        if (normal && Math.abs(normal.y) < 0.5) {
          let best = 0,
            dist = Infinity;
          for (let i = 0; i < 4; i++) {
            const f = wallFrame(part, i),
              d = Math.abs(local.clone().sub(f.a).dot(f.inward));
            if (d < dist) {
              dist = d;
              best = i;
            }
          }
          if (
            this.activeFace?.partId !== part.id ||
            this.activeFace.index !== best
          ) {
            this.cb.select(part.id);
            this.cb.face({ partId: part.id, index: best });
            this.cb.opening(null);
            e.stopImmediatePropagation();
            return;
          }
        }
      }
    }
    if (this.tool === "draw") {
      kind = "draw";
      id = undefined;
    } else if (!kind && body) {
      this.cb.select(id!);
      if (this.tool === "rotate") kind = "rotate";
      else return;
    } else if (!kind) {
      this.cb.select(null);
      return;
    }
    if (
      (kind === "height" || kind === "roof" || axis === "y") &&
      this.view === "top"
    ) {
      this.cb.hint(
        "Switch to 3D to drag heights, or use the dimensions panel.",
      );
      return;
    }
    const drawY =
      kind === "draw" && this.drawShape === "circle" && body ? body.point.y : 0;
    const plane = new T.Plane(new T.Vector3(0, 1, 0), -drawY);
    if (kind === "height" || kind === "roof" || axis === "y") {
      const pos = handle!.position;
      const normal = this.camera.position.clone().sub(this.controls.target);
      normal.y = 0;
      normal.normalize();
      plane.setFromNormalAndCoplanarPoint(normal, pos);
    }
    if (axis && axis !== "y" && handle) {
      const direction = new T.Vector3(
        axis === "x" ? 1 : 0,
        0,
        axis === "z" ? 1 : 0,
      );
      const normal = this.camera.position
        .clone()
        .sub(handle.getWorldPosition(new T.Vector3()));
      normal.addScaledVector(direction, -normal.dot(direction));
      normal.normalize();
      plane.setFromNormalAndCoplanarPoint(
        normal,
        handle.getWorldPosition(new T.Vector3()),
      );
    }
    const point = this.planePoint(plane);
    if (!point) {
      if (kind === "move" && !axis) {
        this.moveAxes = true;
        this.rebuild();
        this.cb.hint("Use the visible axis arrows to move in this flat view.");
      }
      return;
    }
    e.stopImmediatePropagation();
    this.controls.enabled = false;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    if (!(kind === "move" && this.selected?.includes(":")))
      this.cb.select(id ?? this.selected);
    this.drag = {
      kind: kind!,
      axis,
      level,
      drawY,
      initial: clone(this.plan),
      id,
      start: point,
      plane,
      capture: e.pointerId,
    };
    if (kind === "move" && !axis) {
      this.moveAxes = true;
      this.rebuild();
    }
    this.cb.hint(
      kind === "draw"
        ? "Drag a footprint. Release to create."
        : "Drag to adjust · Escape cancels",
    );
  };
  leave = () => {
    this.tooltip.hidden = true;
    this.disposeGroup(this.preview);
  };
  pickOpening(e: PointerEvent) {
    this.getRay(e);
    const handleHit = this.ray
      .intersectObjects(this.aids.children)
      .find((h) => h.object.userData.openingHandle);
    if (handleHit) {
      const data = handleHit.object.userData;
      const p = this.plan.parts.find((p) => p.id === data.partId)!;
      return {
        p,
        o: p.openings!.find((o) => o.id === data.openingId)!,
        handle: data.openingHandle as string,
      };
    }
    const solidDistance =
      this.ray
        .intersectObjects(this.solids.children, true)
        .find((hit) => hit.object instanceof T.Mesh)?.distance ?? Infinity;
    const candidates: {
      p: Part;
      o: Opening;
      handle: string;
      distance: number;
    }[] = [];
    for (const p of this.plan.parts)
      for (const o of p.openings ?? []) {
        const q = this.openingPoint(e, p, o.face);
        if (!q) continue;
        const polygon = openingOutline(o);
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const a = polygon[i],
            b = polygon[j];
          if (
            a.y > q.y !== b.y > q.y &&
            q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x
          )
            inside = !inside;
        }
        // A screen-space border tolerance stays easy to hit at any zoom.
        const rect = this.renderer.domElement.getBoundingClientRect();
        const screen = (v: T.Vector2) => {
          const q = wallFrame(p, o.face)
            .point(v.x, v.y)
            .applyAxisAngle(
              new T.Vector3(0, 1, 0),
              (p.rotation * Math.PI) / 180,
            )
            .add(new T.Vector3(p.x, baseY(p), p.z))
            .project(this.camera);
          return new T.Vector2(
            rect.left + ((q.x + 1) * rect.width) / 2,
            rect.top + ((1 - q.y) * rect.height) / 2,
          );
        };
        const mouse = new T.Vector2(e.clientX, e.clientY);
        let near = false;
        for (let i = 0; i < polygon.length; i++) {
          const a = screen(polygon[i]),
            b = screen(polygon[(i + 1) % polygon.length]),
            ab = b.clone().sub(a);
          const t = T.MathUtils.clamp(
            mouse.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 0.001),
            0,
            1,
          );
          if (mouse.distanceTo(a.addScaledVector(ab, t)) <= 10) near = true;
        }
        if (!inside && !near) continue;
        const world = wallFrame(p, o.face)
          .point(q.x, q.y)
          .applyAxisAngle(new T.Vector3(0, 1, 0), (p.rotation * Math.PI) / 180)
          .add(new T.Vector3(p.x, baseY(p), p.z));
        const distance = world.distanceTo(this.ray.ray.origin);
        if (this.xray || distance <= solidDistance + 0.05)
          candidates.push({ p, o, handle: "move", distance });
      }
    return candidates.sort((a, b) => a.distance - b.distance)[0];
  }
  openingPoint(e: PointerEvent, p: Part, face: number) {
    this.getRay(e);
    const f = wallFrame(p, face),
      rotation = new T.Matrix4().makeRotationY((p.rotation * Math.PI) / 180);
    const origin = f.a
        .clone()
        .applyMatrix4(rotation)
        .add(new T.Vector3(p.x, baseY(p), p.z)),
      normal = f.inward.clone().transformDirection(rotation);
    const hit = this.planePoint(
      new T.Plane().setFromNormalAndCoplanarPoint(normal, origin),
    );
    if (!hit) return null;
    const local = hit
      .sub(new T.Vector3(p.x, baseY(p), p.z))
      .applyAxisAngle(new T.Vector3(0, 1, 0), (-p.rotation * Math.PI) / 180);
    return new T.Vector2(local.clone().sub(f.a).dot(f.u), local.y);
  }
  placement(e: PointerEvent) {
    this.getRay(e);
    const body = this.ray
      .intersectObjects(this.solids.children, true)
      .find((x) => x.object.userData.part);
    const q =
      body?.point ?? this.planePoint(new T.Plane(new T.Vector3(0, 1, 0), 0));
    if (!q) return null;
    const p = primitive(this.addShape, this.plan.moduleSize);
    const step = this.plan.moduleSize / this.plan.subdivision;
    p.x = snap(q.x, step);
    p.z = snap(q.z, step);
    p.baseY = Math.max(0, body ? q.y : 0);
    return p;
  }
  move = (e: PointerEvent) => {
    if (this.openingDrag) {
      e.stopImmediatePropagation();
      const drag = this.openingDrag,
        p = this.plan.parts.find((p) => p.id === drag.partId)!;
      const q = this.openingPoint(e, p, drag.face);
      if (!q) return;
      const step = this.plan.moduleSize / this.plan.subdivision,
        f = wallFrame(p, drag.face);
      const x = snap(Math.min(q.x, drag.start.x), step),
        y = snap(Math.min(q.y, drag.start.y), step);
      let width = Math.max(step, snap(Math.abs(q.x - drag.start.x), step)),
        h = Math.max(step, snap(Math.abs(q.y - drag.start.y), step));
      if (this.openingKind === "circle-window") width = h = Math.max(width, h);
      const bottom = this.openingKind.endsWith("door")
        ? Math.max(f.baseA, f.baseB)
        : y;
      let o: Opening = {
        id: "opening-preview",
        name: openingName(this.openingKind),
        kind: this.openingKind,
        face: drag.face,
        x,
        y: bottom,
        width,
        height: h,
      };
      if (drag.original)
        o = editOpening(
          drag.original,
          drag.handle ?? "move",
          q.x - drag.start.x,
          q.y - drag.start.y,
          step,
          Math.max(f.baseA, f.baseB),
        );
      const candidates = drag.originals?.length
        ? drag.originals.map((v) => ({
            ...v,
            x: v.x + o.x - drag.original!.x,
            y: v.y + o.y - drag.original!.y,
          }))
        : [o];
      const replaced = new Set(
        drag.originals?.map((v) => v.id) ?? [drag.original?.id],
      );
      const next = clone(this.plan);
      next.parts.find((p) => p.id === drag.partId)!.openings = [
        ...(p.openings ?? []).filter((v) => !replaced.has(v.id)),
        ...candidates,
      ];
      this.disposeGroup(this.preview);
      let valid = true;
      try {
        validate(next);
      } catch (error) {
        valid = false;
        this.cb.hint(String(error));
      }
      drag.candidate = valid ? o : undefined;
      drag.candidates = valid ? candidates : undefined;
      for (const candidate of candidates) {
        const pts = openingOutline(candidate).map((v) => f.point(v.x, v.y));
        pts.push(pts[0].clone());
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({
            color: valid ? 0x61ead2 : 0xff7777,
            depthTest: false,
            transparent: true,
          }),
        );
        line.position.set(p.x, baseY(p), p.z);
        line.rotation.y = (p.rotation * Math.PI) / 180;
        line.renderOrder = 20;
        this.preview.add(line);
      }
      this.scene.add(this.preview);
      if (valid)
        this.cb.hint(
          `${o.name}: ${o.width.toFixed(2)} × ${o.height.toFixed(2)} m · release to ${drag.original ? "apply" : "create"}`,
        );
      return;
    }
    if (this.tool === "add") {
      this.disposeGroup(this.preview);
      const p = this.placement(e);
      if (p) {
        const mesh = new T.Mesh(
          partGeometry(p, false),
          new T.MeshBasicMaterial({
            color: 0x53d7c2,
            transparent: true,
            opacity: 0.45,
            side: T.DoubleSide,
            depthWrite: false,
          }),
        );
        mesh.position.set(p.x, baseY(p), p.z);
        this.preview.add(mesh);
        this.scene.add(this.preview);
      }
      return;
    }
    if (!this.drag) {
      const opening = this.tool === "select" ? this.pickOpening(e) : null;
      if (opening) {
        this.disposeGroup(this.hover);
        const { p, o } = opening,
          f = wallFrame(p, o.face);
        const pts = openingOutline(o).map((v) => f.point(v.x, v.y));
        pts.push(pts[0].clone());
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
        );
        line.position.set(p.x, baseY(p), p.z);
        line.rotation.y = (p.rotation * Math.PI) / 180;
        line.renderOrder = 25;
        this.hover.add(line);
        this.host.style.cursor =
          opening.handle === "move" ? "move" : "crosshair";
        this.tooltip.textContent =
          o.name +
          " · " +
          (opening.handle === "move"
            ? "Select / move opening"
            : "Resize opening");
        this.tooltip.hidden = false;
        this.tooltip.style.left =
          Math.min(
            e.clientX + 14,
            window.innerWidth - this.tooltip.offsetWidth - 8,
          ) + "px";
        this.tooltip.style.top =
          Math.max(8, e.clientY - this.tooltip.offsetHeight - 12) + "px";
        return;
      }
      this.host.style.cursor =
        this.tool === "select" ? "default" : this.host.style.cursor;
      this.showHover(e);
      this.showTooltip(e);
      return;
    }
    e.stopImmediatePropagation();
    this.getRay(e);
    const q = this.planePoint(this.drag.plane);
    if (!q) return;
    const d = clone(this.drag.initial),
      step = d.moduleSize / d.subdivision,
      p = d.parts.find((p) => p.id === this.drag!.id),
      old = this.drag.initial.parts.find((p) => p.id === this.drag!.id);
    if (this.drag.kind === "draw") {
      const a = this.drag.start;
      const x1 = snap(a.x, step),
        z1 = snap(a.z, step),
        x2 = snap(q.x, step),
        z2 = snap(q.z, step);
      if (
        this.drawShape === "rectangle" &&
        (Math.abs(x2 - x1) < step || Math.abs(z2 - z1) < step)
      )
        return;
      if (
        this.drawShape === "circle" &&
        Math.hypot(q.x - a.x, q.z - a.z) < step / 2
      )
        return;
      const pnew = part(d.moduleSize);
      pnew.id = "drawing-preview";
      pnew.name = d.parts.length ? "Part " + (d.parts.length + 1) : "Main part";
      pnew.role = d.parts.length ? "extension" : "main";
      pnew.x = (x1 + x2) / 2;
      pnew.z = (z1 + z2) / 2;
      pnew.width = Math.abs(x2 - x1);
      pnew.depth = Math.abs(z2 - z1);
      pnew.floors = 1;
      if (this.drawShape === "circle") {
        const radius = Math.max(
          step / 2,
          snap(Math.hypot(q.x - a.x, q.z - a.z), step / 2),
        );
        pnew.shape = "circle";
        pnew.width = pnew.depth = radius * 2;
        pnew.x = x1;
        pnew.z = z1;
        pnew.roof = "flat";
        pnew.rise = 0;
        pnew.baseY = this.drag.drawY ?? 0;
        pnew.name = d.parts.length
          ? "Chimney " + d.parts.length
          : "Circular structure";
      }
      d.parts.push(pnew);
      this.cb.hint(`${pnew.width.toFixed(1)} × ${pnew.depth.toFixed(1)} m`);
    } else if (p && old) {
      const delta = q.clone().sub(this.drag.start);
      const axis = this.drag.axis;
      if (axis) {
        for (const a of ["x", "y", "z"] as const) if (a !== axis) delta[a] = 0;
      }
      if (this.drag.kind === "rotate") {
        const a = Math.atan2(
            this.drag.start.x - old.x,
            this.drag.start.z - old.z,
          ),
          b = Math.atan2(q.x - old.x, q.z - old.z);
        p.rotation =
          ((snap(
            old.rotation + ((b - a) * 180) / Math.PI,
            e.shiftKey ? 1 : 15,
          ) %
            360) +
            360) %
          360;
        this.cb.hint(`${p.rotation}° · 15° snap · Shift for 1°`);
      } else if (this.drag.kind.startsWith("radius-")) {
        const isTop = this.drag.kind.endsWith("top");
        const isInner = this.drag.kind.startsWith("radius-inner");
        const inner = isTop
          ? (old.topInnerDiameter ?? old.innerDiameter)
          : old.innerDiameter;
        const outer = isTop ? (old.topDiameter ?? old.width) : old.width;
        const start = isInner ? inner! : outer;
        const diameter = Math.min(
          500,
          Math.max(
            0.1,
            snap(
              start + (axis === "z" ? delta.z : delta.x) * (isInner ? -2 : 2),
              step,
            ),
          ),
        );
        // Materialise defaults before editing one end, keeping the other fixed.
        p.topDiameter = old.topDiameter ?? old.width;
        if (old.innerDiameter !== undefined)
          p.topInnerDiameter = old.topInnerDiameter ?? old.innerDiameter;
        const value = isInner
          ? Math.min(diameter, outer - 0.1)
          : Math.max(diameter, inner === undefined ? 0.1 : inner + 0.1);
        if (isInner) {
          if (isTop) p.topInnerDiameter = value;
          else p.innerDiameter = value;
        } else if (isTop) p.topDiameter = value;
        else p.width = p.depth = value;
        this.cb.hint(
          `${isTop ? "Top" : "Bottom"} ${isInner ? "inner" : "outer"} diameter ${value.toFixed(2)} m`,
        );
      } else if (this.drag.kind.startsWith("ridge:")) {
        const i = Number(this.drag.kind.split(":")[1]),
          ends = clone(ridgeEnds(old));
        const end = ends[i],
          world = new T.Vector3(end[0] * p.width, 0, end[2] * p.depth)
            .applyAxisAngle(
              new T.Vector3(0, 1, 0),
              (p.rotation * Math.PI) / 180,
            )
            .add(new T.Vector3(p.x, 0, p.z));
        if (axis !== "y") {
          if (axis !== "z") world.x = snap(world.x + delta.x, step);
          if (axis !== "x") world.z = snap(world.z + delta.z, step);
        }
        world
          .sub(new T.Vector3(p.x, 0, p.z))
          .applyAxisAngle(
            new T.Vector3(0, 1, 0),
            (-p.rotation * Math.PI) / 180,
          );
        const nx = world.x / p.width,
          nz = world.z / p.depth;
        const ny =
          axis === "y"
            ? Math.max(0, Math.min(50, snap(end[1] + delta.y, step)))
            : end[1];
        if (Math.abs(nx) <= 5 && Math.abs(nz) <= 5) {
          ends[i] = [nx, ny, nz];
          p.ridgeEnds = ends;
          this.cb.hint(
            "Ridge end adjusted · extend outward to overlap adjoining roofs",
          );
        }
      } else if (
        axis === "y" &&
        /^(edge|vertex|vertical|face):/.test(this.drag.kind)
      ) {
        if (this.drag.level === 0) {
          const [kind, idx] = this.drag.kind.split(":"),
            i = Number(idx),
            bases = old.cornerBases ? [...old.cornerBases] : [0, 0, 0, 0];
          for (const j of kind === "vertex" || kind === "vertical"
            ? [i]
            : [i, (i + 1) % 4])
            bases[j] = Math.max(
              0,
              Math.min(
                (old.cornerHeights?.[j] ?? height(old)) - 0.1,
                snap(bases[j] + delta.y, step),
              ),
            );
          p.cornerBases = bases;
          this.cb.hint("Lower vertices adjusted on Y");
        } else {
          const [kind, idx] = this.drag.kind.split(":"),
            i = Number(idx),
            heights = old.cornerHeights
              ? [...old.cornerHeights]
              : [height(old), height(old), height(old), height(old)];
          for (const j of kind === "vertex" || kind === "vertical"
            ? [i]
            : [i, (i + 1) % 4])
            heights[j] = Math.max(
              0.1,
              Math.min(500, snap(heights[j] + delta.y, step)),
            );
          p.cornerHeights = heights;
          this.cb.hint("Upper wall vertices adjusted on Y");
        }
      } else if (this.drag.kind === "height") {
        const targets = d.parts
          .filter((o) => o.id !== p.id)
          .flatMap((o) => [baseY(o) + height(o), topY(o)]);
        const result = snapTo(
          baseY(old) + height(old) + delta.y,
          step,
          targets,
        );
        p.wallHeight = Math.max(0.1, Math.min(500, result.value - baseY(p)));
        if (p.cornerHeights)
          p.cornerHeights = p.cornerHeights.map((y) =>
            Math.max(0.1, y + height(p) - height(old)),
          );
        this.cb.hint(
          `${height(p).toFixed(2)} m to eaves${result.aligned ? " · Snapped to part height" : ""}`,
        );
      } else if (this.drag.kind === "roof") {
        const targets = d.parts
          .filter((o) => o.id !== p.id)
          .flatMap((o) => [baseY(o) + height(o), topY(o)]);
        const result = snapTo(
          baseY(old) + height(old) + old.rise + delta.y,
          step,
          targets,
        );
        p.rise = Math.max(0, Math.min(50, result.value - baseY(p) - height(p)));
        if (p.ridgeEnds)
          p.ridgeEnds = p.ridgeEnds.map(([x, y, z]) => [
            x,
            Math.max(0, y + p.rise - old.rise),
            z,
          ]);
        this.cb.hint(
          `Roof top ${(height(p) + p.rise).toFixed(2)} m${result.aligned ? " · Snapped to part height" : ""}`,
        );
      } else if (this.drag.kind === "move") {
        const memberIds = new Set(
          selectedParts(this.drag.initial, this.selected).map((p) => p.id),
        );
        const own = worldCorners(old),
          others = d.parts
            .filter((o) => !memberIds.has(o.id))
            .flatMap(worldCorners);
        const xx = snapTo(
          old.x + delta.x,
          step,
          others.flatMap((o) => own.map((c) => o.x - (c.x - old.x))),
        );
        const zz = snapTo(
          old.z + delta.z,
          step,
          others.flatMap((o) => own.map((c) => o.z - (c.z - old.z))),
        );
        p.x = !axis || axis === "x" ? xx.value : old.x;
        p.z = !axis || axis === "z" ? zz.value : old.z;
        if (axis === "y")
          p.baseY = Math.max(
            0,
            snapTo(
              baseY(old) + delta.y,
              step,
              d.parts
                .filter((o) => !memberIds.has(o.id))
                .flatMap((o) => [baseY(o), baseY(o) + height(o), topY(o)]),
            ).value,
          );
        const moved = translateSelection(
          this.drag.initial,
          this.selected ?? p.id,
          p.x - old.x,
          baseY(p) - baseY(old),
          p.z - old.z,
        );
        for (const member of d.parts)
          if (memberIds.has(member.id)) {
            const next = moved.parts.find((q) => q.id === member.id)!;
            member.x = next.x;
            member.z = next.z;
            member.baseY = next.baseY;
          }
        this.cb.hint(
          xx.aligned || zz.aligned
            ? "Snapped to part edge"
            : "Move · Grid snap",
        );
      } else if (/^(edge|vertex|vertical|face):/.test(this.drag.kind)) {
        const [kind, index] = this.drag.kind.split(":");
        const i = Number(index);
        const points = footprint(old).map((q) => [...q] as [number, number]);
        delta.applyAxisAngle(
          new T.Vector3(0, 1, 0),
          (-p.rotation * Math.PI) / 180,
        );
        const indices =
          kind === "vertex" || kind === "vertical" ? [i] : [i, (i + 1) % 4];
        if (kind !== "vertex" && kind !== "vertical" && !axis) {
          const a = points[i],
            b = points[(i + 1) % 4],
            edge = new T.Vector2(
              (b[0] - a[0]) * p.width,
              (b[1] - a[1]) * p.depth,
            );
          const normal = new T.Vector2(edge.y, -edge.x).normalize();
          const amount = delta.x * normal.x + delta.z * normal.y;
          delta.x = normal.x * amount;
          delta.z = normal.y * amount;
        }
        const others = d.parts
          .filter((o) => o.id !== p.id)
          .flatMap((o) => worldCorners(o));
        for (const j of indices) {
          const local = new T.Vector3(
            points[j][0] * p.width + delta.x,
            0,
            points[j][1] * p.depth + delta.z,
          ).applyAxisAngle(
            new T.Vector3(0, 1, 0),
            (p.rotation * Math.PI) / 180,
          );
          const xx = snapTo(
              local.x + p.x,
              step,
              others.map((o) => o.x),
            ),
            zz = snapTo(
              local.z + p.z,
              step,
              others.map((o) => o.z),
            );
          local
            .set(
              (axis === "z" ? local.x + p.x : xx.value) - p.x,
              0,
              (axis === "x" ? local.z + p.z : zz.value) - p.z,
            )
            .applyAxisAngle(
              new T.Vector3(0, 1, 0),
              (-p.rotation * Math.PI) / 180,
            );
          points[j] = [local.x / p.width, local.z / p.depth];
        }
        if (validFootprint(points)) {
          // Re-centre and normalise the edited footprint so dimensions remain real extents.
          const xs = points.map((q) => q[0] * p.width),
            zs = points.map((q) => q[1] * p.depth);
          const minX = Math.min(...xs),
            maxX = Math.max(...xs),
            minZ = Math.min(...zs),
            maxZ = Math.max(...zs);
          const w = maxX - minX,
            dep = maxZ - minZ;
          if (w >= 0.1 && dep >= 0.1 && w <= 500 && dep <= 500) {
            const centre = new T.Vector3(
              (minX + maxX) / 2,
              0,
              (minZ + maxZ) / 2,
            ).applyAxisAngle(
              new T.Vector3(0, 1, 0),
              (p.rotation * Math.PI) / 180,
            );
            if (p.ridgeEnds)
              p.ridgeEnds = p.ridgeEnds.map(([x, y, z]) => [
                (x * old.width - (minX + maxX) / 2) / w,
                y,
                (z * old.depth - (minZ + maxZ) / 2) / dep,
              ]);
            p.x += centre.x;
            p.z += centre.z;
            p.width = w;
            p.depth = dep;
            p.footprint = xs.map((x, k) => [
              (x - (minX + maxX) / 2) / w,
              (zs[k] - (minZ + maxZ) / 2) / dep,
            ]);
          }
          this.cb.hint("Footprint adjusted · Grid and nearby edges snap");
        } else this.cb.hint("Keep a convex footprint; corners cannot cross");
      }
    }
    try {
      validate(d);
    } catch {
      this.cb.hint(
        "Adjustment would create invalid geometry; keep dimensions within bounds and wall tops above bases.",
      );
      return;
    }
    this.drag.last = d;
    this.plan = d;
    this.rebuild();
  };
  showTooltip(e: PointerEvent) {
    this.getRay(e);
    const hit = this.ray
      .intersectObjects([...this.aids.children, ...this.hover.children], true)
      .find(
        (h) =>
          h.object.userData.handle &&
          canEditHandle(
            this.tool,
            this.selectionMode,
            h.object.userData.handle,
          ),
      );
    if (!hit || this.drag || this.exporting) {
      this.tooltip.hidden = true;
      return;
    }
    const { handle: kind, axis } = hit.object.userData;
    let text: string;
    if (kind.startsWith("radius-"))
      text = `${kind.endsWith("top") ? "Top" : "Bottom"} ${kind.includes("inner") ? "inner" : "outer"} diameter`;
    else
      text =
        (
          {
            height: "Height",
            roof: "Roof height",
            move: "Move selection",
            rotate: "Rotate part",
          } as Record<string, string>
        )[kind] ??
        (kind.startsWith("ridge:")
          ? "Roof ridge endpoint"
          : kind.startsWith("vertex:")
            ? "Vertex"
            : kind.startsWith("face:")
              ? "Wall face"
              : "Edge");
    this.tooltip.textContent =
      text + (axis ? ` · ${axis.toUpperCase()} axis` : "");
    this.tooltip.hidden = false;
    const bounds = this.tooltip.getBoundingClientRect();
    this.tooltip.style.left = `${Math.max(8, Math.min(e.clientX + 14, window.innerWidth - bounds.width - 8))}px`;
    this.tooltip.style.top = `${Math.max(8, e.clientY - bounds.height - 12)}px`;
  }
  showHover(e: PointerEvent) {
    if (this.tool !== "select") {
      if (this.tool === "move" && this.moveAxes) return;
      this.disposeGroup(this.hover);
      return;
    }
    this.getRay(e);
    if (this.ray.intersectObjects(this.hover.children).length) return;
    this.disposeGroup(this.hover);
    const p = this.plan.parts.find((p) => p.id === this.selected);
    if (!p) return;
    const corners = worldCorners(p),
      r = this.renderer.domElement.getBoundingClientRect();
    const candidates: {
      kind: string;
      pos: T.Vector3;
      level?: number;
      a?: T.Vector3;
      b?: T.Vector3;
    }[] = [];
    for (const child of this.aids.children)
      if (
        child.userData.handle &&
        [
          "height",
          "roof",
          "radius-top",
          "radius-bottom",
          "radius-inner-bottom",
          "radius-inner-top",
        ].includes(child.userData.handle)
      )
        candidates.push({
          kind: child.userData.handle,
          pos: child.position.clone(),
          level: 1,
        });
    if (p.roofEnabled !== false && p.roof === "gable")
      for (const [i, end] of ridgeEnds(p).entries()) {
        const pos = new T.Vector3(
          end[0] * p.width,
          height(p) + end[1],
          end[2] * p.depth,
        )
          .applyAxisAngle(new T.Vector3(0, 1, 0), (p.rotation * Math.PI) / 180)
          .add(new T.Vector3(p.x, baseY(p), p.z));
        candidates.push({ kind: `ridge:${i}`, pos, level: 1 });
      }
    for (let i = 0; i < (p.shape === "circle" ? 0 : 4); i++) {
      for (const [layer, y] of [
        p.cornerBases?.[i] ?? 0,
        p.cornerHeights?.[i] ?? height(p),
      ].entries()) {
        candidates.push({
          kind: `vertex:${i}`,
          pos: corners[i].clone().setY(baseY(p) + y),
          level: layer,
        });
        const a = corners[i].clone().setY(baseY(p) + y);
        const j = (i + 1) % 4;
        const b = corners[j]
          .clone()
          .setY(
            baseY(p) +
              (layer === 0
                ? (p.cornerBases?.[j] ?? 0)
                : (p.cornerHeights?.[j] ?? height(p))),
          );
        candidates.push({
          kind: `edge:${i}`,
          pos: a.clone().add(b).multiplyScalar(0.5),
          level: layer,
          a,
          b,
        });
      }
      const a = corners[i].clone().setY(baseY(p) + (p.cornerBases?.[i] ?? 0));
      const b = corners[i]
        .clone()
        .setY(baseY(p) + (p.cornerHeights?.[i] ?? height(p)));
      candidates.push({
        kind: `vertical:${i}`,
        pos: a.clone().add(b).multiplyScalar(0.5),
        level: 1,
        a,
        b,
      });
    }

    const nearest = candidates
      .filter((c) => canEditHandle(this.tool, this.selectionMode, c.kind))
      .map((c) => {
        const screen = (point: T.Vector3) => {
          const v = point.clone().project(this.camera);
          return new T.Vector2(
            ((v.x + 1) * r.width) / 2 + r.left,
            ((-v.y + 1) * r.height) / 2 + r.top,
          );
        };
        let v = screen(c.pos);
        if (c.a && c.b) {
          const a = screen(c.a),
            b = screen(c.b),
            ab = b.clone().sub(a);
          const t = T.MathUtils.clamp(
            new T.Vector2(e.clientX, e.clientY).sub(a).dot(ab) /
              Math.max(ab.lengthSq(), 1e-9),
            0,
            1,
          );
          v = a.addScaledVector(ab, t);
        }
        return { ...c, d: Math.hypot(v.x - e.clientX, v.y - e.clientY) };
      })
      .sort((a, b) => a.d - b.d)[0];
    let choice = nearest?.d < 20 ? nearest : undefined;
    const ridgeHit = this.ray
      .intersectObjects(this.aids.children)
      .find((h) => h.object.userData.handle === "roof");
    if (
      !choice &&
      ridgeHit &&
      canEditHandle(this.tool, this.selectionMode, "roof")
    )
      choice = {
        kind: "roof",
        pos: ridgeHit.object.position.clone(),
        level: 1,
        d: 0,
      };
    const hit = this.ray
      .intersectObjects(this.solids.children, true)
      .find((h) => h.object.userData.part);
    if (
      !choice &&
      this.selectionMode === "faces" &&
      p.shape !== "circle" &&
      hit?.object.userData.part === p.id &&
      hit.object.userData.wall
    ) {
      const local = hit.object.parent!.worldToLocal(hit.point.clone());
      if (local.y > height(p) - 0.05) return;
      const pts = footprint(p).map(
        ([x, z]) => new T.Vector2(x * p.width, z * p.depth),
      );
      let best = 0,
        dist = Infinity;
      for (let i = 0; i < 4; i++) {
        const a = pts[i],
          b = pts[(i + 1) % 4],
          ab = b.clone().sub(a),
          q = new T.Vector2(local.x, local.z).sub(a),
          t = T.MathUtils.clamp(q.dot(ab) / ab.lengthSq(), 0, 1);
        const dd = q.sub(ab.multiplyScalar(t)).length();
        if (dd < dist) {
          dist = dd;
          best = i;
        }
      }
      choice = {
        kind: `face:${best}`,
        pos: corners[best]
          .clone()
          .add(corners[(best + 1) % 4])
          .multiplyScalar(0.5)
          .setY(baseY(p) + height(p) / 2),
        level: 1,
        d: 0,
      };
    }
    if (choice?.a && choice.b) {
      const delta = choice.b.clone().sub(choice.a);
      if (delta.length() < 1e-6) return;
      const radius =
        ((this.camera.top - this.camera.bottom) / this.camera.zoom / r.height) *
        7;
      const mesh = new T.Mesh(
        new T.CylinderGeometry(radius, radius, delta.length(), 8),
        new T.MeshBasicMaterial({
          color: 0x66ead4,
          transparent: true,
          opacity: 0.85,
          depthTest: false,
          depthWrite: false,
        }),
      );
      mesh.position.copy(choice.pos);
      mesh.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        delta.normalize(),
      );
      mesh.userData = { handle: choice.kind, part: p.id, level: choice.level };
      mesh.renderOrder = 20;
      this.hover.add(mesh);
      this.axes(choice.pos, choice.kind, p, choice.level);
      return;
    }
    if (choice) {
      const mesh = new T.Mesh(
        new T.SphereGeometry(0.16, 12, 8),
        new T.MeshBasicMaterial({ color: 0x66ead4, depthTest: false }),
      );
      mesh.position.copy(choice.pos);
      mesh.userData = { handle: choice.kind, part: p.id, level: choice.level };
      mesh.renderOrder = 20;
      this.hover.add(mesh);
      this.axes(choice.pos, choice.kind, p, choice.level);
    }
  }
  label(text: string, pos: T.Vector3, group: T.Group) {
    const canvas = document.createElement("canvas");
    canvas.width = text.length === 1 ? 80 : 512;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(15,25,31,.85)";
    ctx.fillRect(0, 0, canvas.width, 80);
    ctx.fillStyle = "#d9efee";
    ctx.font = text.length === 1 ? "52px sans-serif" : "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, 52);
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: new T.CanvasTexture(canvas),
        depthTest: false,
      }),
    );
    sprite.position.copy(pos);
    sprite.scale.set(3.6, 0.56, 1);
    sprite.renderOrder = 30;
    group.add(sprite);
  }
  axes(pos: T.Vector3, kind: string, p: Part, level?: number) {
    for (const [axis, color] of [
      ["x", 0xef7979],
      ["y", 0x71dd9c],
      ["z", 0x74adff],
    ] as const) {
      // Height and roof-rise controls are vertical by definition.
      if (["height", "roof"].includes(kind) && axis !== "y") continue;
      if (kind.startsWith("radius-") && axis === "y") continue;
      const dir = new T.Vector3(
          axis === "x" ? 1 : 0,
          axis === "y" ? 1 : 0,
          axis === "z" ? 1 : 0,
        ),
        length = 1.5;
      const rod = new T.Mesh(
        new T.CylinderGeometry(0.045, 0.045, length, 8),
        new T.MeshBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
        }),
      );
      rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      rod.position.copy(pos).addScaledVector(dir, length / 2);
      rod.userData = { handle: kind, part: p.id, axis, level };
      rod.renderOrder = 21;
      const tip = new T.Mesh(
        new T.ConeGeometry(0.14, 0.35, 12),
        new T.MeshBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
        }),
      );
      tip.quaternion.copy(rod.quaternion);
      tip.position.copy(pos).addScaledVector(dir, length);
      tip.userData = { ...rod.userData };
      tip.renderOrder = 21;
      this.hover.add(rod, tip);
      this.label(
        axis.toUpperCase(),
        pos.clone().addScaledVector(dir, length + 0.25),
        this.hover,
      );
      const label = this.hover.children.at(-1) as T.Sprite;
      label.scale.set(0.35, 0.25, 1);
    }
  }
  up = (e: PointerEvent) => {
    if (this.openingDrag) {
      e.stopImmediatePropagation();
      const drag = this.openingDrag;
      this.openingDrag = null;
      this.controls.enabled = true;
      this.disposeGroup(this.preview);
      if (this.renderer.domElement.hasPointerCapture(e.pointerId))
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      if (drag.candidate) {
        const next = clone(this.plan),
          o = { ...drag.candidate, id: drag.original?.id ?? uid() };
        const copies = drag.original ? (drag.candidates ?? [o]) : [o];
        const ids = new Set(copies.map((v) => v.id));
        next.parts.find((p) => p.id === drag.partId)!.openings = [
          ...(
            next.parts.find((p) => p.id === drag.partId)!.openings ?? []
          ).filter((v) => !ids.has(v.id)),
          ...copies,
        ];
        this.cb.commit(next);
        this.cb.opening(
          o.id,
          copies.map((v) => v.id),
        );
        this.cb.tool("select");
        this.cb.hint(
          "Opening ready · drag its centre to move, or handles to resize",
        );
      }
      return;
    }
    if (!this.drag) return;
    e.stopImmediatePropagation();
    const last = this.drag.last;
    this.drag = null;
    this.controls.enabled = true;
    if (this.renderer.domElement.hasPointerCapture(e.pointerId))
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    if (last) {
      const p = last.parts.find((p) => p.id === "drawing-preview");
      if (p) {
        p.id = uid();
        this.cb.select(p.id);
      }
      this.cb.commit(last);
    }
    this.cb.hint("Ready");
  };
  cancel = () => {
    if (this.openingDrag) {
      const id = this.openingDrag.capture;
      this.openingDrag = null;
      this.controls.enabled = true;
      if (this.renderer.domElement.hasPointerCapture(id))
        this.renderer.domElement.releasePointerCapture(id);
    }

    this.disposeGroup(this.preview);
    if (!this.drag) return;
    this.plan = this.drag.initial;
    this.drag = null;
    this.controls.enabled = true;
    this.rebuild();
    this.cb.hint("Edit cancelled");
  };
  key = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.cancel();
  };
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.left = (-this.span * w) / h / 2;
    this.camera.right = (this.span * w) / h / 2;
    this.camera.top = this.span / 2;
    this.camera.bottom = -this.span / 2;
    this.camera.updateProjectionMatrix();
  }
  setView(view: string, fit = false, aspect = this.plan.front) {
    this.view = view;
    const box = new T.Box3().setFromObject(this.solids);
    if (this.terrain.visible && this.terrain.children.length)
      box.union(new T.Box3().setFromObject(this.terrain));
    let centre = new T.Vector3(0, 2, 0),
      size = new T.Vector3(12, 8, 12);
    if (!box.isEmpty()) {
      box.getCenter(centre);
      box.getSize(size);
    }
    if (fit) {
      this.span = Math.max(15, Math.hypot(size.x, size.z) * 1.35, size.y * 2);
      this.camera.zoom = 1;
      this.resize();
    }
    this.controls.target.copy(centre);
    const pose = viewPose(view, aspect);
    this.camera.up.fromArray(pose.up);
    this.camera.position
      .copy(centre)
      .add(
        new T.Vector3()
          .fromArray(pose.direction)
          .multiplyScalar(Math.max(1, size.length() / 50)),
      );
    this.camera.far = Math.max(2000, size.length() * 10);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(centre);
    this.controls.enableRotate = !flatView(view) && this.tool === "select";
    this.controls.update();
  }
  async captures(includeTerrain = true) {
    this.disposeGroup(this.preview);
    this.exporting = true;
    const wasXray = this.xray;
    if (wasXray) {
      this.xray = false;
      this.rebuild();
    }
    const terrainVisible = this.terrain.visible;
    this.terrain.visible = includeTerrain;
    const result: Record<string, Blob> = {};
    const old = this.renderer.getSize(new T.Vector2()),
      pixel = this.renderer.getPixelRatio();
    this.hover.visible = false;
    this.aids.visible = false;
    this.grid.visible = false;
    const box = new T.Box3().setFromObject(this.solids);
    if (includeTerrain && this.terrain.children.length)
      box.union(new T.Box3().setFromObject(this.terrain));
    const c = box.getCenter(new T.Vector3()),
      size = box.getSize(new T.Vector3());
    const span = Math.max(10, Math.hypot(size.x, size.z) + size.y) * 1.25;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(1400, 1200, false);
    try {
      for (const view of referenceViews) {
        const cam = new T.OrthographicCamera(
          (-span * 7) / 12,
          (span * 7) / 12,
          span / 2,
          -span / 2,
          0.1,
          Math.max(2000, size.length() * 10),
        );
        const pose = viewPose(view, this.plan.front);
        cam.position
          .copy(c)
          .add(
            new T.Vector3()
              .fromArray(pose.direction)
              .multiplyScalar(Math.max(1, size.length() / 50)),
          );
        cam.up.fromArray(pose.up);
        cam.lookAt(c);
        this.renderer.render(this.scene, cam);
        result[view] = await new Promise<Blob>((resolve, reject) =>
          this.renderer.domElement.toBlob(
            (b) => (b ? resolve(b) : reject(Error("Could not export image."))),
            "image/png",
          ),
        );
      }
    } finally {
      this.terrain.visible = terrainVisible;
      this.exporting = false;
      if (wasXray) {
        this.xray = true;
        this.rebuild();
      }
      this.renderer.setPixelRatio(pixel);
      this.renderer.setSize(old.x, old.y, false);
      this.hover.visible = true;
      this.aids.visible = true;
      this.grid.visible = true;
    }
    return result;
  }
  animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    if (this.exporting) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.tooltip.remove();
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.controls.dispose();
    this.disposeGroup(this.solids);
    this.disposeGroup(this.aids);
    this.disposeGroup(this.grid);
    this.disposeGroup(this.hover);
    this.disposeGroup(this.terrain);
    window.removeEventListener("keydown", this.key);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function worldCorners(p: Part): T.Vector3[] {
  return footprint(p).map(([x, z]) =>
    new T.Vector3(x * p.width, 0, z * p.depth)
      .applyAxisAngle(new T.Vector3(0, 1, 0), (p.rotation * Math.PI) / 180)
      .add(new T.Vector3(p.x, 0, p.z)),
  );
}
