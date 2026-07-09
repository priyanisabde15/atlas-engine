import { useState } from "react";
import type { Node } from "@atlas/kernel";
import styles from "./NodeList.module.css";

interface NodeListProps {
  nodes: Node[];
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
  onCreateNode: () => void;
  onDeleteNode: (nodeId: string) => void;
}

export function NodeList({
  nodes,
  selectedNodeId,
  onSelectNode,
  onCreateNode,
  onDeleteNode,
}: NodeListProps) {
  const [groupBy, setGroupBy] = useState<"archetype" | "none">("archetype");
  const [sortBy, setSortBy] = useState<"name" | "created">("name");
  const [filter, setFilter] = useState("");

  // Filter nodes
  const filteredNodes = nodes.filter((node) =>
    node.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Sort nodes
  const sortedNodes = [...filteredNodes].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(a.system.createdAt).getTime() - new Date(b.system.createdAt).getTime();
  });

  // Group nodes by archetype
  const groupedNodes = groupBy === "archetype"
    ? sortedNodes.reduce((acc, node) => {
        const kind = node.kind || "other";
        if (!acc[kind]) acc[kind] = [];
        acc[kind].push(node);
        return acc;
      }, {} as Record<string, Node[]>)
    : { all: sortedNodes };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Nodes</h2>
        <button className={styles.createButton} onClick={onCreateNode}>
          +
        </button>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          className={styles.filterInput}
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className={styles.select}
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as "archetype" | "none")}
        >
          <option value="none">No grouping</option>
          <option value="archetype">Group by archetype</option>
        </select>
        <select
          className={styles.select}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "created")}
        >
          <option value="name">Sort by name</option>
          <option value="created">Sort by date</option>
        </select>
      </div>

      <div className={styles.list}>
        {Object.entries(groupedNodes).map(([kind, groupNodes]) => (
          <div key={kind} className={styles.group}>
            {groupBy === "archetype" && (
              <div className={styles.groupHeader}>{kind} ({groupNodes.length})</div>
            )}
            {groupNodes.map((node) => (
              <div
                key={node.id}
                className={`${styles.nodeItem} ${
                  selectedNodeId === node.id ? styles.nodeItemSelected : ""
                }`}
                onClick={() => onSelectNode(node.id)}
              >
                <div className={styles.nodeInfo}>
                  <div className={styles.nodeName}>{node.name}</div>
                  <div className={styles.nodeKind}>{node.kind}</div>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${node.name}"?`)) {
                      onDeleteNode(node.id);
                    }
                  }}
                  title="Delete node"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
