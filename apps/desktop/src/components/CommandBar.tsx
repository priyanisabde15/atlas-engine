import { useState, useEffect } from "react";
import { CommandBus } from "@atlas/kernel";
import styles from "./CommandBar.module.css";

interface CommandBarProps {
  commandBus: CommandBus;
  onCommandExecuted?: () => void;
}

export function CommandBar({ commandBus, onCommandExecuted }: CommandBarProps) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateState = () => {
    setCanUndo(commandBus.canUndo());
    setCanRedo(commandBus.canRedo());
  };

  useEffect(() => {
    updateState();
    const unsubscribe = commandBus.subscribe(() => {
      updateState();
      onCommandExecuted?.();
    });
    return unsubscribe;
  }, [commandBus, onCommandExecuted]);

  const handleUndo = () => {
    commandBus.undo();
  };

  const handleRedo = () => {
    commandBus.redo();
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
