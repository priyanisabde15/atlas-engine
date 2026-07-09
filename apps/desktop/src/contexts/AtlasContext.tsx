import { createContext, useContext } from "react";
import type { StateTree } from "@atlas/kernel";
import type { AtlasProject } from "@atlas/schema";

interface AtlasContextValue {
  project: AtlasProject;
  setProject: (project: AtlasProject) => void;
  stateTree: StateTree;
}

export const AtlasContext = createContext<AtlasContextValue | null>(null);

export function useAtlas() {
  const context = useContext(AtlasContext);
  if (!context) {
    throw new Error("useAtlas must be used within AtlasContext.Provider");
  }
  return context;
}
