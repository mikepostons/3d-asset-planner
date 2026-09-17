import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { validate } from "../src/model";
export class Library {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
 CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS scenes(id TEXT PRIMARY KEY,name TEXT NOT NULL,project_id TEXT REFERENCES projects(id),plan TEXT NOT NULL,version INTEGER NOT NULL,updated_at TEXT NOT NULL);
 PRAGMA user_version=1;`);
  }
  projects() {
    return this.db
      .prepare("SELECT id,name FROM projects ORDER BY name COLLATE NOCASE")
      .all();
  }
  createProject(name: unknown) {
    if (typeof name !== "string" || !name.trim() || name.length > 150)
      throw Error("Enter a project name (up to 150 characters).");
    const p = { id: randomUUID(), name: name.trim() };
    this.db.prepare("INSERT INTO projects VALUES (?,?)").run(p.id, p.name);
    return p;
  }
  scenes() {
    return this.db
      .prepare(
        "SELECT id,name,project_id AS projectId,version,updated_at AS updatedAt FROM scenes ORDER BY updated_at DESC",
      )
      .all();
  }
  scene(id: string) {
    const r = this.db
      .prepare(
        "SELECT id,project_id AS projectId,plan,version,updated_at AS updatedAt FROM scenes WHERE id=?",
      )
      .get(id);
    return r
      ? {
          id: String(r.id),
          projectId: r.projectId === null ? null : String(r.projectId),
          version: Number(r.version),
          updatedAt: String(r.updatedAt),
          plan: JSON.parse(r.plan as string),
        }
      : null;
  }
  save(id: string, body: any) {
    const plan = validate(body.plan);
    if (plan.id !== id) throw Error("Scene identity does not match.");
    if (!Number.isInteger(body.version) || body.version < 0)
      throw Error("Invalid save version.");
    const projectId = body.projectId || null;
    if (
      projectId &&
      !this.db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)
    )
      throw Error("Project no longer exists.");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.scene(id);
      if ((old?.version ?? 0) !== body.version)
        throw Error(
          "This scene was saved elsewhere. Open its latest version before saving again.",
        );
      const version = body.version + 1,
        updatedAt = new Date().toISOString();
      this.db
        .prepare(
          "INSERT INTO scenes VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,project_id=excluded.project_id,plan=excluded.plan,version=excluded.version,updated_at=excluded.updated_at",
        )
        .run(
          id,
          plan.name,
          projectId,
          JSON.stringify(plan),
          version,
          updatedAt,
        );
      this.db.exec("COMMIT");
      return { version, updatedAt };
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
