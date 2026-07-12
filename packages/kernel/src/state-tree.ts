/**
 * StateTree manages World States and their inheritance chains.
 * Handles state resolution and patch materialization with LRU caching.
 */

import { WorldState, StateId, GraphSnapshot, Patch } from "./types.js";
import { GraphStore } from "./graph-store.js";
import { PatchEngine } from "./patch-engine.js";

interface CacheEntry {
  snapshot: GraphSnapshot;
  accessTime: number;
}

export class StateTree {
  private states = new Map<StateId, WorldState>();
  private cache = new Map<StateId, CacheEntry>();
  private patchEngine = new PatchEngine();
  private maxCacheSize = 10;

  addState(state: WorldState): void {
    this.states.set(state.id, state);
    this.invalidateCache(state.id);
  }

  getState(id: StateId): WorldState | undefined {
    return this.states.get(id);
  }

  removeState(id: StateId): void {
    this.states.delete(id);
    this.invalidateCache(id);
  }

  getAllStates(): WorldState[] {
    return Array.from(this.states.values());
  }

  /**
   * Append a patch to a World State.
   */
  appendPatch(stateId: StateId, patch: Patch): void {
    const state = this.states.get(stateId);
    if (!state) {
      throw new Error(`State ${stateId} not found`);
    }
    state.patches.push(patch);
    this.invalidateCache(stateId);
  }

  /**
   * Walk the inheritance chain from a state to root.
   * Returns [root, ..., target] order.
   */
  private walkParents(stateId: StateId): WorldState[] {
    const chain: WorldState[] = [];
    let current = this.states.get(stateId);

    while (current) {
      chain.unshift(current);
      if (current.parentId) {
        current = this.states.get(current.parentId);
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Resolve a World State to a materialized GraphSnapshot.
   * Uses LRU cache for performance.
   */
  resolve(stateId: StateId, baseStore?: GraphStore): GraphSnapshot {
    // Check cache
    const cached = this.cache.get(stateId);
    if (cached) {
      cached.accessTime = Date.now();
      return cached.snapshot;
    }

    // Materialize from scratch
    const chain = this.walkParents(stateId);
    const store = baseStore ? baseStore.clone() : new GraphStore();

    // Apply patches in inheritance order
    for (const state of chain) {
      this.patchEngine.applyPatches(store, state.patches);
    }

    const snapshot: GraphSnapshot = {
      stateId,
      nodes: new Map(store.getAllNodes().map((n) => [n.id, n])),
      edges: new Map(store.getAllEdges().map((e) => [e.id, e])),
    };

    // Cache with LRU eviction
    this.cache.set(stateId, {
      snapshot,
      accessTime: Date.now(),
    });
    this.evictOldestCache();

    return snapshot;
  }

  /**
   * Invalidate cache for a state and all its descendants.
   */
  private invalidateCache(stateId: StateId): void {
    this.cache.delete(stateId);
    // Also invalidate descendants
    for (const state of this.states.values()) {
      if (state.parentId === stateId) {
        this.invalidateCache(state.id);
      }
    }
  }

  /**
   * Evict oldest cache entry if cache is full.
   */
  private evictOldestCache(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    let oldestKey: StateId | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessTime < oldestTime) {
        oldestTime = entry.accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  reset(): void {
    this.states.clear();
    this.clearCache();
  }
}
