import { useState, useCallback, useEffect, useRef } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import {
  CommandBus,
  UpdateNodeFieldCommand,
  DeleteNodeCommand,
  type Node,
  type GraphSnapshot,
} from "@atlas/kernel";
import { serializeProject, deserializeProject, createEmptyProject } from "@atlas/schema";
import { Canvas } from "./Canvas";
import { getKindIcon } from "./MapSymbols";
import { useTauriCommands } from "../hooks/useTauriCommands";

const commandBus = new CommandBus();

/* ═══════════════════════════════════════════════════════════
   Tool definitions
   ═══════════════════════════════════════════════════════════ */

interface ToolDef {
  id: string;
  label: string;
  icon: string;
  hint: string;
}

const CREATE_TOOLS: ToolDef[] = [
  { id: "island", label: "Island", icon: "🏝️", hint: "Click 4–12 rough boundary points. Press V, Enter, or double-click to generate the coastline. Esc to cancel." },
  { id: "forest", label: "Forest", icon: "🌲", hint: "Click to define a forest region boundary. Press V, Enter, or double-click to fill with trees. Esc to cancel." },
  { id: "mountains", label: "Mountains", icon: "⛰️", hint: "Click to define a mountain region boundary. Press V, Enter, or double-click to place peaks. Esc to cancel." },
  { id: "river", label: "River", icon: "〰️", hint: "Click points along the river path. Press V, Enter, or double-click to finish. Esc to cancel." },
  { id: "road", label: "Road", icon: "━━", hint: "Click points along the road path. Press V, Enter, or double-click to finish. Esc to cancel." },
];

const STAMP_TOOLS: ToolDef[] = [
  { id: "stamp-village", label: "Village", icon: "🏘️", hint: "Click the map to place a village." },
  { id: "stamp-town", label: "Town", icon: "🏠", hint: "Click the map to place a town." },
  { id: "stamp-city", label: "City", icon: "🏰", hint: "Click the map to place a city." },
  { id: "stamp-fort", label: "Fort", icon: "🏰", hint: "Click the map to place a fort." },
  { id: "stamp-castle", label: "Castle", icon: "🏯", hint: "Click the map to place a castle." },
  { id: "stamp-temple", label: "Temple", icon: "⛩️", hint: "Click the map to place a temple." },
  { id: "stamp-harbour", label: "Harbour", icon: "⚓", hint: "Click the map to place a harbour." },
  { id: "stamp-ruins", label: "Ruins", icon: "🏛️", hint: "Click the map to place ruins." },
  { id: "stamp-monument", label: "Monument", icon: "🗿", hint: "Click the map to place a monument." },
  { id: "stamp-bridge", label: "Bridge", icon: "🌉", hint: "Click the map to place a bridge." },
  { id: "stamp-volcano", label: "Volcano", icon: "🌋", hint: "Click the map to place a volcano." },
  { id: "stamp-waterfall", label: "Waterfall", icon: "💧", hint: "Click the map to place a waterfall." },
];

const ANNOTATE_TOOLS: ToolDef[] = [
  { id: "label", label: "Label", icon: "🏷️", hint: "Click the map to add a text label." },
];

const EDIT_TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: "⬜", hint: "Click objects to select. Drag to move. Delete key to remove." },
];

const ALL_TOOLS = [...EDIT_TOOLS, ...CREATE_TOOLS, ...STAMP_TOOLS, ...ANNOTATE_TOOLS];

function getToolHint(toolId: string): string {
  const tool = ALL_TOOLS.find(t => t.id === toolId);
  return tool?.hint ?? "";
}

/* ═══════════════════════════════════════════════════════════
   Workbench Component
   ═══════════════════════════════════════════════════════════ */

export function Workbench() {
  const { project, setProject, stateTree } = useAtlas();
  const [activeStateId, setActiveStateId] = useState(project.states[0]?.id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [activeTool, setActiveTool] = useState("select");
  const [objectFilter, setObjectFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveProject, loadProject } = useTauriCommands();


  // Load state tree on mount
  if (stateTree.getAllStates().length === 0) {
    project.states.forEach((state) => stateTree.addState(state));
  }

  useEffect(() => {
    if (!project.states.some((state) => state.id === activeStateId)) {
      setActiveStateId(project.states[0]?.id);
    }
  }, [activeStateId, project.states]);

  const snapshot: GraphSnapshot = activeStateId
    ? stateTree.resolve(activeStateId)
    : { nodes: new Map(), edges: new Map(), stateId: "" };

  const selectedNode = selectedNodeId ? snapshot.nodes.get(selectedNodeId) : undefined;

  const refreshProject = useCallback(() => {
    setProject({
      ...project,
      manifest: { ...project.manifest, modifiedAt: new Date().toISOString() },
    });
  }, [project, setProject]);

  /* ── File operations ─────────────────────── */
  const handleNew = useCallback(() => {
    const name = prompt("Project name:", "Untitled Map") || "Untitled Map";
    const newProject = createEmptyProject(name);
    stateTree.reset();
    newProject.states.forEach(s => stateTree.addState(s));
    setProject(newProject);
    setActiveStateId(newProject.states[0]?.id);
    setSelectedNodeId(undefined);
    commandBus.clear();
  }, [setProject, stateTree]);

  const handleSave = useCallback(async () => {
    const savedProject = {
      ...project,
      states: stateTree.getAllStates(),
      manifest: { ...project.manifest, modifiedAt: new Date().toISOString() },
    };
    const json = serializeProject(savedProject);
    
    if ((window as any).__TAURI__) {
      try {
        await saveProject("project.atlas", json);
        alert("Project saved to project.atlas!");
      } catch (err) {
        alert(`Failed to save project: ${err}`);
      }
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.manifest.name.replace(/\s+/g, "_")}.atlas`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [project, stateTree, saveProject]);

  const handleLoad = useCallback(async () => {
    if ((window as any).__TAURI__) {
      try {
        const json = await loadProject("project.atlas");
        const loaded = deserializeProject(json);
        stateTree.reset();
        loaded.states.forEach(s => stateTree.addState(s));
        setProject(loaded);
        setActiveStateId(loaded.states[0]?.id);
        setSelectedNodeId(undefined);
        commandBus.clear();
        alert("Project loaded from project.atlas!");
      } catch (err) {
        alert(`Failed to load project: ${err}`);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [setProject, stateTree, loadProject]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const loaded = deserializeProject(json);
        stateTree.reset();
        loaded.states.forEach(s => stateTree.addState(s));
        setProject(loaded);
        setActiveStateId(loaded.states[0]?.id);
        setSelectedNodeId(undefined);
        commandBus.clear();
      } catch (err) {
        alert(`Failed to load project: ${err}`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  }, [setProject, stateTree]);

  /* ── Delete ─────────────────────────────── */
  const handleDelete = useCallback(() => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;
    const command = new DeleteNodeCommand(stateTree, activeStateId, node);
    commandBus.execute(command);
    setSelectedNodeId(undefined);
    refreshProject();
  }, [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]);

  /* ── Inspector callbacks ────────────────── */
  const handleUpdateName = useCallback((name: string) => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;
    const cmd = new UpdateNodeFieldCommand(stateTree, activeStateId, selectedNodeId, "name", name, node.name);
    commandBus.execute(cmd);
    refreshProject();
  }, [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]);

  const handleUpdateField = useCallback((field: string, value: unknown, oldValue: unknown) => {
    if (!activeStateId || !selectedNodeId) return;
    const cmd = new UpdateNodeFieldCommand(stateTree, activeStateId, selectedNodeId, field, value, oldValue);
    commandBus.execute(cmd);
    refreshProject();
  }, [activeStateId, selectedNodeId, stateTree, refreshProject]);

  const handleUpdateMetadata = useCallback((key: string, value: unknown) => {
    if (!activeStateId || !selectedNodeId) return;
    const node = snapshot.nodes.get(selectedNodeId);
    if (!node) return;
    const oldMeta = { ...node.metadata };
    const newMeta = { ...node.metadata, [key]: value };
    const cmd = new UpdateNodeFieldCommand(stateTree, activeStateId, selectedNodeId, "metadata", newMeta, oldMeta);
    commandBus.execute(cmd);
    refreshProject();
  }, [activeStateId, selectedNodeId, snapshot, stateTree, refreshProject]);

  /* ── Keyboard shortcuts ─────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        commandBus.undo();
        refreshProject();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        commandBus.redo();
        refreshProject();
      }
      if (e.key === "Delete" && selectedNodeId) {
        e.preventDefault();
        handleDelete();
      }
      if (e.key === "Escape") {
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDelete, refreshProject, selectedNodeId]);

  /* ── Tool button renderer ───────────────── */
  const renderToolButton = (tool: ToolDef) => (
    <button
      key={tool.id}
      className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
      onClick={() => setActiveTool(tool.id)}
      title={tool.label}
    >
      <span className="tool-icon">{tool.icon}</span>
      {tool.label}
    </button>
  );

  /* ── Sorted/filtered object list ────────── */
  const allNodes = Array.from(snapshot.nodes.values());
  const filteredNodes = objectFilter
    ? allNodes.filter(n => n.name.toLowerCase().includes(objectFilter.toLowerCase()) ||
                           n.kind.toLowerCase().includes(objectFilter.toLowerCase()))
    : allNodes;
  const sortedNodes = [...filteredNodes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="workbench">
      {/* ═══ TOP BAR ═══ */}
      <div className="workbench-header">
        <span className="workbench-title">Atlas</span>
        <div className="header-separator" />

        <button className="header-btn" onClick={handleNew}>New</button>
        <button className="header-btn" onClick={handleSave}>Save</button>
        <button className="header-btn" onClick={handleLoad}>Load</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".atlas,.json"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <div className="header-separator" />

        <button
          className="header-btn"
          disabled={!commandBus.canUndo()}
          onClick={() => { commandBus.undo(); refreshProject(); }}
          title="Undo (Ctrl+Z)"
        >↶ Undo</button>
        <button
          className="header-btn"
          disabled={!commandBus.canRedo()}
          onClick={() => { commandBus.redo(); refreshProject(); }}
          title="Redo (Ctrl+Y)"
        >↷ Redo</button>

        <div className="header-spacer" />
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="workbench-main">
        {/* ─── LEFT PANEL ─── */}
        <div className="left-panel">
          {/* EDIT tools */}
          <div className="tool-section">
            <div className="tool-section-title">Edit</div>
            <div className="tool-grid-full">
              {EDIT_TOOLS.map(renderToolButton)}
            </div>
          </div>

          {/* CREATE tools */}
          <div className="tool-section">
            <div className="tool-section-title">Create</div>
            <div className="tool-grid">
              {CREATE_TOOLS.map(renderToolButton)}
            </div>
          </div>

          {/* STAMP tools */}
          <div className="tool-section">
            <div className="tool-section-title">Place</div>
            <div className="tool-grid">
              {STAMP_TOOLS.map(renderToolButton)}
            </div>
          </div>

          {/* ANNOTATE tools */}
          <div className="tool-section">
            <div className="tool-section-title">Annotate</div>
            <div className="tool-grid-full">
              {ANNOTATE_TOOLS.map(renderToolButton)}
            </div>
          </div>

          {/* Tool hint */}
          <div className="tool-hint">
            {getToolHint(activeTool)}
          </div>

          {/* Object list */}
          <div className="object-list-header">
            <span className="object-list-title">Objects ({allNodes.length})</span>
          </div>
          <div style={{ padding: "0.3rem 0.4rem" }}>
            <input
              className="object-list-filter"
              placeholder="Filter objects…"
              value={objectFilter}
              onChange={e => setObjectFilter(e.target.value)}
            />
          </div>
          <div className="object-list">
            {sortedNodes.map(node => (
              <div
                key={node.id}
                className={`object-item ${selectedNodeId === node.id ? "selected" : ""}`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <span className="object-item-icon">{getKindIcon(node.kind)}</span>
                <span className="object-item-name">{node.name}</span>
                <span className="object-item-kind">{node.kind}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── CANVAS (center) ─── */}
        <Canvas
          snapshot={snapshot}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          commandBus={commandBus}
          stateTree={stateTree}
          activeStateId={activeStateId}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onRefresh={refreshProject}
        />

        {/* ─── RIGHT PANEL (Inspector) ─── */}
        <div className="right-panel">
          {selectedNode ? (
            <Inspector
              node={selectedNode}
              onUpdateName={handleUpdateName}
              onUpdateField={handleUpdateField}
              onUpdateMetadata={handleUpdateMetadata}
              onDelete={handleDelete}
              onRefresh={refreshProject}
              commandBus={commandBus}
              stateTree={stateTree}
              activeStateId={activeStateId}
            />
          ) : (
            <div className="inspector-empty">
              Select an object to view its properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Inspector Component (inline for simplicity)
   ═══════════════════════════════════════════════════════════ */

import type { SpatialFacet, VisualStyle, StateTree, StateId } from "@atlas/kernel";
import { generateCoastline, randomSeed } from "@atlas/kernel";
import { UpdateGeometryCommand } from "@atlas/kernel";

interface InspectorProps {
  node: Node;
  onUpdateName: (name: string) => void;
  onUpdateField: (field: string, value: unknown, oldValue: unknown) => void;
  onUpdateMetadata: (key: string, value: unknown) => void;
  onDelete: () => void;
  onRefresh: () => void;
  commandBus: CommandBus;
  stateTree: StateTree;
  activeStateId?: StateId;
}

function Inspector({ node, onUpdateName, onUpdateField, onUpdateMetadata, onDelete, onRefresh, commandBus, stateTree, activeStateId }: InspectorProps) {
  const spatial = node.facets.spatial as SpatialFacet | undefined;
  const visual = node.facets.visual as VisualStyle | undefined;
  const meta = node.metadata as Record<string, any>;

  const updateVisual = (prop: string, val: any) => {
    const oldVisual = { ...(node.facets.visual || {}) };
    const newVisual = { ...oldVisual, [prop]: val };
    onUpdateField("facets", { ...node.facets, visual: newVisual }, node.facets);
  };

  /* ── Island shape controls ─── */
  const isIsland = node.kind === "island";
  const isForest = node.kind === "forest";
  const isMountainRange = node.kind === "mountain_range";

  const regenerateCoastline = useCallback(() => {
    if (!activeStateId || !isIsland || !spatial) return;
    const rough = meta.roughPoints as { x: number; y: number }[] | undefined;
    if (!rough || rough.length < 3) return;

    const params = {
      roughness: (meta.roughness as number) ?? 0.4,
      smoothness: (meta.smoothness as number) ?? 4,
      seed: (meta.seed as string) ?? "atlas-default",
    };
    const coastline = generateCoastline(rough, params);
    const oldGeom = spatial.geometry;
    const newGeom = { type: "polygon" as const, points: coastline };
    const cmd = new UpdateGeometryCommand(stateTree, activeStateId, node.id, newGeom, oldGeom);
    commandBus.execute(cmd);
    onRefresh();
  }, [activeStateId, isIsland, spatial, meta, stateTree, node.id, commandBus, onRefresh]);

  const resetShape = useCallback(() => {
    if (!activeStateId || !isIsland || !spatial) return;
    const rough = meta.roughPoints as { x: number; y: number }[] | undefined;
    if (!rough || rough.length < 3) return;
    const oldGeom = spatial.geometry;
    const newGeom = { type: "polygon" as const, points: rough };
    const cmd = new UpdateGeometryCommand(stateTree, activeStateId, node.id, newGeom, oldGeom);
    commandBus.execute(cmd);
    onRefresh();
  }, [activeStateId, isIsland, spatial, meta, stateTree, node.id, commandBus, onRefresh]);

  return (
    <div>
      {/* Name + Delete */}
      <div className="inspector-header">
        <span style={{ fontSize: "1rem" }}>{getKindIcon(node.kind)}</span>
        <input
          className="inspector-name"
          value={node.name}
          onChange={e => onUpdateName(e.target.value)}
        />
        <button className="inspector-delete-btn" onClick={onDelete} title="Delete">🗑️</button>
      </div>

      {/* Type info */}
      <div className="inspector-section">
        <div className="inspector-section-title">Info</div>
        <div className="inspector-field">
          <span className="inspector-label">Type</span>
          <span className="inspector-info">{node.kind}</span>
        </div>
        {spatial && (
          <div className="inspector-field">
            <span className="inspector-label">Geometry</span>
            <span className="inspector-info">{spatial.geometry.type}</span>
          </div>
        )}
      </div>

      {/* ── Island-specific controls ── */}
      {isIsland && meta.roughPoints && (
        <div className="inspector-section">
          <div className="inspector-section-title">Coastline</div>
          <div className="inspector-field">
            <span className="inspector-label">Roughness</span>
            <input
              className="inspector-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={meta.roughness ?? 0.4}
              onChange={e => onUpdateMetadata("roughness", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{((meta.roughness ?? 0.4) as number).toFixed(2)}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Smoothness</span>
            <input
              className="inspector-slider"
              type="range"
              min="0"
              max="10"
              step="1"
              value={meta.smoothness ?? 4}
              onChange={e => onUpdateMetadata("smoothness", parseInt(e.target.value))}
            />
            <span className="inspector-value">{meta.smoothness ?? 4}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Seed</span>
            <input
              className="inspector-input"
              value={meta.seed ?? "atlas-default"}
              onChange={e => onUpdateMetadata("seed", e.target.value)}
            />
          </div>
          <div className="inspector-btn-row">
            <button className="inspector-btn" onClick={() => { onUpdateMetadata("seed", randomSeed()); }}>
              Randomize
            </button>
            <button className="inspector-btn" onClick={regenerateCoastline}>
              Regenerate
            </button>
            <button className="inspector-btn" onClick={resetShape}>
              Reset Shape
            </button>
          </div>
        </div>
      )}

      {/* ── Forest controls ── */}
      {isForest && (
        <div className="inspector-section">
          <div className="inspector-section-title">Forest</div>
          <div className="inspector-field">
            <span className="inspector-label">Density</span>
            <input
              className="inspector-slider"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={meta.density ?? 0.5}
              onChange={e => onUpdateMetadata("density", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{((meta.density ?? 0.5) as number).toFixed(2)}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Scale</span>
            <input
              className="inspector-slider"
              type="range"
              min="0.3"
              max="2"
              step="0.1"
              value={meta.scale ?? 1}
              onChange={e => onUpdateMetadata("scale", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{((meta.scale ?? 1) as number).toFixed(1)}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Seed</span>
            <input
              className="inspector-input"
              value={meta.seed ?? "forest"}
              onChange={e => onUpdateMetadata("seed", e.target.value)}
            />
          </div>
          <div className="inspector-btn-row">
            <button className="inspector-btn" onClick={() => onUpdateMetadata("seed", randomSeed())}>
              Randomize
            </button>
          </div>
        </div>
      )}

      {/* ── Mountain controls ── */}
      {isMountainRange && (
        <div className="inspector-section">
          <div className="inspector-section-title">Mountains</div>
          <div className="inspector-field">
            <span className="inspector-label">Density</span>
            <input
              className="inspector-slider"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={meta.density ?? 0.5}
              onChange={e => onUpdateMetadata("density", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{((meta.density ?? 0.5) as number).toFixed(2)}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Scale</span>
            <input
              className="inspector-slider"
              type="range"
              min="0.3"
              max="2"
              step="0.1"
              value={meta.scale ?? 1}
              onChange={e => onUpdateMetadata("scale", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{((meta.scale ?? 1) as number).toFixed(1)}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Seed</span>
            <input
              className="inspector-input"
              value={meta.seed ?? "mountains"}
              onChange={e => onUpdateMetadata("seed", e.target.value)}
            />
          </div>
          <div className="inspector-btn-row">
            <button className="inspector-btn" onClick={() => onUpdateMetadata("seed", randomSeed())}>
              Randomize
            </button>
          </div>
        </div>
      )}

      {/* ── Label controls ── */}
      {node.kind === "label" && (
        <div className="inspector-section">
          <div className="inspector-section-title">Label</div>
          <div className="inspector-field">
            <span className="inspector-label">Font Size</span>
            <input
              className="inspector-input"
              type="number"
              min="8"
              max="120"
              value={meta.fontSize ?? 16}
              onChange={e => onUpdateMetadata("fontSize", parseInt(e.target.value))}
            />
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Rotation</span>
            <input
              className="inspector-slider"
              type="range"
              min="-180"
              max="180"
              step="1"
              value={meta.rotation ?? 0}
              onChange={e => onUpdateMetadata("rotation", parseInt(e.target.value))}
            />
            <span className="inspector-value">{meta.rotation ?? 0}°</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Color</span>
            <input
              className="inspector-color"
              type="color"
              value={meta.color ?? "#3B2F1E"}
              onChange={e => onUpdateMetadata("color", e.target.value)}
            />
            <input
              className="inspector-input"
              value={meta.color ?? "#3B2F1E"}
              onChange={e => onUpdateMetadata("color", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Visual style ── */}
      {visual && !["forest", "mountain_range", "label"].includes(node.kind) && (
        <div className="inspector-section">
          <div className="inspector-section-title">Appearance</div>
          {visual.fill !== undefined && visual.fill !== "none" && (
            <div className="inspector-field">
              <span className="inspector-label">Fill</span>
              <input
                className="inspector-color"
                type="color"
                value={visual.fill || "#C4B896"}
                onChange={e => updateVisual("fill", e.target.value)}
              />
              <input
                className="inspector-input"
                value={visual.fill || "#C4B896"}
                onChange={e => updateVisual("fill", e.target.value)}
              />
            </div>
          )}
          <div className="inspector-field">
            <span className="inspector-label">Stroke</span>
            <input
              className="inspector-color"
              type="color"
              value={visual.stroke || "#8A7E64"}
              onChange={e => updateVisual("stroke", e.target.value)}
            />
            <input
              className="inspector-input"
              value={visual.stroke || "#8A7E64"}
              onChange={e => updateVisual("stroke", e.target.value)}
            />
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Width</span>
            <input
              className="inspector-input"
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={visual.strokeWidth ?? 2}
              onChange={e => updateVisual("strokeWidth", parseFloat(e.target.value))}
            />
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Opacity</span>
            <input
              className="inspector-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={visual.opacity ?? 1}
              onChange={e => updateVisual("opacity", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{Math.round((visual.opacity ?? 1) * 100)}%</span>
          </div>
        </div>
      )}

      {/* ── Stamp scale + rotation ── */}
      {node.kind.match(/^(village|town|city|fort|castle|temple|harbour|ruins|monument|bridge|volcano|waterfall)$/) && (
        <div className="inspector-section">
          <div className="inspector-section-title">Transform</div>
          <div className="inspector-field">
            <span className="inspector-label">Scale</span>
            <input
              className="inspector-slider"
              type="range"
              min="0.3"
              max="3"
              step="0.1"
              value={meta.stampScale ?? 1}
              onChange={e => onUpdateMetadata("stampScale", parseFloat(e.target.value))}
            />
            <span className="inspector-value">{((meta.stampScale ?? 1) as number).toFixed(1)}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-label">Rotation</span>
            <input
              className="inspector-slider"
              type="range"
              min="-180"
              max="180"
              step="5"
              value={meta.rotation ?? 0}
              onChange={e => onUpdateMetadata("rotation", parseInt(e.target.value))}
            />
            <span className="inspector-value">{meta.rotation ?? 0}°</span>
          </div>
        </div>
      )}
    </div>
  );
}
