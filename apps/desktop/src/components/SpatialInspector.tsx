import type { Node } from "@atlas/kernel";
import type { SpatialFacet, VisualStyle } from "@atlas/kernel";
import styles from "./SpatialInspector.module.css";

interface SpatialInspectorProps {
  node: Node;
  onUpdateName: (name: string) => void;
  onUpdateVisualStyle: (property: string, value: any) => void;
  onUpdateLayer: (layer: string) => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
}

export function SpatialInspector({
  node,
  onUpdateName,
  onUpdateVisualStyle,
  onUpdateLayer,
  onToggleVisible,
  onToggleLocked,
  onDelete,
}: SpatialInspectorProps) {
  const spatial = node.facets.spatial as SpatialFacet | undefined;
  const visual = node.facets.visual as VisualStyle | undefined;

  if (!spatial) return <div className={styles.container}>No spatial data</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <input
          type="text"
          className={styles.nameInput}
          value={node.name}
          onChange={(e) => onUpdateName(e.target.value)}
        />
        <button className={styles.deleteButton} onClick={onDelete} title="Delete">
          🗑️
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic</h3>
        
        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <div className={styles.value}>{node.kind}</div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Layer</label>
          <input
            type="text"
            className={styles.input}
            value={spatial.layer}
            onChange={(e) => onUpdateLayer(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={spatial.visible}
              onChange={onToggleVisible}
            />
            Visible
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={spatial.locked}
              onChange={onToggleLocked}
            />
            Locked
          </label>
        </div>
      </section>

      {visual && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Appearance</h3>

          <div className={styles.field}>
            <label className={styles.label}>Fill Color</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={visual.fill || "#90caf9"}
                onChange={(e) => onUpdateVisualStyle("fill", e.target.value)}
              />
              <input
                type="text"
                className={styles.input}
                value={visual.fill || "#90caf9"}
                onChange={(e) => onUpdateVisualStyle("fill", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Stroke Color</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={visual.stroke || "#1976d2"}
                onChange={(e) => onUpdateVisualStyle("stroke", e.target.value)}
              />
              <input
                type="text"
                className={styles.input}
                value={visual.stroke || "#1976d2"}
                onChange={(e) => onUpdateVisualStyle("stroke", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Stroke Width</label>
            <input
              type="number"
              className={styles.input}
              value={visual.strokeWidth || 2}
              min={0}
              max={20}
              onChange={(e) => onUpdateVisualStyle("strokeWidth", Number(e.target.value))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Opacity</label>
            <input
              type="range"
              className={styles.slider}
              value={visual.opacity || 1}
              min={0}
              max={1}
              step={0.1}
              onChange={(e) => onUpdateVisualStyle("opacity", Number(e.target.value))}
            />
            <span className={styles.sliderValue}>{Math.round((visual.opacity || 1) * 100)}%</span>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Geometry</h3>
        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <div className={styles.value}>{spatial.geometry.type}</div>
        </div>

        {spatial.geometry.type === "polygon" && (
          <div className={styles.field}>
            <label className={styles.label}>Vertices</label>
            <div className={styles.value}>{spatial.geometry.points.length}</div>
          </div>
        )}

        {spatial.geometry.type === "polyline" && (
          <div className={styles.field}>
            <label className={styles.label}>Points</label>
            <div className={styles.value}>{spatial.geometry.points.length}</div>
          </div>
        )}
      </section>
    </div>
  );
}
