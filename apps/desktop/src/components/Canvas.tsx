import { useRef, useState, useCallback, useEffect, type MouseEvent, type WheelEvent, type KeyboardEvent } from "react";
import { useAtlas } from "../contexts/AtlasContext";
import type { Node, GraphSnapshot, CommandBus, StateId } from "@atlas/kernel";
import {
  calculateBounds,
  MoveNodeCommand,
  CreateNodeCommand,
  NodeArchetypes,
  type Point,
  type SpatialFacet,
  type VisualStyle,
} from "@atlas/kernel";
import styles from "./Canvas.module.css";

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

type EditMode = "select" | "draw-polygon" | "draw-polyline" | "edit-polygon" | "edit-polyline";

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
  const [showGrid, setShowGrid] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>(activeTool as EditMode);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  // Convert screen coordinates to world coordinates
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

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newScale = Math.max(0.1, Math.min(5, transform.scale * (1 + delta)));

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;

      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setTransform({ x: newX, y: newY, scale: newScale });
    },
    [transform]
  );

  // Find node at point
  const findNodeAtPoint = useCallback(
    (point: Point): Node | undefined => {
      const nodes = Array.from(snapshot.nodes.values());
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (!node) continue;
        const spatial = node.facets.spatial as SpatialFacet | undefined;
        if (!spatial || !spatial.visible) continue;

        const bounds = calculateBounds(spatial.geometry);
        const padding = 10 / transform.scale;
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

  // Handle mouse down
  useEffect(() => {
    setEditMode(activeTool as EditMode);
  }, [activeTool]);

  const getDefaultStyle = useCallback(
    (kind: string): VisualStyle => {
      switch (kind) {
        case NodeArchetypes.ISLAND:
          return { fill: "#90caf9", stroke: "#1976d2", strokeWidth: 3, opacity: 0.8 };
        case NodeArchetypes.ROUTE:
          return { fill: "none", stroke: "#42a5f5", strokeWidth: 4, opacity: 1 };
        default:
          return { fill: "#90caf9", stroke: "#1976d2", strokeWidth: 2, opacity: 1 };
      }
    },
    []
  );

  const { project, setProject } = useAtlas();

  const createNode = useCallback(
    (kind: string, name: string, geometry: any) => {
      if (!activeStateId) return;
      const newNode: Node = {
        id: crypto.randomUUID(),
        kind,
        name,
        tags: [],
        metadata: {},
        facets: {
          spatial: {
            geometry,
            layer: "default",
            zIndex: 0,
            visible: true,
            locked: false,
          },
          visual: getDefaultStyle(kind),
        },
        system: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          createdInState: activeStateId,
        },
      };

      const command = new CreateNodeCommand(stateTree, activeStateId, newNode);
      commandBus.execute(command);
      setProject({
        ...project,
        nodes: [...project.nodes, newNode],
      });
      onSelectNode(newNode.id);
      onRefresh?.();
      onToolChange?.("select");
      return newNode;
    },
    [activeStateId, commandBus, getDefaultStyle, onRefresh, onSelectNode, onToolChange, setProject, stateTree]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);

      if (e.button === 1 || e.button === 2) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
        return;
      }

      if (e.button === 0) {
        if (editMode === "draw-polygon" || editMode === "draw-polyline") {
          setDrawingPoints((prev) => [...prev, worldPos]);
        } else if (editMode === "select") {
          const clickedNode = findNodeAtPoint(worldPos);
          if (clickedNode) {
            onSelectNode(clickedNode.id);
            setIsDragging(true);
            setDragStart(worldPos);
          } else {
            onSelectNode(undefined);
          }
        }
      }
    },
    [editMode, screenToWorld, findNodeAtPoint, onSelectNode]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (isPanning && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setTransform((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (isDragging && dragStart && selectedNodeId && activeStateId) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const dx = worldPos.x - dragStart.x;
        const dy = worldPos.y - dragStart.y;

        const node = snapshot.nodes.get(selectedNodeId);
        if (node) {
          const spatial = node.facets.spatial as SpatialFacet;
          const command = new MoveNodeCommand(
            stateTree,
            activeStateId,
            selectedNodeId,
            dx,
            dy,
            spatial.geometry
          );
          commandBus.execute(command);
          onRefresh?.();
        }

        setDragStart(worldPos);
      }
    },
    [
      isPanning,
      isDragging,
      dragStart,
      selectedNodeId,
      activeStateId,
      screenToWorld,
      snapshot,
      commandBus,
      stateTree,
    ]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && drawingPoints.length > 0) {
        if (editMode === "draw-polygon" && drawingPoints.length >= 3) {
          createNode(NodeArchetypes.ISLAND, "New Island", {
            type: "polygon",
            points: drawingPoints,
          });
        } else if (editMode === "draw-polyline" && drawingPoints.length >= 2) {
          createNode(NodeArchetypes.ROUTE, "New Route", {
            type: "polyline",
            points: drawingPoints,
          });
        }
        setDrawingPoints([]);
      } else if (e.key === "Escape") {
        setDrawingPoints([]);
        setEditMode("select");
        onToolChange?.("select");
      }
    },
    [createNode, drawingPoints, editMode, onToolChange]
  );

  // Render node geometry
  const renderNode = useCallback(
    (node: Node) => {
      const spatial = node.facets.spatial as SpatialFacet | undefined;
      const visual = node.facets.visual as VisualStyle | undefined;
      if (!spatial || !spatial.visible) return null;

      const isSelected = node.id === selectedNodeId;
      const style = {
        fill: visual?.fill || "#90caf9",
        stroke: visual?.stroke || (isSelected ? "#ffeb3b" : "#1976d2"),
        strokeWidth: (visual?.strokeWidth || 2) * (isSelected ? 2 : 1),
        opacity: visual?.opacity || 1,
      };

      const geometry = spatial.geometry;

      switch (geometry.type) {
        case "polygon":
          if (geometry.points.length < 3) return null;
          const polygonPath =
            geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
          return (
            <g key={node.id}>
              <path d={polygonPath} {...style} />
              {isSelected &&
                geometry.points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={5 / transform.scale} fill="#ffeb3b" />
                ))}
            </g>
          );

        case "polyline":
          if (geometry.points.length < 2) return null;
          const polylinePath = geometry.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
          return (
            <g key={node.id}>
              <path
                d={polylinePath}
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
              {isSelected &&
                geometry.points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={5 / transform.scale} fill="#ffeb3b" />
                ))}
            </g>
          );

        case "point":
          return (
            <circle
              key={node.id}
              cx={geometry.point.x}
              cy={geometry.point.y}
              r={10 / transform.scale}
              {...style}
            />
          );

        case "circle":
          return <circle key={node.id} cx={geometry.center.x} cy={geometry.center.y} r={geometry.radius} {...style} />;

        case "rect":
          return (
            <rect
              key={node.id}
              x={geometry.x}
              y={geometry.y}
              width={geometry.width}
              height={geometry.height}
              {...style}
            />
          );

        default:
          return null;
      }
    },
    [selectedNodeId, transform.scale]
  );

  // Render grid
  const renderGrid = useCallback(() => {
    if (!showGrid) return null;

    const gridSize = 100;
    const viewBounds = {
      minX: -transform.x / transform.scale - 1000,
      minY: -transform.y / transform.scale - 1000,
      maxX: (-transform.x + 2000) / transform.scale,
      maxY: (-transform.y + 2000) / transform.scale,
    };

    const lines: JSX.Element[] = [];
    const startX = Math.floor(viewBounds.minX / gridSize) * gridSize;
    const startY = Math.floor(viewBounds.minY / gridSize) * gridSize;

    for (let x = startX; x <= viewBounds.maxX; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={viewBounds.minY}
          x2={x}
          y2={viewBounds.maxY}
          stroke="#333"
          strokeWidth={0.5 / transform.scale}
        />
      );
    }
    for (let y = startY; y <= viewBounds.maxY; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={viewBounds.minX}
          y1={y}
          x2={viewBounds.maxX}
          y2={y}
          stroke="#333"
          strokeWidth={0.5 / transform.scale}
        />
      );
    }
    return <g>{lines}</g>;
  }, [showGrid, transform]);

  // Render drawing preview
  const renderDrawingPreview = useCallback(() => {
    if (drawingPoints.length === 0) return null;

    const path = drawingPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <g>
        <path
          d={path}
          fill="none"
          stroke="#ffeb3b"
          strokeWidth={2 / transform.scale}
          strokeDasharray={`${5 / transform.scale} ${5 / transform.scale}`}
        />
        {drawingPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5 / transform.scale} fill="#ffeb3b" />
        ))}
      </g>
    );
  }, [drawingPoints, transform.scale]);

  return (
    <div className={styles.container} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className={styles.toolbar}>
        <button onClick={() => setShowGrid(!showGrid)}>{showGrid ? "Hide Grid" : "Show Grid"}</button>
        <button onClick={() => setTransform({ x: 400, y: 300, scale: 1 })}>Reset View</button>
        <span className={styles.zoomLevel}>Zoom: {Math.round(transform.scale * 100)}%</span>
        <span className={styles.mode}>
          Mode: {editMode}
          {drawingPoints.length > 0 && ` (${drawingPoints.length} points, press Enter to finish)`}
        </span>
      </div>

      <svg
        ref={svgRef}
        className={styles.canvas}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {renderGrid()}
          {Array.from(snapshot.nodes.values()).map(renderNode)}
          {renderDrawingPreview()}
        </g>
      </svg>
    </div>
  );
}
