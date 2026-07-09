/**
 * Hook to call Tauri backend commands for file I/O.
 */

// @ts-expect-error - Tauri injected at runtime
const invoke = window.__TAURI__?.core?.invoke;

export function useTauriCommands() {
  const saveProject = async (path: string, content: string): Promise<void> => {
    if (!invoke) {
      // Fallback for development without Tauri
      console.log("Save project (dev mode):", path);
      return;
    }
    await invoke("save_project", { path, content });
  };

  const loadProject = async (path: string): Promise<string> => {
    if (!invoke) {
      // Fallback for development without Tauri
      console.log("Load project (dev mode):", path);
      return JSON.stringify({ manifest: {}, nodes: [], edges: [], states: [] });
    }
    return await invoke("load_project", { path });
  };

  return { saveProject, loadProject };
}
