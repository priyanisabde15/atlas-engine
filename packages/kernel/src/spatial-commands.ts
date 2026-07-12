/**
 * Spatial commands for geometry editing in Atlas Lite
 */

import type { Command } from "./command-bus.js";
import type { StateTree } from "./state-tree.js";
import type { NodeId, StateId, Patch } from "./types.js";
import type { Geometry } from "./spatial-types.js";

/**
 * Move node geometry
 */
export class MoveNodeCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private movePatch: Patch;
  private revertPatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    dx: number,
    dy: number,
    oldGeometry: Geometry
  ) {
    this.id = `move-node-${nodeId}`;
    this.timestamp = new Date().toISOString();

    const newGeometry = translateGeometry(oldGeometry, dx, dy);

    this.movePatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field: "facets",
      value: { spatial: { geometry: newGeometry } },
      ts: this.timestamp,
    };

    this.revertPatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field: "facets",
      value: { spatial: { geometry: oldGeometry } },
      ts: this.timestamp,
    };
  }

  execute(): void {
    this.stateTree.appendPatch(this.stateId, this.movePatch);
  }

  undo(): void {
    this.stateTree.appendPatch(this.stateId, this.revertPatch);
  }
}

/**
 * Update node geometry
 */
export class UpdateGeometryCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private updatePatch: Patch;
  private revertPatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    newGeometry: Geometry,
    oldGeometry: Geometry
  ) {
    this.id = `update-geometry-${nodeId}`;
    this.timestamp = new Date().toISOString();

    this.updatePatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field: "facets",
      value: { spatial: { geometry: newGeometry } },
      ts: this.timestamp,
    };

    this.revertPatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field: "facets",
      value: { spatial: { geometry: oldGeometry } },
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
 * Update visual style
 */
export class UpdateVisualStyleCommand implements Command {
  readonly id: string;
  readonly timestamp: string;
  private updatePatch: Patch;
  private revertPatch: Patch;

  constructor(
    private stateTree: StateTree,
    private stateId: StateId,
    nodeId: NodeId,
    property: string,
    newValue: unknown,
    oldValue: unknown
  ) {
    this.id = `update-style-${nodeId}-${property}`;
    this.timestamp = new Date().toISOString();

    this.updatePatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field: "facets",
      value: { visual: { [property]: newValue } },
      ts: this.timestamp,
    };

    this.revertPatch = {
      op: "node-update-field",
      target: nodeId,
      state: stateId,
      field: "facets",
      value: { visual: { [property]: oldValue } },
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
 * Helper: Translate geometry by dx, dy
 */
function translateGeometry(geometry: Geometry, dx: number, dy: number): Geometry {
  switch (geometry.type) {
    case "point":
      return {
        type: "point",
        point: { x: geometry.point.x + dx, y: geometry.point.y + dy },
      };

    case "polygon":
      return {
        type: "polygon",
        points: geometry.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };

    case "polyline":
      return {
        type: "polyline",
        points: geometry.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };

    case "circle":
      return {
        type: "circle",
        center: { x: geometry.center.x + dx, y: geometry.center.y + dy },
        radius: geometry.radius,
      };

    case "rect":
      return {
        type: "rect",
        x: geometry.x + dx,
        y: geometry.y + dy,
        width: geometry.width,
        height: geometry.height,
      };
  }
}
