import { defineConfig, type Plugin } from "vite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Library } from "./server/library";
function localLibrary(): Plugin {
  let library: Library, testLibrary: Library;
  const setup = (server: any) => {
    mkdirSync(resolve("data"), { recursive: true });
    library ??= new Library(resolve("data/scenes.sqlite"));
    testLibrary ??= new Library(":memory:");
    server.middlewares.use(async (req: any, res: any, next: any) => {
      const url = new URL(req.url, "http://localhost");
      const test = url.pathname.startsWith("/api/test-library");
      const root = test ? "/api/test-library" : "/api/library";
      if (!url.pathname.startsWith(root + "/")) return next();
      const send = (status: number, value: any) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(value));
      };
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        return send(403, {
          error: "Only this local editor can access the library.",
        });
      try {
        const db = test ? testLibrary : library,
          path = url.pathname.slice(root.length);
        let body: any = {};
        if (req.method === "POST" || req.method === "PUT") {
          if (!req.headers["content-type"]?.startsWith("application/json"))
            return send(415, { error: "JSON required." });
          let raw = "";
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > (path === "/materials" ? 78_000_000 : 2_000_000))
              return send(413, { error: "Scene is too large." });
          }
          body = JSON.parse(raw);
        }
        const materialAction=path.match(/^\/materials\/([\w-]+)\/(archive|restore)$/);
        if(materialAction&&req.method==="POST")return send(200,db.archiveMaterial(materialAction[1],materialAction[2]==="archive"));
        const usage=path.match(/^\/materials\/([\w-]+)\/usage$/);
        if(usage&&req.method==="GET")return send(200,db.materialUsage(usage[1]));
        if(path === "/materials" && req.method === "GET") return send(200,db.materials());
        if(path === "/materials" && req.method === "POST") return send(201,db.createMaterial(body));
        if (path === "/projects" && req.method === "GET")
          return send(200, db.projects());
        if (path === "/projects" && req.method === "POST")
          return send(201, db.createProject(body.name));
        if (path === "/scenes" && req.method === "GET")
          return send(200, db.scenes());
        const match = path.match(/^\/scenes\/([\w-]+)$/);
        if (match) {
          if (req.method === "GET") {
            const scene = db.scene(match[1]);
            return send(
              scene ? 200 : 404,
              scene ?? { error: "Scene not found." },
            );
          }
          if (req.method === "PUT") return send(200, db.save(match[1], body));
        }
        send(404, { error: "Unknown library action." });
      } catch (e) {
        send(400, { error: (e as Error).message });
      }
    });
  };
  return {
    name: "local-scene-library",
    configureServer: setup,
    configurePreviewServer: setup,
    closeBundle() {
      library?.close();
      testLibrary?.close();
    },
  };
}
export default defineConfig({
  plugins: [localLibrary()],
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
