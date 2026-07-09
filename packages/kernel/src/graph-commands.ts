/**
 * Graph commands for World Graph mutations.
 * All operations go through CommandBus for undo/redo.
 */

import type { Command } from "./command-bus.js";
import type { StateTree } from "./state-tree.js";
import type { Node, Edge, NodeId, StateId, Patch } from "./types.js";

/**
 * Create a new node
 */
export class CreateNodeCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private patch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    private node: Node
  ) {
    this.id = `create-node-${node.id}`;
    this.timestamp = new Date().toISOString();
    this.patch = {
      op: "node-upsert",
      target: node.id,
      state: stateId,
      payload: node,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.patch);
  }

  undo(): void {
    const removePatch: Patch = {
      op: "node-remove",
      target: this.node.id,
      state: this.stateId,
      ts: new Date().toISOString(),
    };
    this.stateTree.appendPatch(this.stateId, removePatch);
  }
}

/**
 * Delete a node
 */
export class DeleteNodeCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private removePatch: Patch;
  private restorePatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    node: Node
  ) {
    this.id = `delete-node-${node.id}`;
    this.timestamp = new Date().toISOString();
    this.removePatch = {
      op: "node-remove",
      target: node.id,
      state: stateId,
      ts: this.timestamp,
    };
    this.restorePatch = {
      op: "node-upsert",
      target: node.id,
      state: stateId,
      payload: node,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.removePatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.restorePatch);
  }
}

/**
 * Update node field
 */
export class UpdateNodeFieldCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private updatePatch: Patch;
  private revertPatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    field: string,
    newValue: unknown,
    oldValue: unknown
  ) {
    this.id = `update-node-${nodeId}-${field}`;
    this.timestamp = new Date().toISOString();
    this.updatePatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field,
      value: newValue,
      ts: this.timestamp,
    };
    this.revertPatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field,
      value: oldValue,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.updatePatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.revertPatch);
  }
}

/**
 * Add tag to node
 */
export class AddTagCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private addPatch: Patch;
  private removePatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    tag: string
  ) {
    this.id = `add-tag-${nodeId}-${tag}`;
    this.timestamp = new Date().toISOString();
    this.addPatch = {
      op: "tag-add",
      target: nodeId,
      state: stateId,
      tag,
      ts: this.timestamp,
    };
    this.removePatch = {
      op: "tag-remove",
      target: nodeId,
      state: stateId,
      tag,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.addPatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.removePatch);
  }
}

/**
 * Remove tag from node
 */
export class RemoveTagCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private removePatch: Patch;
  private addPatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    tag: string
  ) {
    this.id = `remove-tag-${nodeId}-${tag}`;
    this.timestamp = new Date().toISOString();
    this.removePatch = {
      op: "tag-remove",
      target: nodeId,
      state: stateId,
      tag,
      ts: this.timestamp,
    };
    this.addPatch = {
      op: "tag-add",
      target: nodeId,
      state: stateId,
      tag,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.removePatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.addPatch);
  }
}

/**
 * Set metadata value
 */
export class SetMetadataCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private setPatch: Patch;
  private revertPatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    key: string,
    newValue: unknown,
    oldValue: unknown | undefined
  ) {
    this.id = `set-metadata-${nodeId}-${key}`;
    this.timestamp = new Date().toISOString();
    this.setPatch = {
      op: "metadata-set",
      target: nodeId,
      state: stateId,
      key,
      value: newValue,
      ts: this.timestamp,
    };
    if (oldValue !== undefined) {
      this.revertPatch = {
        op: "metadata-set",
        target: nodeId,
        state: stateId,
        key,
        value: oldValue,
        ts: this.timestamp,
      };
    } else {
      this.revertPatch = {
        op: "metadata-delete",
        target: nodeId,
        state: stateId,
        key,
        ts: this.timestamp,
      };
    }
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.setPatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.revertPatch);
  }
}

/**
 * Delete metadata key
 */
export class DeleteMetadataCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private deletePatch: Patch;
  private restorePatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    key: string,
    oldValue: unknown
  ) {
    this.id = `delete-metadata-${nodeId}-${key}`;
    this.timestamp = new Date().toISOString();
    this.deletePatch = {
      op: "metadata-delete",
      target: nodeId,
      state: stateId,
      key,
      ts: this.timestamp,
    };
    this.restorePatch = {
      op: "metadata-set",
      target: nodeId,
      state: stateId,
      key,
      value: oldValue,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.deletePatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.restorePatch);
  }
}

/**
 * Create an edge
 */
export class CreateEdgeCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private createPatch: Patch;
  private removePatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    edge: Edge
  ) {
    this.id = `create-edge-${edge.id}`;
    this.timestamp = new Date().toISOString();
    this.createPatch = {
      op: "edge-upsert",
      target: edge.id,
      state: stateId,
      payload: edge,
      ts: this.timestamp,
    };
    this.removePatch = {
      op: "edge-remove",
      target: edge.id,
      state: stateId,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.createPatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.removePatch);
  }
}

/**
 * Delete an edge
 */
export class DeleteEdgeCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private removePatch: Patch;
  private restorePatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    edge: Edge
  ) {
    this.id = `delete-edge-${edge.id}`;
    this.timestamp = new Date().toISOString();
    this.removePatch = {
      op: "edge-remove",
      target: edge.id,
      state: stateId,
      ts: this.timestamp,
    };
    this.restorePatch = {
      op: "edge-upsert",
      target: edge.id,
      state: stateId,
      payload: edge,
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.removePatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.restorePatch);
  }
}
