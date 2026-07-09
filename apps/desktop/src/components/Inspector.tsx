import { useState } from "react";
import type { Node, Edge } from "@atlas/kernel";
import { NodeArchetypes } from "@atlas/kernel";
import styles from "./Inspector.module.css";

interface InspectorProps {
  node: Node;
  edges: Edge[];
  allNodes: Node[];
  onUpdateField: (field: string, value: unknown) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSetMetadata: (key: string, value: unknown) => void;
  onDeleteMetadata: (key: string) => void;
  onCreateEdge: (targetId: string, kind: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export function Inspector({
  node,
  edges,
  allNodes,
  onUpdateField,
  onAddTag,
  onRemoveTag,
  onSetMetadata,
  onDeleteMetadata,
  onCreateEdge,
  onDeleteEdge,
}: InspectorProps) {
  const [newTag, setNewTag] = useState("");
  const [newMetaKey, setNewMetaKey] = useState("");
  const [newMetaValue, setNewMetaValue] = useState("");
  const [newEdgeTarget, setNewEdgeTarget] = useState("");
  const [newEdgeKind, setNewEdgeKind] = useState("located_on");

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag("");
    }
  };

  const handleAddMetadata = () => {
    if (newMetaKey.trim()) {
      onSetMetadata(newMetaKey.trim(), newMetaValue);
      setNewMetaKey("");
      setNewMetaValue("");
    }
  };

  const handleCreateEdge = () => {
    if (newEdgeTarget) {
      onCreateEdge(newEdgeTarget, newEdgeKind);
      setNewEdgeTarget("");
    }
  };

  return (
    <div className={styles.inspector}>
      <h2 className={styles.title}>{node.displayName || node.name}</h2>

      {/* Basic Fields */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Information</h3>
        
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            type="text"
            className={styles.input}
            value={node.name}
            onChange={(e) => onUpdateField("name", e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Display Name</label>
          <input
            type="text"
            className={styles.input}
            value={node.displayName || ""}
            onChange={(e) => onUpdateField("displayName", e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Archetype</label>
          <select
            className={styles.select}
            value={node.kind}
            onChange={(e) => onUpdateField("kind", e.target.value)}
          >
            {Object.entries(NodeArchetypes).map(([key, value]) => (
              <option key={value} value={value}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={node.description || ""}
            onChange={(e) => onUpdateField("description", e.target.value)}
            placeholder="Enter description..."
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>ID</label>
          <div className={styles.value}>{node.id}</div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Created</label>
          <div className={styles.value}>
            {new Date(node.system.createdAt).toLocaleString()}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Modified</label>
          <div className={styles.value}>
            {new Date(node.system.modifiedAt).toLocaleString()}
          </div>
        </div>
      </section>

      {/* Tags */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tags</h3>
        <div className={styles.tags}>
          {node.tags.map((tag) => (
            <div key={tag} className={styles.tag}>
              {tag}
              <button
                className={styles.tagRemove}
                onClick={() => onRemoveTag(tag)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.input}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="Add tag..."
          />
          <button className={styles.addButton} onClick={handleAddTag}>
            Add
          </button>
        </div>
      </section>

      {/* Metadata */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Metadata</h3>
        <div className={styles.metadata}>
          {Object.entries(node.metadata).map(([key, value]) => (
            <div key={key} className={styles.metaItem}>
              <div className={styles.metaKey}>{key}</div>
              <div className={styles.metaValue}>
                {JSON.stringify(value)}
              </div>
              <button
                className={styles.metaDelete}
                onClick={() => onDeleteMetadata(key)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.input}
            value={newMetaKey}
            onChange={(e) => setNewMetaKey(e.target.value)}
            placeholder="Key"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            className={styles.input}
            value={newMetaValue}
            onChange={(e) => setNewMetaValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMetadata()}
            placeholder="Value"
            style={{ flex: 2 }}
          />
          <button className={styles.addButton} onClick={handleAddMetadata}>
            Add
          </button>
        </div>
      </section>

      {/* Relationships */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Relationships</h3>
        <div className={styles.relationships}>
          {edges.map((edge) => {
            const isOutgoing = edge.source === node.id;
            const otherNodeId = isOutgoing ? edge.target : edge.source;
            const otherNode = allNodes.find((n) => n.id === otherNodeId);
            return (
              <div key={edge.id} className={styles.relationship}>
                <div className={styles.relInfo}>
                  <div className={styles.relKind}>
                    {isOutgoing ? "→" : "←"} {edge.kind}
                  </div>
                  <div className={styles.relNode}>
                    {otherNode?.name || otherNodeId}
                  </div>
                </div>
                <button
                  className={styles.relDelete}
                  onClick={() => onDeleteEdge(edge.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <div className={styles.addRow}>
          <select
            className={styles.select}
            value={newEdgeTarget}
            onChange={(e) => setNewEdgeTarget(e.target.value)}
          >
            <option value="">Select target...</option>
            {allNodes
              .filter((n) => n.id !== node.id)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
          </select>
          <input
            type="text"
            className={styles.input}
            value={newEdgeKind}
            onChange={(e) => setNewEdgeKind(e.target.value)}
            placeholder="Relationship type"
            style={{ flex: 1 }}
          />
          <button className={styles.addButton} onClick={handleCreateEdge}>
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
