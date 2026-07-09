/**
 * GraphStore manages nodes and edges storage.
 * Does not handle World States - that's StateTree's responsibility.
 */

import { Node, Edge, NodeId, EdgeId } from "./types.js";

export class GraphStore {
  private nodes = new Map<NodeId, Node>();
  private edges = new Map<EdgeId, Edge>();

  addNode(node: Node): void {
    this.nodes.set(node.id, node);
  }

  getNode(id: NodeId): Node | undefined {
    return this.nodes.get(id);
  }

  removeNode(id: NodeId): boolean {
    return this.nodes.delete(id);
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  addEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
  }

  getEdge(id: EdgeId): Edge | undefined {
    return this.edges.get(id);
  }

  removeEdge(id: EdgeId): boolean {
    return this.edges.delete(id);
  }

  getAllEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  clone(): GraphStore {
    const cloned = new GraphStore();
    this.nodes.forEach((node) => cloned.addNode({ ...node }));
    this.edges.forEach((edge) => cloned.addEdge({ ...edge }));
    return cloned;
  }
}
