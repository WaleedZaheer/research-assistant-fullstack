"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import styles from "./Confirm.module.css";

interface ConfirmOptions {
  title: string;
  message: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  function handleChoice(result: boolean) {
    if (resolver) resolver(result);
    setOptions(null);
    setResolver(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <h3 className={styles.title}>{options.title}</h3>
            <p className={styles.message}>{options.message}</p>
            <div className={styles.actions}>
              <button className={styles.cancelButton} onClick={() => handleChoice(false)}>
                Cancel
              </button>
              <button className={styles.confirmButton} onClick={() => handleChoice(true)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}
