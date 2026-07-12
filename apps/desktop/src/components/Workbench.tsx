import { useState, useCallback, useEffect } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import {
  CommandBus,
  UpdateNodeFieldCommand,
  DeleteNodeCommand,
  UpdateVisualStyleCommand,
  CreateNodeCommand,
  NodeArchetypes,
  type Node,
} from "@atlas/kernel";
import { Canvas } from "./Canvas";
import { SpatialInspector } from "./SpatialInspector";
import { StateSelector } from "./StateSelector";
import { CommandBar } from "./CommandBar";
import { FileMenu } from "./FileMenu";
import { Toolbar } from "./Toolbar";
import { NodeList } from "./NodeList";
import styles from "./Workbench.module.css";

const commandBus = new CommandBus();

export function Workbench() {
  const { project, setProject, stateTree } = useAtlas();
  const [activeStateId, setActiveStateId] = useState(project.states[0]?.id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [activeTool, setActiveTool] = useState("select");

  // Load or refresh state tree when the project changes.
  if (stateTree.getAllStates().length === 0) {
    project.states.forEach((state) => stateTree.addState(state));
  }

  useEffect(() => {
    if (!project.states.some((state) => state.id === activeStateId)) {
      setActiveStateId(project.states[0]?.id);
    }
  }, [activeStateId, project.states]);

  const snapshot = activeStateId
    ? stateTree.resolve(activeStateId)
    : { nodes: new Map(), edges: new Map(), stateId: "" };

  const selectedNode = selectedNodeId ? snapshot.nodes.get(selectedNodeId) : undefined;

  const refreshProject = useCallback(() => {
    setProject({
      ...project,
      manifest: {
        ...project.manifest,
        modifiedAt: new Date().toISOString(),
      },
    });
  }, [project, setProject]);

  const handleDelete = useCallback(() => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    if (confirm(`Delete ${node.name}?`)) {      const command = new DeleteNodeCommand(stateTree, activeStateId, node);
      commandBus.execute(command);
      setProject({
        ...project,
        nodes: project.nodes.filter((n) => n.id !== selectedNodeId),
      });
      setSelectedNodeId(undefined);
      refreshProject();
    }
  }, [activeStateId, selectedNodeId, snapshot, stateTree, project, refreshProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName)
      ) {
        return;
      }

      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";
      const isRedo =
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"));

      if (isUndo) {
        e.preventDefault();
        commandBus.undo();
        refreshProject();
      }

      if (isRedo) {
        e.preventDefault();
        commandBus.redo();
        refreshProject();
      }

      if (e.key === "Delete" && selectedNodeId) {
        e.preventDefault();
        handleDelete();
      }

      if (e.key === "Escape") {
        setActiveTool("select");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandBus, handleDelete, refreshProject, selectedNodeId]);

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
        <CommandBar commandBus={commandBus} onCommandExecuted={refreshProject} />
      </div>
      <div className={styles.main}>
          <div className={styles.leftPanel}>
          <NodeList
            nodes={Array.from(snapshot.nodes.values())}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onCreateNode={() => {
              if (!activeStateId) return;
              const newNode: Node = {
                id: crypto.randomUUID(),
                kind: NodeArchetypes.SETTLEMENT,
                name: `New ${NodeArchetypes.SETTLEMENT}`,
                tags: [],
                metadata: {},
                facets: {
                  spatial: { geometry: { type: "point", point: { x: 0, y: 0 } }, layer: "default", zIndex: 0, visible: true, locked: false },
                  visual: { fill: "#ffb74d", stroke: "#f57c00", strokeWidth: 2, opacity: 1 },
                },
                system: { createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), createdInState: activeStateId },
              };
              const cmd = new CreateNodeCommand(stateTree, activeStateId, newNode);
              commandBus.execute(cmd);
              setProject({ ...project, nodes: [...project.nodes, newNode] });
              setSelectedNodeId(newNode.id);
              refreshProject();
            }}
            onDeleteNode={(nodeId) => {
              if (!activeStateId) return;
              const node = snapshot.nodes.get(nodeId);
              if (!node) return;
              const cmd = new DeleteNodeCommand(stateTree, activeStateId, node);
              commandBus.execute(cmd);
              setProject({ ...project, nodes: project.nodes.filter((n) => n.id !== nodeId) });
              if (selectedNodeId === nodeId) setSelectedNodeId(undefined);
              refreshProject();
            }}
          />
          <Toolbar
            commandBus={commandBus}
            stateTree={stateTree}
            activeStateId={activeStateId}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onRefresh={refreshProject}
          />
        </div>
        <Canvas
          snapshot={snapshot}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          commandBus={commandBus}
          stateTree={stateTree}
          activeStateId={activeStateId}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onRefresh={refreshProject}
        />
        <div className={styles.rightPanel}>
          {selectedNode ? (
            <SpatialInspector
              node={selectedNode}
              onUpdateName={handleUpdateName}
              onUpdateVisualStyle={handleUpdateVisualStyle}
              onUpdateLayer={handleUpdateLayer}
              onToggleVisible={handleToggleVisible}
              onToggleLocked={handleToggleLocked}
              onDelete={handleDelete}
            />
          ) : (
            <div style={{padding: '1rem', color: '#a0a0a0'}}>No node selected</div>
          )}
        </div>
      </div>
    </div>
  );
}
