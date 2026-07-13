import { useRef, useState, useCallback, useEffect, type MouseEvent, type WheelEvent, type KeyboardEvent } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import type { Node, GraphSnapshot, CommandBus, StateId } from "@atlas/kernel";
import {
  calculateBounds,
  MoveNodeCommand,
  CreateNodeCommand,
  type Point,
  type SpatialFacet,
  type VisualStyle,
  generateCoastline,
  randomSeed,
} from "@atlas/kernel";
import { MapSymbolDefs, getSymbolId, generateTreePositions, generateMountainPositions } from "./MapSymbols";

interface CanvasProps {
  snapshot: GraphSnapshot;
  selectedNodeId?: string;
  onSelectNode: (nodeId: string | undefined) => void;
  commandBus: CommandBus;
  stateTree: any;
  activeStateId?: StateId;
  activeTool: string;
  onToolChange?: (tool: string) => void;
  onRefresh?: () => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

function translateGeometry(geometry: any, dx: number, dy: number): any {
  switch (geometry.type) {
    case "point":
      return {
        type: "point",
        point: { x: geometry.point.x + dx, y: geometry.point.y + dy },
      };
    case "polygon":
      return {
        type: "polygon",
        points: geometry.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })),
      };
    case "polyline":
      return {
        type: "polyline",
        points: geometry.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })),
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
    default:
      return geometry;
  }
}

/** Smooth SVG path through points using cubic bezier curves */
function smoothPathD(points: Point[], closed: boolean = false): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  if (closed) d += " Z";
  return d;
}

export function Canvas({
  snapshot,
  selectedNodeId,
  onSelectNode,
  commandBus,
  stateTree,
  activeStateId,
  activeTool,
  onToolChange,
  onRefresh,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({ x: 400, y: 300, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const { project, setProject } = useAtlas();

  const dragStartRef = useRef<Point | null>(null);
  const dragNodeOriginalGeomRef = useRef<any>(null);
  const dragTotalDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Clear drawing points when tool changes
  useEffect(() => {
    setDrawingPoints([]);
  }, [activeTool]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      if (!svgRef.current) return { x: screenX, y: screenY };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (screenX - rect.left - transform.x) / transform.scale,
        y: (screenY - rect.top - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // Zoom
  const handleWheel = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newScale = Math.max(0.05, Math.min(10, transform.scale * (1 + delta)));
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;
      setTransform({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
        scale: newScale,
      });
    },
    [transform]
  );

  // Hit test
  const findNodeAtPoint = useCallback(
    (point: Point): Node | undefined => {
      const nodes = Array.from(snapshot.nodes.values());
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (!node) continue;
        const spatial = node.facets.spatial as SpatialFacet | undefined;
        if (!spatial || !spatial.visible) continue;

        const bounds = calculateBounds(spatial.geometry);
        // Larger padding for stamps
        const baseSize = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        const padding = Math.max(15 / transform.scale, baseSize * 0.15);

        if (
          point.x >= bounds.minX - padding &&
          point.x <= bounds.maxX + padding &&
          point.y >= bounds.minY - padding &&
          point.y <= bounds.maxY + padding
        ) {
          return node;
        }
      }
      return undefined;
    },
    [snapshot, transform.scale]
  );

  // Tool type checks
  const isDrawingTool = activeTool === "island" || activeTool === "forest" || activeTool === "mountains";
  const isPathTool = activeTool === "river" || activeTool === "road";
  const isStampTool = activeTool.startsWith("stamp-");
  const isLabelTool = activeTool === "label";

  // Create a map node
  const createNode = useCallback(
    (kind: string, name: string, geometry: any, extraFacets?: Record<string, any>, extraMeta?: Record<string, any>) => {
      if (!activeStateId) return;

      const defaultStyles: Record<string, VisualStyle> = {
        island: { fill: "#C4B896", stroke: "#8A7E64", strokeWidth: 2, opacity: 1 },
        forest: { fill: "rgba(58, 125, 68, 0.15)", stroke: "#2D5F33", strokeWidth: 1, opacity: 0.8 },
        mountain_range: { fill: "rgba(139, 123, 107, 0.15)", stroke: "#5C4C3B", strokeWidth: 1, opacity: 0.8 },
        river: { fill: "none", stroke: "#4A8FBF", strokeWidth: 3, opacity: 1 },
        road: { fill: "none", stroke: "#8B7355", strokeWidth: 2.5, opacity: 1 },
        label: { fill: "none", stroke: "none", strokeWidth: 0, opacity: 1 },
      };

      const newNode: Node = {
        id: crypto.randomUUID(),
        kind,
        name,
        tags: [],
        metadata: extraMeta || {},
        facets: {
          spatial: {
            geometry,
            layer: "default",
            zIndex: kind === "island" ? 0 : kind === "label" ? 100 : 50,
            visible: true,
            locked: false,
          },
          visual: defaultStyles[kind] || { fill: "#C4B896", stroke: "#8A7E64", strokeWidth: 2, opacity: 1 },
          ...extraFacets,
        },
        system: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          createdInState: activeStateId,
        },
      };

      const command = new CreateNodeCommand(stateTree, activeStateId, newNode);
      commandBus.execute(command);
      setProject({ ...project, nodes: [...project.nodes, newNode] });
      onSelectNode(newNode.id);
      onRefresh?.();
      onToolChange?.("select");
      return newNode;
    },
    [activeStateId, commandBus, onRefresh, onSelectNode, onToolChange, project, setProject, stateTree]
  );

  // Finish drawing operation
  const finishDrawing = useCallback(() => {
    if (drawingPoints.length < 2) {
      setDrawingPoints([]);
      return;
    }

    if (activeTool === "island" && drawingPoints.length >= 3) {
      const seed = randomSeed();
      const coastline = generateCoastline(drawingPoints, { roughness: 0.4, smoothness: 4, seed });
      createNode("island", "New Island", { type: "polygon", points: coastline }, undefined, {
        roughPoints: drawingPoints,
        roughness: 0.4,
        smoothness: 4,
        seed,
      });
    } else if (activeTool === "forest" && drawingPoints.length >= 3) {
      createNode("forest", "New Forest", { type: "polygon", points: drawingPoints }, undefined, {
        density: 0.5,
        scale: 1,
        seed: randomSeed(),
      });
    } else if (activeTool === "mountains" && drawingPoints.length >= 3) {
      createNode("mountain_range", "New Mountain Range", { type: "polygon", points: drawingPoints }, undefined, {
        density: 0.5,
        scale: 1,
        seed: randomSeed(),
      });
    } else if (activeTool === "river" && drawingPoints.length >= 2) {
      createNode("river", "New River", { type: "polyline", points: drawingPoints });
    } else if (activeTool === "road" && drawingPoints.length >= 2) {
      createNode("road", "New Road", { type: "polyline", points: drawingPoints });
    }

    setDrawingPoints([]);
  }, [activeTool, createNode, drawingPoints]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);

      // Middle / right = pan
      if (e.button === 1 || e.button === 2) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      // Drawing tools
      if (isDrawingTool || isPathTool) {
        setDrawingPoints(prev => [...prev, worldPos]);
        return;
      }

      // Stamp tools
      if (isStampTool) {
        const stampKind = activeTool.replace("stamp-", "");
        const stampName = `New ${stampKind.charAt(0).toUpperCase() + stampKind.slice(1)}`;
        createNode(stampKind, stampName, { type: "point", point: worldPos }, undefined, {
          stampScale: 1,
          rotation: 0,
        });
        return;
      }

      // Label tool
      if (isLabelTool) {
        const text = prompt("Label text:", "New Label");
        if (!text) return;
        createNode("label", text, { type: "point", point: worldPos }, undefined, {
          fontSize: 16,
          rotation: 0,
          color: "#3B2F1E",
        });
        return;
      }

      // Select mode
      if (activeTool === "select") {
        const clickedNode = findNodeAtPoint(worldPos);
        if (clickedNode) {
          onSelectNode(clickedNode.id);
          setIsDragging(true);
          dragStartRef.current = worldPos;
          const spatial = clickedNode.facets.spatial as SpatialFacet;
          dragNodeOriginalGeomRef.current = JSON.parse(JSON.stringify(spatial.geometry));
          dragTotalDeltaRef.current = { dx: 0, dy: 0 };
        } else {
          onSelectNode(undefined);
        }
      }
    },
    [activeTool, isDrawingTool, isPathTool, isStampTool, isLabelTool, screenToWorld, findNodeAtPoint, onSelectNode, createNode]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setMousePos(worldPos);

      if (isPanning && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (isDragging && dragStartRef.current && selectedNodeId && activeStateId) {
        const dx = worldPos.x - dragStartRef.current.x;
        const dy = worldPos.y - dragStartRef.current.y;
        dragTotalDeltaRef.current = { dx, dy };

        const node = snapshot.nodes.get(selectedNodeId);
        if (node && dragNodeOriginalGeomRef.current) {
          const spatial = node.facets.spatial as SpatialFacet;
          spatial.geometry = translateGeometry(dragNodeOriginalGeomRef.current, dx, dy);
          onRefresh?.();
        }
      }
    },
    [isPanning, isDragging, dragStart, selectedNodeId, activeStateId, screenToWorld, snapshot, onRefresh]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragStart(null);

    if (isDragging && selectedNodeId && activeStateId) {
      const { dx, dy } = dragTotalDeltaRef.current;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        const node = snapshot.nodes.get(selectedNodeId);
        if (node && dragNodeOriginalGeomRef.current) {
          const spatial = node.facets.spatial as SpatialFacet;
          spatial.geometry = dragNodeOriginalGeomRef.current;

          const cmd = new MoveNodeCommand(
            stateTree,
            activeStateId,
            selectedNodeId,
            dx,
            dy,
            dragNodeOriginalGeomRef.current
          );
          commandBus.execute(cmd);
          onRefresh?.();
        }
      }
      setIsDragging(false);
      dragStartRef.current = null;
      dragNodeOriginalGeomRef.current = null;
    }
  }, [isDragging, selectedNodeId, activeStateId, snapshot, stateTree, commandBus, onRefresh]);

  const handleDoubleClick = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (isDrawingTool || isPathTool) {
        e.preventDefault();
        finishDrawing();
      }
    },
    [isDrawingTool, isPathTool, finishDrawing]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && drawingPoints.length > 0) {
        finishDrawing();
      } else if (e.key === "Escape") {
        setDrawingPoints([]);
        onToolChange?.("select");
      }
    },
    [drawingPoints, finishDrawing, onToolChange]
  );

  // Sort nodes by zIndex for drawing order
  const sortedNodes = Array.from(snapshot.nodes.values()).sort((a, b) => {
    const aZ = (a.facets.spatial as any)?.zIndex ?? 0;
    const bZ = (b.facets.spatial as any)?.zIndex ?? 0;
    return aZ - bZ;
  });

  // ═══════════════════════════════════════════
  //  RENDER NODE
  // ═══════════════════════════════════════════

  const renderNode = useCallback(
    (node: Node) => {
      const spatial = node.facets.spatial as SpatialFacet | undefined;
      const visual = node.facets.visual as VisualStyle | undefined;
      if (!spatial || !spatial.visible) return null;

      const isSelected = node.id === selectedNodeId;
      const geometry = spatial.geometry;
      const meta = node.metadata as Record<string, any>;

      /* ── Island ── */
      if (node.kind === "island" && geometry.type === "polygon") {
        if (geometry.points.length < 3) return null;
        const path = geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return (
          <g key={node.id}>
            {/* Island shadow */}
            <path d={path} fill="rgba(0,0,0,0.15)" stroke="none"
              transform="translate(3, 3)" />
            {/* Island fill */}
            <path d={path}
              fill={visual?.fill || "#C4B896"}
              stroke={isSelected ? "#C4934A" : (visual?.stroke || "#8A7E64")}
              strokeWidth={(visual?.strokeWidth || 2) * (isSelected ? 2 : 1)}
              opacity={visual?.opacity || 1}
            />
            {/* Selection handles */}
            {isSelected && meta.roughPoints && (meta.roughPoints as Point[]).map((p, i) => (
              <circle key={`h-${i}`} cx={p.x} cy={p.y} r={4 / transform.scale}
                fill="#C4934A" stroke="#1C1A17" strokeWidth={1 / transform.scale} />
            ))}
          </g>
        );
      }

      /* ── Forest ── */
      if (node.kind === "forest" && geometry.type === "polygon") {
        if (geometry.points.length < 3) return null;
        const regionPath = geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        const trees = generateTreePositions(
          geometry.points,
          (meta.density as number) ?? 0.5,
          (meta.scale as number) ?? 1,
          (meta.seed as string) ?? "forest"
        );
        return (
          <g key={node.id}>
            {/* Subtle region fill */}
            <path d={regionPath}
              fill={visual?.fill || "rgba(58, 125, 68, 0.08)"}
              stroke={isSelected ? "#C4934A" : "none"}
              strokeWidth={isSelected ? 1.5 / transform.scale : 0}
              strokeDasharray={isSelected ? `${4 / transform.scale}` : "none"}
            />
            {/* Trees */}
            {trees.map((t, i) => (
              <use key={i}
                href={`#sym-${t.type}`}
                x={t.x - 5 * t.scale}
                y={t.y - 10 * t.scale}
                width={10 * t.scale}
                height={14 * t.scale}
              />
            ))}
          </g>
        );
      }

      /* ── Mountain Range ── */
      if (node.kind === "mountain_range" && geometry.type === "polygon") {
        if (geometry.points.length < 3) return null;
        const regionPath = geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        const mountains = generateMountainPositions(
          geometry.points,
          (meta.density as number) ?? 0.5,
          (meta.scale as number) ?? 1,
          (meta.seed as string) ?? "mountains"
        );
        return (
          <g key={node.id}>
            <path d={regionPath}
              fill={visual?.fill || "rgba(139, 123, 107, 0.08)"}
              stroke={isSelected ? "#C4934A" : "none"}
              strokeWidth={isSelected ? 1.5 / transform.scale : 0}
              strokeDasharray={isSelected ? `${4 / transform.scale}` : "none"}
            />
            {mountains.map((m, i) => (
              <use key={i}
                href="#sym-mountain"
                x={m.x - 10 * m.scale}
                y={m.y - 12 * m.scale}
                width={20 * m.scale}
                height={16 * m.scale}
              />
            ))}
          </g>
        );
      }

      /* ── River ── */
      if (node.kind === "river" && geometry.type === "polyline") {
        if (geometry.points.length < 2) return null;
        const d = smoothPathD(geometry.points);
        return (
          <g key={node.id}>
            <path d={d} fill="none"
              stroke={isSelected ? "#C4934A" : (visual?.stroke || "#4A8FBF")}
              strokeWidth={(visual?.strokeWidth || 3) * (isSelected ? 1.5 : 1)}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={visual?.opacity || 1}
            />
            {isSelected && geometry.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4 / transform.scale}
                fill="#C4934A" stroke="#1C1A17" strokeWidth={1 / transform.scale} />
            ))}
          </g>
        );
      }

      /* ── Road ── */
      if (node.kind === "road" && geometry.type === "polyline") {
        if (geometry.points.length < 2) return null;
        const d = smoothPathD(geometry.points);
        return (
          <g key={node.id}>
            {/* Road casing */}
            <path d={d} fill="none"
              stroke={isSelected ? "#C4934A" : "#5C4033"}
              strokeWidth={((visual?.strokeWidth || 2.5) + 2) * (isSelected ? 1.5 : 1)}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={0.5}
            />
            {/* Road fill */}
            <path d={d} fill="none"
              stroke={visual?.stroke || "#8B7355"}
              strokeWidth={(visual?.strokeWidth || 2.5) * (isSelected ? 1.5 : 1)}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${8} ${4}`}
              opacity={visual?.opacity || 1}
            />
            {isSelected && geometry.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4 / transform.scale}
                fill="#C4934A" stroke="#1C1A17" strokeWidth={1 / transform.scale} />
            ))}
          </g>
        );
      }

      /* ── Label ── */
      if (node.kind === "label" && geometry.type === "point") {
        const fontSize = (meta.fontSize ?? 16) as number;
        const rotation = (meta.rotation ?? 0) as number;
        const color = (meta.color ?? "#3B2F1E") as string;
        return (
          <g key={node.id}>
            <text
              x={geometry.point.x}
              y={geometry.point.y}
              fill={color}
              fontSize={fontSize}
              fontFamily="'Cinzel', serif"
              textAnchor="middle"
              dominantBaseline="central"
              transform={rotation ? `rotate(${rotation}, ${geometry.point.x}, ${geometry.point.y})` : undefined}
              style={{ pointerEvents: "all" }}
            >
              {node.name}
            </text>
            {isSelected && (
              <rect
                x={geometry.point.x - (node.name.length * fontSize * 0.3)}
                y={geometry.point.y - fontSize * 0.6}
                width={node.name.length * fontSize * 0.6}
                height={fontSize * 1.2}
                fill="none"
                stroke="#C4934A"
                strokeWidth={1.5 / transform.scale}
                strokeDasharray={`${3 / transform.scale}`}
                transform={rotation ? `rotate(${rotation}, ${geometry.point.x}, ${geometry.point.y})` : undefined}
              />
            )}
          </g>
        );
      }

      /* ── Stamp (settlement/landmark) ── */
      const symbolId = getSymbolId(node.kind);
      if (symbolId && geometry.type === "point") {
        const stampScale = (meta.stampScale ?? 1) as number;
        const rotation = (meta.rotation ?? 0) as number;
        const size = 28 * stampScale;
        return (
          <g key={node.id}>
            <use
              href={`#${symbolId}`}
              x={geometry.point.x - size / 2}
              y={geometry.point.y - size / 2}
              width={size}
              height={size}
              transform={rotation ? `rotate(${rotation}, ${geometry.point.x}, ${geometry.point.y})` : undefined}
            />
            {/* Name label below stamp */}
            <text
              x={geometry.point.x}
              y={geometry.point.y + size / 2 + 10}
              fill="#3B2F1E"
              fontSize={10}
              fontFamily="'Cinzel', serif"
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {node.name}
            </text>
            {isSelected && (
              <rect
                x={geometry.point.x - size / 2 - 2}
                y={geometry.point.y - size / 2 - 2}
                width={size + 4}
                height={size + 4}
                fill="none"
                stroke="#C4934A"
                strokeWidth={1.5 / transform.scale}
                strokeDasharray={`${4 / transform.scale}`}
              />
            )}
          </g>
        );
      }

      /* ── Fallback: generic polygon/polyline/point ── */
      if (geometry.type === "polygon") {
        if (geometry.points.length < 3) return null;
        const path = geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return (
          <g key={node.id}>
            <path d={path}
              fill={visual?.fill || "#C4B896"}
              stroke={isSelected ? "#C4934A" : (visual?.stroke || "#8A7E64")}
              strokeWidth={(visual?.strokeWidth || 2) * (isSelected ? 2 : 1)}
              opacity={visual?.opacity || 1}
            />
          </g>
        );
      }

      if (geometry.type === "polyline") {
        if (geometry.points.length < 2) return null;
        const path = geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return (
          <g key={node.id}>
            <path d={path} fill="none"
              stroke={isSelected ? "#C4934A" : (visual?.stroke || "#8A7E64")}
              strokeWidth={(visual?.strokeWidth || 2) * (isSelected ? 2 : 1)}
              opacity={visual?.opacity || 1}
            />
          </g>
        );
      }

      if (geometry.type === "point") {
        return (
          <circle key={node.id}
            cx={geometry.point.x} cy={geometry.point.y}
            r={8 / transform.scale}
            fill={visual?.fill || "#C4B896"}
            stroke={isSelected ? "#C4934A" : (visual?.stroke || "#8A7E64")}
            strokeWidth={(visual?.strokeWidth || 2) * (isSelected ? 2 : 1)}
            opacity={visual?.opacity || 1}
          />
        );
      }

      return null;
    },
    [selectedNodeId, transform.scale]
  );

  // ═══════════════════════════════════════════
  //  DRAWING PREVIEW
  // ═══════════════════════════════════════════

  const renderDrawingPreview = useCallback(() => {
    if (drawingPoints.length === 0) return null;

    const allPts = [...drawingPoints];
    const isPolygon = isDrawingTool;

    // Show preview line to cursor
    const previewPts = [...allPts, mousePos];

    const path = previewPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      + (isPolygon && previewPts.length >= 3 ? " Z" : "");

    const colors: Record<string, string> = {
      island: "#C4B896",
      forest: "#3A7D44",
      mountains: "#8B7B6B",
      river: "#4A8FBF",
      road: "#8B7355",
    };
    const color = colors[activeTool] || "#C4934A";

    return (
      <g>
        <path
          d={path}
          fill={isPolygon ? `${color}22` : "none"}
          stroke={color}
          strokeWidth={2 / transform.scale}
          strokeDasharray={`${6 / transform.scale} ${4 / transform.scale}`}
        />
        {allPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4 / transform.scale}
            fill={color} stroke="#1C1A17" strokeWidth={1 / transform.scale} />
        ))}
      </g>
    );
  }, [drawingPoints, mousePos, activeTool, isDrawingTool, transform.scale]);

  // ═══════════════════════════════════════════
  //  OCEAN PATTERN
  // ═══════════════════════════════════════════

  const renderOceanPattern = () => {
    const viewMinX = -transform.x / transform.scale - 500;
    const viewMinY = -transform.y / transform.scale - 500;
    const viewW = 3000 / transform.scale;
    const viewH = 3000 / transform.scale;

    return (
      <rect x={viewMinX} y={viewMinY} width={viewW} height={viewH}
        fill="url(#ocean-gradient)" />
    );
  };

  // Cursor style
  let cursor = "default";
  if (isPanning) cursor = "grabbing";
  else if (isDrawingTool || isPathTool) cursor = "crosshair";
  else if (isStampTool || isLabelTool) cursor = "crosshair";
  else if (isDragging) cursor = "grabbing";

  return (
    <div className="canvas-container" tabIndex={0} onKeyDown={handleKeyDown}>
      <svg
        ref={svgRef}
        className="canvas-svg"
        style={{ cursor }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Definitions */}
        <defs>
          <radialGradient id="ocean-gradient" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#2A4A5A" />
            <stop offset="100%" stopColor="#1A2A3A" />
          </radialGradient>
        </defs>
        <MapSymbolDefs />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Ocean background */}
          {renderOceanPattern()}

          {/* Render all nodes */}
          {sortedNodes.map(renderNode)}

          {/* Drawing preview */}
          {renderDrawingPreview()}
        </g>
      </svg>
    </div>
  );
}
