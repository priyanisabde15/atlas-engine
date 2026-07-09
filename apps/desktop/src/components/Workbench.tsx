import { useState, useCallback } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import {
  CommandBus,
  UpdateNodeFieldCommand,
  DeleteNodeCommand,
  UpdateVisualStyleCommand,
} from "@atlas/kernel";
import { Canvas } from "./Canvas";
import { SpatialInspector } from "./SpatialInspector";
import { StateSelector } from "./StateSelector";
import { CommandBar } from "./CommandBar";
import { FileMenu } from "./FileMenu";
import { Toolbar } from "./Toolbar";
import styles from "./Workbench.module.css";

const commandBus = new CommandBus();

export function Workbench() {
  const { project, setProject, stateTree } = useAtlas();
  const [activeStateId, setActiveStateId] = useState(project.states[0]?.id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [activeTool, setActiveTool] = useState("select");

  // Load state tree with project data
  if (stateTree.getAllStates().length === 0) {
    project.states.forEach((state) => stateTree.addState(state));
  }

  const snapshot = activeStateId
    ? stateTree.resolve(activeStateId)
    : { nodes: new Map(), edges: new Map(), stateId: "" };

  const selectedNode = selectedNodeId ? snapshot.nodes.get(selectedNodeId) : undefined;

  const refreshProject = useCallback(() => {
    setProject({ ...project });
  }, [project, setProject]);

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!activeStateId || !selectedNodeId) return;
      const node = snapshot.nodes.get(selectedNodeId);
      if (!node) return;

      const command = new UpdateNodeFieldCommand(
        stateTree,
        activeStateId,
        selectedNodeId,
        "name",
        name,
        node.name
      );
      commandBus.execute(command);
      refreshProject();
    },
    [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]
  );

  const handleUpdateVisualStyle = useCallback(
    (property: string, value: any) => {
      if (!activeStateId || !selectedNodeId) return;
      const node = snapshot.nodes.get(selectedNodeId);
      if (!node) return;

      const visual = node.facets.visual as any;
      const oldValue = visual?.[property];

      const command = new UpdateVisualStyleCommand(
        stateTree,
        activeStateId,
        selectedNodeId,
        property,
        value,
        oldValue
      );
      commandBus.execute(command);
      refreshProject();
    },
    [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]
  );

  const handleUpdateLayer = useCallback(
    (layer: string) => {
      if (!activeStateId || !selectedNodeId) return;
      const node = snapshot.nodes.get(selectedNodeId);
      if (!node) return;

      const spatial = node.facets.spatial as any;
      const command = new UpdateNodeFieldCommand(
        stateTree,
        activeStateId,
        selectedNodeId,
        "facets",
        { spatial: { ...spatial, layer } },
        node.facets
      );
      commandBus.execute(command);
      refreshProject();
    },
    [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]
  );

  const handleToggleVisible = useCallback(() => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    const spatial = node.facets.spatial as any;
    const command = new UpdateNodeFieldCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      "facets",
      { spatial: { ...spatial, visible: !spatial.visible } },
      node.facets
    );
    commandBus.execute(command);
    refreshProject();
  }, [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]);

  const handleToggleLocked = useCallback(() => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    const spatial = node.facets.spatial as any;
    const command = new UpdateNodeFieldCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      "facets",
      { spatial: { ...spatial, locked: !spatial.locked } },
      node.facets
    );
    commandBus.execute(command);
    refreshProject();
  }, [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]);

  const handleDelete = useCallback(() => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    if (confirm(`Delete ${node.name}?`)) {
      const command = new DeleteNodeCommand(stateTree, activeStateId, node);
      commandBus.execute(command);
      project.nodes = project.nodes.filter((n) => n.id !== selectedNodeId);
      setSelectedNodeId(undefined);
      refreshProject();
    }
  }, [activeStateId, selectedNodeId, snapshot, stateTree, project, refreshProject]);

  return (
    <div className={styles.workbench}>
      <div className={styles.header}>
        <h1 className={styles.title}>Atlas Lite</h1>
        <FileMenu />
        <StateSelector
          states={project.states}
          activeStateId={activeStateId}
          onSelectState={setActiveStateId}
        />
        <CommandBar commandBus={commandBus} />
      </div>
      <div className={styles.main}>
        <Toolbar
          commandBus={commandBus}
          stateTree={stateTree}
          activeStateId={activeStateId}
          onToolChange={setActiveTool}
          onRefresh={refreshProject}
        />
        <Canvas
          snapshot={snapshot}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          commandBus={commandBus}
          stateTree={stateTree}
          activeStateId={activeStateId}
          activeTool={activeTool}
        />
        {selectedNode && (
          <div className={styles.rightPanel}>
            <SpatialInspector
              node={selectedNode}
              onUpdateName={handleUpdateName}
              onUpdateVisualStyle={handleUpdateVisualStyle}
              onUpdateLayer={handleUpdateLayer}
              onToggleVisible={handleToggleVisible}
              onToggleLocked={handleToggleLocked}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
