import type { WorldState } from "@atlas/kernel";
import styles from "./StateSelector.module.css";

interface StateSelectorProps {
  states: WorldState[];
  activeStateId?: string;
  onSelectState: (stateId: string) => void;
}

export function StateSelector({
  states,
  activeStateId,
  onSelectState,
}: StateSelectorProps) {
  return (
    <div className={styles.selector}>
      <label htmlFor="state-select" className={styles.label}>
        World State:
      </label>
      <select
        id="state-select"
        className={styles.select}
        value={activeStateId}
        onChange={(e) => onSelectState(e.target.value)}
      >
        {states.map((state) => (
          <option key={state.id} value={state.id}>
            {state.name}
          </option>
        ))}
      </select>
    </div>
  );
}
