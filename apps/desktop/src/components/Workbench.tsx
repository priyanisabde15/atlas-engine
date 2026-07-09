import { useState } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import { NodeEditor } from "./NodeEditor";
import { StateSelector } from "./StateSelector";
import { CommandBar } from "./CommandBar";
import { FileMenu } from "./FileMenu";
import styles from "./Workbench.module.css";

export function Workbench() {
  const { project } = useAtlas();
  const [activeStateId, setActiveStateId] = useState(project.states[0]?.id);

  return (
    <div className={styles.workbench}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Atlas Engine</h1>
        <FileMenu />
        <StateSelector
          states={project.states}
          activeStateId={activeStateId}
          onSelectState={setActiveStateId}
        />
        <CommandBar />
      </div>
      <div className={styles.content}>
        <NodeEditor activeStateId={activeStateId} />
      </div>
    </div>
  );
}
