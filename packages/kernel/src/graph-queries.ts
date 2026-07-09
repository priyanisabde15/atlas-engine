/**
 * Graph query utilities for relationship traversal.
 * Phase 1: Basic relationship queries.
 */

import type { GraphSnapshot, NodeId, EdgeKind, Edge, Node } from "./types.js";

/**
 * Find all edges where the node is the source
 */
export function getOutgoingEdges(
  snapshot: GraphSnapshot,
  nodeId: NodeId
): Edge[] {
  return Array.from(snapshot.edges.values()).filter(
    (edge) => edge.source === nodeId
  );
}

/**
 * Find all edges where the node is the target
 */
export function getIncomingEdges(
  snapshot: GraphSnapshot,
  nodeId: NodeId
): Edge[] {
  return Array.from(snapshot.edges.values()).filter(
    (edge) => edge.target === nodeId
  );
}

/**
 * Find all edges connected to a node (incoming or outgoing)
 */
export function getAllConnectedEdges(
  snapshot: GraphSnapshot,
  nodeId: NodeId
): Edge[] {
  return Array.from(snapshot.edges.values()).filter(
    (edge) => edge.source === nodeId || edge.target === nodeId
  );
}

/**
 * Find edges of a specific kind from a node
 */
export function getEdgesByKind(
  snapshot: GraphSnapshot,
  nodeId: NodeId,
  kind: EdgeKind
): Edge[] {
  return getOutgoingEdges(snapshot, nodeId).filter(
    (edge) => edge.kind === kind
  );
}

/**
 * Get all nodes connected to a node via outgoing edges
 */
export function getConnectedNodes(
  snapshot: GraphSnapshot,
  nodeId: NodeId
): Node[] {
  const edges = getOutgoingEdges(snapshot, nodeId);
  return edges
    .map((edge) => snapshot.nodes.get(edge.target))
    .filter((node): node is Node => node !== undefined);
}

/**
 * Get all nodes connected via a specific edge kind
 */
export function getConnectedNodesByKind(
  snapshot: GraphSnapshot,
  nodeId: NodeId,
  kind: EdgeKind
): Node[] {
  const edges = getEdgesByKind(snapshot, nodeId, kind);
  return edges
    .map((edge) => snapshot.nodes.get(edge.target))
    .filter((node): node is Node => node !== undefined);
}

/**
 * Check if an edge exists between two nodes
 */
export function hasEdge(
  snapshot: GraphSnapshot,
  sourceId: NodeId,
  targetId: NodeId,
  kind?: EdgeKind
): boolean {
  return Array.from(snapshot.edges.values()).some(
    (edge) =>
      edge.source === sourceId &&
      edge.target === targetId &&
      (kind === undefined || edge.kind === kind)
  );
}
