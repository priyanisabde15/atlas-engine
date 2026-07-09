/**
 * FacetRegistry allows domains to register facet schemas.
 * Provides validation and type safety for node facets.
 */

import { z } from "zod";
import type { FacetKey } from "@atlas/kernel";

export interface FacetDefinition {
  key: FacetKey;
  schema: z.ZodType;
  domain: string;
  version: number;
}

export class FacetRegistry {
  private facets = new Map<FacetKey, FacetDefinition>();

  register(definition: FacetDefinition): void {
    if (this.facets.has(definition.key)) {
      throw new Error(`Facet ${definition.key} already registered`);
    }
    this.facets.set(definition.key, definition);
  }

  get(key: FacetKey): FacetDefinition | undefined {
    return this.facets.get(key);
  }

  validate(key: FacetKey, data: unknown): boolean {
    const facet = this.facets.get(key);
    if (!facet) {
      return false;
    }
    const result = facet.schema.safeParse(data);
    return result.success;
  }

  getAllFacets(): FacetDefinition[] {
    return Array.from(this.facets.values());
  }
}

// Global registry instance
export const facetRegistry = new FacetRegistry();
