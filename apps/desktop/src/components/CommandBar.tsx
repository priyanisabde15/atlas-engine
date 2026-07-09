import { useState } from "react";
import { CommandBus } from "@atlas/kernel";
import styles from "./CommandBar.module.css";

const commandBus = new CommandBus();

export function CommandBar() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateState = () => {
    setCanUndo(commandBus.canUndo());
    setCanRedo(commandBus.canRedo());
  };

  const handleUndo = () => {
    commandBus.undo();
    updateState();
  };

  const handleRedo = () => {
    commandBus.redo();
    updateState();
  };

  return (
    <div className={styles.commandBar}>
      <button
        className={styles.button}
        onClick={handleUndo}
        disabled={!canUndo}
        title="Undo"
      >
        ↶
      </button>
      <button
        className={styles.button}
        onClick={handleRedo}
        disabled={!canRedo}
        title="Redo"
      >
        ↷
      </button>
    </div>
  );
}
