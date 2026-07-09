import { useAtlas } from "../contexts/AtlasContext";
import { useTauriCommands } from "../hooks/useTauriCommands";
import { serializeProject, deserializeProject } from "@atlas/schema";
import styles from "./FileMenu.module.css";

export function FileMenu() {
  const { project, setProject } = useAtlas();
  const { saveProject, loadProject } = useTauriCommands();

  const handleSave = async () => {
    const path = "project.atlas"; // TODO: File dialog
    const json = serializeProject(project);
    await saveProject(path, json);
    alert("Project saved!");
  };

  const handleLoad = async () => {
    const path = "project.atlas"; // TODO: File dialog
    try {
      const json = await loadProject(path);
      const loaded = deserializeProject(json);
      setProject(loaded);
      alert("Project loaded!");
    } catch (e) {
      alert(`Failed to load: ${e}`);
    }
  };

  return (
    <div className={styles.fileMenu}>
      <button className={styles.button} onClick={handleSave}>
        Save
      </button>
      <button className={styles.button} onClick={handleLoad}>
        Load
      </button>
    </div>
  );
}
