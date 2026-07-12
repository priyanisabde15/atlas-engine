import { useAtlas } from "../contexts/AtlasContext";
import type { CommandBus, StateTree, StateId, Node } from "@atlas/kernel";
import { NodeArchetypes, CreateNodeCommand } from "@atlas/kernel";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  commandBus: CommandBus;
  stateTree: StateTree;
  activeStateId?: StateId;
  activeTool: string;
  onToolChange: (tool: string) => void;
  onRefresh: () => void;
}

export function Toolbar({ commandBus, stateTree, activeStateId, activeTool, onToolChange, onRefresh }: ToolbarProps) {
  const { project, setProject } = useAtlas();

  const createObject = (archetype: string, geometry: any) => {
    if (!activeStateId) return;

    const newNode: Node = {
      id: crypto.randomUUID(),
      kind: archetype,
      name: `New ${archetype}`,
      tags: [],
      metadata: {},
      facets: {
        spatial: {
          geometry,
          layer: "default",
          zIndex: 0,
          visible: true,
          locked: false,
        },
        visual: getDefaultStyle(archetype),
      },
      system: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdInState: activeStateId,
      },
    };

    const command = new CreateNodeCommand(stateTree, activeStateId, newNode);
    commandBus.execute(command);
    setProject({
      ...project,
      nodes: [...project.nodes, newNode],
    });
    onRefresh?.();
    onToolChange?.("select");
  };

  const getDefaultStyle = (archetype: string) => {
    switch (archetype) {
      case NodeArchetypes.ISLAND:
        return { fill: "#90caf9", stroke: "#1976d2", strokeWidth: 3, opacity: 0.8 };
      case NodeArchetypes.SETTLEMENT:
        return { fill: "#ffb74d", stroke: "#f57c00", strokeWidth: 2, opacity: 1 };
      case "forest":
        return { fill: "#66bb6a", stroke: "#388e3c", strokeWidth: 1, opacity: 0.7 };
      case "river":
        return { fill: "none", stroke: "#42a5f5", strokeWidth: 4, opacity: 1 };
      case "mountain":
        return { fill: "#8d6e63", stroke: "#5d4037", strokeWidth: 2, opacity: 1 };
      case "lake":
        return { fill: "#64b5f6", stroke: "#1976d2", strokeWidth: 2, opacity: 0.8 };
      default:
        return { fill: "#90caf9", stroke: "#1976d2", strokeWidth: 2, opacity: 1 };
    }
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Tools</div>
        <button
         className={`${styles.toolButton} ${activeTool === "select" ? styles.activeTool : ""}`}
         onClick={() => onToolChange("select")}
          >
         ⬜ Select
          </button>
          <button
         className={`${styles.toolButton} ${activeTool === "draw-polygon" ? styles.activeTool : ""}`}
         onClick={() => onToolChange("draw-polygon")}
          >
         ⬟ Draw Island
          </button>
          <button
         className={`${styles.toolButton} ${activeTool === "draw-polyline" ? styles.activeTool : ""}`}
         onClick={() => onToolChange("draw-polyline")}
          >
         〰️ Draw Path
          </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quick Add</div>
        <button
          className={styles.toolButton}
          onClick={() => createObject(NodeArchetypes.SETTLEMENT, { type: "point", point: { x: 0, y: 0 } })}
        >
          🏘️ Settlement
        </button>
        <button
          className={styles.toolButton}
          onClick={() => createObject(NodeArchetypes.LANDMARK, { type: "point", point: { x: 0, y: 0 } })}
        >
          ⭐ Landmark
        </button>
        <button
          className={styles.toolButton}
          onClick={() => createObject("mountain", { type: "point", point: { x: 0, y: 0 } })}
        >
          ⛰️ Mountain
        </button>
        <button
          className={styles.toolButton}
          onClick={() => createObject("temple", { type: "point", point: { x: 0, y: 0 } })}
        >
          ⛩️ Temple
        </button>
        <button
          className={styles.toolButton}
          onClick={() => createObject("volcano", { type: "point", point: { x: 0, y: 0 } })}
        >
          🌋 Volcano
        </button>
        <button
          className={styles.toolButton}
          onClick={() => createObject("harbour", { type: "point", point: { x: 0, y: 0 } })}
        >
          ⚓ Harbour
        </button>
        <button
          className={styles.toolButton}
          onClick={() => createObject("ruins", { type: "point", point: { x: 0, y: 0 } })}
        >
          🏛️ Ruins
        </button>
      </div>
    </div>
  );
}
