/**
 * AtlasProject handles .atlas project file format.
 * Phase 0: basic JSON serialization for nodes, edges, and states.
 */

import type { Node, Edge, WorldState } from "@atlas/kernel";
import { z } from "zod";

/**
 * .atlas project manifest structure
 */
export interface AtlasManifest {
  version: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
}

/**
 * In-memory project data structure
 */
export interface AtlasProject {
  manifest: AtlasManifest;
  nodes: Node[];
  edges: Edge[];
  states: WorldState[];
}

const ManifestSchema = z.object({
  version: z.string(),
  name: z.string(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

const NodeSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  facets: z.record(z.unknown()),
  system: z.object({
    createdAt: z.string(),
    modifiedAt: z.string(),
    createdInState: z.string(),
  }),
});

const EdgeSchema = z.object({
  id: z.string(),
  kind: z.string(),
  source: z.string(),
  target: z.string(),
  attrs: z.record(z.unknown()).optional(),
  validInStates: z.array(z.string()).optional(),
});

const PatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("node-upsert"),
    target: z.string(),
    state: z.string(),
    facet: z.string().optional(),
    payload: z.any(),
    ts: z.string(),
  }),
  z.object({
    op: z.literal("node-remove"),
    target: z.string(),
    state: z.string(),
    ts: z.string(),
  }),
  z.object({
    op: z.literal("edge-upsert"),
    target: z.string(),
    state: z.string(),
    payload: EdgeSchema,
    ts: z.string(),
  }),
  z.object({
    op: z.literal("edge-remove"),
    target: z.string(),
    state: z.string(),
    ts: z.string(),
  }),
  z.object({
    op: z.literal("node-rename"),
    target: z.string(),
    state: z.string(),
    name: z.string(),
    ts: z.string(),
  }),
  z.object({
    op: z.literal("tag-add"),
    target: z.string(),
    state: z.string(),
    tag: z.string(),
    ts: z.string(),
  }),
  z.object({
    op: z.literal("tag-remove"),
    target: z.string(),
    state: z.string(),
    tag: z.string(),
    ts: z.string(),
  }),
]);

const WorldStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  patches: z.array(PatchSchema),
});

const ProjectSchema = z.object({
  manifest: ManifestSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  states: z.array(WorldStateSchema),
});

/**
 * Serialize an AtlasProject to JSON string
 */
export function serializeProject(project: AtlasProject): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Deserialize JSON string to AtlasProject with validation
 */
export function deserializeProject(json: string): AtlasProject {
  const parsed = JSON.parse(json);
  const validated = ProjectSchema.parse(parsed);
  return validated as AtlasProject;
}

/**
 * Create a new empty project
 */
export function createEmptyProject(name: string): AtlasProject {
  const now = new Date().toISOString();
  // Generate a simple UUID-like string for Node.js compatibility
  const uuid = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  return {
    manifest: {
      version: "0.0.0",
      name,
      createdAt: now,
      modifiedAt: now,
    },
    nodes: [],
    edges: [],
    states: [
      {
        id: uuid,
        name: "Base World",
        patches: [],
      },
    ],
  };
}
