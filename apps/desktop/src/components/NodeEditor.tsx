import { useState, useCallback } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import { NodeList } from "./NodeList";
import { Inspector } from "./Inspector";
import {
  CommandBus,
  CreateNodeCommand,
  DeleteNodeCommand,
  UpdateNodeFieldCommand,
  AddTagCommand,
  RemoveTagCommand,
  SetMetadataCommand,
  DeleteMetadataCommand,
  CreateEdgeCommand,
  DeleteEdgeCommand,
  NodeArchetypes,
  getAllConnectedEdges,
  type Node,
  type Edge,
} from "@atlas/kernel";
import styles from "./NodeEditor.module.css";

interface NodeEditorProps {
  activeStateId?: string;
  commandBus: CommandBus;
}

export function NodeEditor({ activeStateId, commandBus }: NodeEditorProps) {
  const { project, setProject, stateTree } = useAtlas();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  // Load state tree with project data
  if (stateTree.getAllStates().length === 0) {
    project.states.forEach((state) => stateTree.addState(state));
  }

  const snapshot = activeStateId
    ? stateTree.resolve(activeStateId)
    : { nodes: new Map(), edges: new Map(), stateId: "" };

  const nodes = Array.from(snapshot.nodes.values());
  const selectedNode = selectedNodeId
    ? snapshot.nodes.get(selectedNodeId)
    : undefined;

  const selectedEdges = selectedNodeId
    ? getAllConnectedEdges(snapshot, selectedNodeId)
    : [];

  // Trigger re-render after command execution
  const refreshProject = useCallback(() => {
    setProject({ ...project });
  }, [project, setProject]);

  const handleCreateNode = () => {
    if (!activeStateId) return;

    const newNode: Node = {
      id: crypto.randomUUID(),
      kind: NodeArchetypes.SETTLEMENT,
      name: "New Node",
      tags: [],
      metadata: {},
      facets: {},
      system: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdInState: activeStateId,
      },
    };

    const command = new CreateNodeCommand(stateTree, activeStateId, newNode);
    commandBus.execute(command);
    
    // Add to project nodes for persistence
    project.nodes.push(newNode);
    refreshProject();
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!activeStateId) return;

    const node = snapshot.nodes.get(nodeId);
    if (!node) return;

    const command = new DeleteNodeCommand(stateTree, activeStateId, node);
    commandBus.execute(command);

    // Remove from project nodes
    project.nodes = project.nodes.filter((n) => n.id !== nodeId);
    refreshProject();

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(undefined);
    }
  };

  const handleUpdateField = (field: string, value: unknown) => {
    if (!activeStateId || !selectedNodeId) return;

    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    const oldValue = (node as any)[field];
    const command = new UpdateNodeFieldCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      field,
      value,
      oldValue
    );
    commandBus.execute(command);
    refreshProject();
  };

  const handleAddTag = (tag: string) => {
    if (!activeStateId || !selectedNodeId) return;

    const command = new AddTagCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      tag
    );
    commandBus.execute(command);
    refreshProject();
  };

  const handleRemoveTag = (tag: string) => {
    if (!activeStateId || !selectedNodeId) return;

    const command = new RemoveTagCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      tag
    );
    commandBus.execute(command);
    refreshProject();
  };

  const handleSetMetadata = (key: string, value: unknown) => {
    if (!activeStateId || !selectedNodeId) return;

    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    const oldValue = node.metadata[key];
    const command = new SetMetadataCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      key,
      value,
      oldValue
    );
    commandBus.execute(command);
    refreshProject();
  };

  const handleDeleteMetadata = (key: string) => {
    if (!activeStateId || !selectedNodeId) return;

    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;

    const oldValue = node.metadata[key];
    const command = new DeleteMetadataCommand(
      stateTree,
      activeStateId,
      selectedNodeId,
      key,
      oldValue
    );
    commandBus.execute(command);
    refreshProject();
  };

  const handleCreateEdge = (targetId: string, kind: string) => {
    if (!activeStateId || !selectedNodeId) return;

    const newEdge: Edge = {
      id: crypto.randomUUID(),
      kind,
      source: selectedNodeId,
      target: targetId,
    };

    const command = new CreateEdgeCommand(stateTree, activeStateId, newEdge);
    commandBus.execute(command);

    // Add to project edges for persistence
    project.edges.push(newEdge);
    refreshProject();
  };

  const handleDeleteEdge = (edgeId: string) => {
    if (!activeStateId) return;

    const edge = snapshot.edges.get(edgeId);
    if (!edge) return;

    const command = new DeleteEdgeCommand(stateTree, activeStateId, edge);
    commandBus.execute(command);

    // Remove from project edges
    project.edges = project.edges.filter((e) => e.id !== edgeId);
    refreshProject();
  };

  return (
    <div className={styles.editor}>
      <NodeList
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onCreateNode={handleCreateNode}
        onDeleteNode={handleDeleteNode}
      />
      <div className={styles.inspector}>
        {selectedNode ? (
          <Inspector
            node={selectedNode}
            edges={selectedEdges}
            allNodes={nodes}
            onUpdateField={handleUpdateField}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onSetMetadata={handleSetMetadata}
            onDeleteMetadata={handleDeleteMetadata}
            onCreateEdge={handleCreateEdge}
            onDeleteEdge={handleDeleteEdge}
          />
        ) : (
          <div className={styles.emptyState}>Select a node to inspect</div>
        )}
      </div>
    </div>
  );
}
