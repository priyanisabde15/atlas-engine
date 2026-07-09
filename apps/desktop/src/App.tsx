import { useState } from "react";
import { Workbench } from "./components/Workbench";
import { AtlasContext } from "./contexts/AtlasContext";
import { StateTree } from "@atlas/kernel";
import { createEmptyProject, type AtlasProject } from "@atlas/schema";

export function App() {
  const [project, setProject] = useState<AtlasProject>(() =>
    createEmptyProject("Untitled Project")
  );
  const [stateTree] = useState(() => new StateTree());

  return (
    <AtlasContext.Provider value={{ project, setProject, stateTree }}>
      <Workbench />
    </AtlasContext.Provider>
  );
}
