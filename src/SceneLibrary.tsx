import React, { useEffect, useState } from "react";
import { libraryRequest, type Project, type SceneEntry } from "./library";
export function SceneLibrary({
  onOpen,
  onClose,
  onImport,
  onBackup,
  currentId,
}: {
  onOpen: (id: string) => void;
  onClose: () => void;
  onImport: () => void;
  onBackup: () => void;
  currentId: string;
}) {
  const [projects, setProjects] = useState<Project[]>([]),
    [scenes, setScenes] = useState<SceneEntry[]>([]),
    [search, setSearch] = useState(""),
    [project, setProject] = useState("all"),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [creating, setCreating] = useState(false),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      const [p, s] = await Promise.all([
        libraryRequest<Project[]>("/projects"),
        libraryRequest<SceneEntry[]>("/scenes"),
      ]);
      setProjects(p);
      setScenes(s);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const filtered = scenes.filter(
    (s) =>
      (project === "all" || (s.projectId ?? "") === project) &&
      `${s.name} ${projects.find((p) => p.id === s.projectId)?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="modal-backdrop">
      <section
        className="modal scene-library"
        role="dialog"
        aria-modal="true"
        aria-label="Scene library"
      >
        <div className="library-heading">
          <div>
            <span className="overline">LOCAL LIBRARY</span>
            <h2>Projects & scenes</h2>
          </div>
          <button onClick={onClose} aria-label="Close library">
            ×
          </button>
        </div>
        <div className="pair">
          <input
            autoFocus
            aria-label="Search scenes"
            placeholder="Search scenes or projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="all">All projects</option>
            <option value="">Unfiled scenes</option>
            {projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <form
          className="new-project"
          onSubmit={async (e) => {
            e.preventDefault();
            if (creating) return;
            setCreating(true);
            setError("");
            setNotice("");
            try {
              const p = await libraryRequest<Project>("/projects", { name });
              setName("");
              await refresh();
              setProject(p.id);
              setSearch("");
              setNotice(`“${p.name}” saved. Use Settings → Project to save the current scene into it.`);
            } catch (e) {
              setError(String(e));
            } finally {
              setCreating(false);
            }
          }}
        >
          <input
            aria-label="New project name"
            placeholder="New project name"
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
          />
          <button disabled={creating || !name.trim()}>{creating ? "Creating…" : "Create project"}</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {notice && <p className="micro" role="status">{notice}</p>}
        <nav className="library-projects" aria-label="Saved projects">
          {[{id: "all", name: "All scenes"}, {id: "", name: "Unfiled"}, ...projects].map(p => (
            <button key={p.id} className={project === p.id ? "active" : ""}
              aria-pressed={project === p.id} onClick={() => setProject(p.id)}>
              <span>{p.name}</span><span className="project-count">{scenes.filter(s => p.id === "all" || (s.projectId ?? "") === p.id).length}</span>
            </button>
          ))}
        </nav>
        <div className="library-scenes">
          {loading ? (
            <p>Loading saved scenes…</p>
          ) : !filtered.length ? (
            <p className="micro">
              {search ? "No scenes match your search." : "No scenes here yet. Choose this project in Settings and save your scene to add it here."}
            </p>
          ) : (
            filtered.map((s) => (
              <button
                className="library-scene"
                key={s.id}
                onClick={() => onOpen(s.id)}
              >
                <span>
                  <strong>{s.name || "Untitled scene"}</strong>
                  <small>
                    {projects.find((p) => p.id === s.projectId)?.name ??
                      "Unfiled"}
                    {s.id === currentId ? " · Current scene" : ""}
                  </small>
                </span>
                <time>{new Date(s.updatedAt).toLocaleString()}</time>
                <span>Open →</span>
              </button>
            ))
          )}
        </div>
        <div className="library-footer">
          <button onClick={onImport}>Import JSON…</button>
          <button onClick={onBackup}>Download current JSON</button>
          <span className="micro">Stored locally on this computer</span>
        </div>
      </section>
    </div>
  );
}
