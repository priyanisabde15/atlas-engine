/**
 * Schema migrations for .atlas project files.
 * Phase 0: basic migration framework with unknown field preservation.
 */

import type { AtlasProject } from "./atlas-project.js";

export interface Migration {
  from: string;
  to: string;
  migrate(data: unknown): unknown;
}

export class MigrationEngine {
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    this.migrations.push(migration);
  }

  /**
   * Find migration path from one version to another
   */
  private findMigrationPath(from: string, to: string): Migration[] {
    // For Phase 0, simple direct migration lookup
    // Future: implement graph-based path finding for multi-hop migrations
    const direct = this.migrations.find(
      (m) => m.from === from && m.to === to
    );
    return direct ? [direct] : [];
  }

  /**
   * Migrate project data from one version to another
   */
  migrate(data: unknown, from: string, to: string): AtlasProject {
    if (from === to) {
      return data as AtlasProject;
    }

    const path = this.findMigrationPath(from, to);
    if (path.length === 0) {
      throw new Error(`No migration path from ${from} to ${to}`);
    }

    let result = data;
    for (const migration of path) {
      result = migration.migrate(result);
    }

    return result as AtlasProject;
  }
}

// Global migration engine instance
export const migrationEngine = new MigrationEngine();
