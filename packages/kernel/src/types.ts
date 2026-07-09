/**
 * Core kernel types for Atlas Engine.
 * Implements the World Graph design from Architecture V2.
 */

export type NodeId = string; // UUIDv7
export type EdgeId = string; // UUIDv7
export type StateId = string; // UUIDv7
export type FacetKey = string;
export type NodeKind = string;
export type EdgeKind = string;

/**
 * Standard node archetypes (extensible)
 */
export const NodeArchetypes = {
  WORLD: "world",
  ISLAND: "island",
  SETTLEMENT: "settlement",
  DISTRICT: "district",
  LANDMARK: "landmark",
  CHARACTER: "character",
  ARTIFACT: "artifact",
  ORGANIZATION: "organization",
  BIOME: "biome",
  ROUTE: "route",
  BOOK: "book",
  CHAPTER: "chapter",
  SCENE: "scene",
} as const;

/**
 * Node — identity + kind + universal metadata
 */
export interface Node {
  id: NodeId;
  kind: NodeKind;
  name: string;
  displayName?: string; // Optional display name override
  description?: string; // Rich text description
  tags: string[];
  metadata: Record<string, unknown>; // Custom metadata
  facets: Record<FacetKey, unknown>;
  system: {
    createdAt: string; // ISO timestamp
    modifiedAt: string;
    createdInState: StateId;
  };
}

/**
 * Edge — typed directed (or undirected) relationship
 */
export interface Edge {
  id: EdgeId;
  kind: EdgeKind;
  source: NodeId;
  target: NodeId;
  attrs?: Record<string, unknown>;
  validInStates?: StateId[];
}

/**
 * Patch operations for World State mutations
 */
export type Patch =
  | { op: "node-upsert"; target: NodeId; state: StateId; facet?: FacetKey; payload: Partial<Node>; ts: string }
  | { op: "node-remove"; target: NodeId; state: StateId; ts: string }
  | { op: "edge-upsert"; target: EdgeId; state: StateId; payload: Edge; ts: string }
  | { op: "edge-remove"; target: EdgeId; state: StateId; ts: string }
  | { op: "node-rename"; target: NodeId; state: StateId; name: string; ts: string }
  | { op: "node-update-field"; target: NodeId; state: StateId; field: string; value: unknown; ts: string }
  | { op: "tag-add"; target: NodeId; state: StateId; tag: string; ts: string }
  | { op: "tag-remove"; target: NodeId; state: StateId; tag: string; ts: string }
  | { op: "metadata-set"; target: NodeId; state: StateId; key: string; value: unknown; ts: string }
  | { op: "metadata-delete"; target: NodeId; state: StateId; key: string; ts: string };

/**
 * WorldState — inheritance chain with patches
 */
export interface WorldState {
  id: StateId;
  name: string;
  parentId?: StateId;
  patches: Patch[];
}

/**
 * GraphSnapshot — materialized read-only view
 */
export interface GraphSnapshot {
  stateId: StateId;
  nodes: Map<NodeId, Node>;
  edges: Map<EdgeId, Edge>;
}
