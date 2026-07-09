import { useState } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import type { Node } from "@atlas/kernel";
import styles from "./NodeEditor.module.css";

interface NodeEditorProps {
  activeStateId?: string;
}

export function NodeEditor({ activeStateId }: NodeEditorProps) {
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

  const handleCreateNode = () => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      kind: "location",
      name: "New Node",
      tags: [],
      facets: {},
      system: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdInState: activeStateId ?? "",
      },
    };

    setProject({
      ...project,
      nodes: [...project.nodes, newNode],
    });

    // Add patch to active state
    if (activeStateId) {
      stateTree.appendPatch(activeStateId, {
        op: "node-upsert",
        target: newNode.id,
        state: activeStateId,
        payload: newNode,
        ts: new Date().toISOString(),
      });
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Nodes</h2>
          <button className={styles.createButton} onClick={handleCreateNode}>
            +
          </button>
        </div>
        <div className={styles.nodeList}>
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`${styles.nodeItem} ${
                selectedNodeId === node.id ? styles.nodeItemSelected : ""
              }`}
              onClick={() => setSelectedNodeId(node.id)}
            >
              <div className={styles.nodeName}>{node.name}</div>
              <div className={styles.nodeKind}>{node.kind}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.inspector}>
        {selectedNode ? (
          <div className={styles.inspectorContent}>
            <h2 className={styles.inspectorTitle}>{selectedNode.name}</h2>
            <div className={styles.field}>
              <label className={styles.label}>ID</label>
              <div className={styles.value}>{selectedNode.id}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Kind</label>
              <div className={styles.value}>{selectedNode.kind}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <div className={styles.value}>
                {selectedNode.tags.join(", ") || "None"}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Created</label>
              <div className={styles.value}>
                {new Date(selectedNode.system.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>Select a node to inspect</div>
        )}
      </div>
    </div>
  );
}
