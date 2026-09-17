import { type Plan } from "./model";
export type Project = { id: string; name: string };
export type SceneEntry = {
  id: string;
  name: string;
  projectId: string | null;
  version: number;
  updatedAt: string;
};
export type SavedScene = SceneEntry & { plan: Plan };
const root = new URLSearchParams(location.search).has("test")
  ? "/api/test-library"
  : "/api/library";
export async function libraryRequest<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(root + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let value;
  try {
    value = await response.json();
  } catch {
    throw Error(
      "The local scene library is unavailable. Restart Asset Designer and try again.",
    );
  }
  if (!response.ok) throw Error(value.error ?? "Library request failed.");
  return value;
}
