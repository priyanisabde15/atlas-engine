/**
 * PatchEngine applies patches to GraphStore.
 * Implements patch application logic for World State materialization.
 */

import { Patch, Node } from "./types.js";
import { GraphStore } from "./graph-store.js";

export class PatchEngine {
  /**
   * Apply a single patch to a GraphStore.
   * Mutates the store in place.
   */
  applyPatch(store: GraphStore, patch: Patch): void {
    switch (patch.op) {
      case "node-upsert": {
        const existing = store.getNode(patch.target);
        if (existing) {
          // Merge payload into existing node
          const updated: Node = {
            ...existing,
            ...patch.payload,
            system: {
              ...existing.system,
              ...patch.payload.system,
              modifiedAt: patch.ts,
            },
          };
          if (patch.facet && patch.payload.facets) {
            updated.facets = {
              ...existing.facets,
              [patch.facet]: patch.payload.facets[patch.facet],
            };
          }
          store.addNode(updated);
        } else {
          // Create new node
          const newNode: Node = {
            id: patch.target,
            kind: (patch.payload.kind as string) ?? "unknown",
            name: patch.payload.name ?? "",
            displayName: patch.payload.displayName,
            description: patch.payload.description,
            tags: patch.payload.tags ?? [],
            metadata: patch.payload.metadata ?? {},
            facets: patch.payload.facets ?? {},
            system: {
              createdAt: patch.ts,
              modifiedAt: patch.ts,
              createdInState: patch.state,
              ...patch.payload.system,
            },
          };
          store.addNode(newNode);
        }
        break;
      }

      case "node-remove": {
        store.removeNode(patch.target);
        break;
      }

      case "edge-upsert": {
        store.addEdge(patch.payload);
        break;
      }

      case "edge-remove": {
        store.removeEdge(patch.target);
        break;
      }

      case "node-rename": {
        const node = store.getNode(patch.target);
        if (node) {
          store.addNode({
            ...node,
            name: patch.name,
            system: {
              ...node.system,
              modifiedAt: patch.ts,
            },
          });
        }
        break;
      }

      case "node-update-field": {
        const node = store.getNode(patch.target);
        if (node) {
          store.addNode({
            ...node,
            [patch.field]: patch.value,
            system: {
              ...node.system,
              modifiedAt: patch.ts,
            },
          });
        }
        break;
      }

      case "tag-add": {
        const node = store.getNode(patch.target);
        if (node && !node.tags.includes(patch.tag)) {
          store.addNode({
            ...node,
            tags: [...node.tags, patch.tag],
            system: {
              ...node.system,
              modifiedAt: patch.ts,
            },
          });
        }
        break;
      }

      case "tag-remove": {
        const node = store.getNode(patch.target);
        if (node) {
          store.addNode({
            ...node,
            tags: node.tags.filter((t) => t !== patch.tag),
            system: {
              ...node.system,
              modifiedAt: patch.ts,
            },
          });
        }
        break;
      }

      case "metadata-set": {
        const node = store.getNode(patch.target);
        if (node) {
          store.addNode({
            ...node,
            metadata: {
              ...node.metadata,
              [patch.key]: patch.value,
            },
            system: {
              ...node.system,
              modifiedAt: patch.ts,
            },
          });
        }
        break;
      }

      case "metadata-delete": {
        const node = store.getNode(patch.target);
        if (node) {
          const { [patch.key]: _, ...rest } = node.metadata;
          store.addNode({
            ...node,
            metadata: rest,
            system: {
              ...node.system,
              modifiedAt: patch.ts,
            },
          });
        }
        break;
      }
    }
  }

  /**
   * Apply multiple patches in order to a GraphStore.
   */
  applyPatches(store: GraphStore, patches: Patch[]): void {
    for (const patch of patches) {
      this.applyPatch(store, patch);
    }
  }
}
