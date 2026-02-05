import { useEffect, useRef, useState } from "react";
import type { ElementAPI } from "@avaya/infinity-elements-api";
import styles from "./Element.module.css";

type DiagnosticsEntry = {
  id: string;
  label: string;
  status: "pending" | "success" | "error";
  timestamp: number;
  data?: unknown;
  error?: string;
};

type ApiDiagnosticsProps = {
  api: ElementAPI;
  isReady: boolean;
  open: boolean;
  onToggle: () => void;
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString();

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return String(err || value);
  }
};

export default function ApiDiagnostics({ api, isReady, open, onToggle }: ApiDiagnosticsProps) {
  const [entries, setEntries] = useState<DiagnosticsEntry[]>([]);
  const hasRunRef = useRef(false);

  const pushEntry = (entry: DiagnosticsEntry) =>
    setEntries((prev) => [entry, ...prev].slice(0, 200));

  const runCall = async (label: string, fn: () => Promise<unknown>) => {
    const id = `${label}-${Date.now()}`;
    pushEntry({ id, label, status: "pending", timestamp: Date.now() });
    try {
      const data = await fn();
      pushEntry({
        id,
        label,
        status: "success",
        timestamp: Date.now(),
        data,
      });
    } catch (err) {
      pushEntry({
        id,
        label,
        status: "error",
        timestamp: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const runLocalStorageTest = () => {
    const id = `localStorage-test-${Date.now()}`;
    try {
      localStorage.setItem("ai-assistant-test", "ok");
      const value = localStorage.getItem("ai-assistant-test");
      pushEntry({
        id,
        label: "localStorage test",
        status: value === "ok" ? "success" : "error",
        timestamp: Date.now(),
        data: { value },
        error: value === "ok" ? undefined : "Mismatch reading localStorage",
      });
    } catch (err) {
      pushEntry({
        id,
        label: "localStorage test",
        status: "error",
        timestamp: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const runAll = async () => {
    await runCall("getUserInfo", () => api.getUserInfo());
    await runCall("getUserQueues", () => api.getUserQueues());
    await runCall("getReasonCodes", () => api.getReasonCodes());
    await runCall("getInteraction", () => api.getInteraction());
    await runCall("getUserInteractions", () => api.getUserInteractions());
    runLocalStorageTest();
  };

  useEffect(() => {
    if (!open || !isReady || hasRunRef.current) return;
    hasRunRef.current = true;
    runAll();
  }, [open, isReady]);

  return (
    <div className={styles.diagnosticsWrapper}>
      <button
        className={styles.diagnosticsToggle}
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? "Hide API Diagnostics" : "Show API Diagnostics"}
      </button>

      {open && (
        <div className={styles.diagnosticsPanel}>
          <div className={styles.diagnosticsControls}>
            <button onClick={runAll}>Run All</button>
            <button onClick={() => runCall("getUserInfo", () => api.getUserInfo())}>
              getUserInfo
            </button>
            <button onClick={() => runCall("getUserQueues", () => api.getUserQueues())}>
              getUserQueues
            </button>
            <button onClick={() => runCall("getReasonCodes", () => api.getReasonCodes())}>
              getReasonCodes
            </button>
            <button onClick={() => runCall("getInteraction", () => api.getInteraction())}>
              getInteraction
            </button>
            <button
              onClick={() =>
                runCall("getUserInteractions", () => api.getUserInteractions())
              }
            >
              getUserInteractions
            </button>
            <button onClick={runLocalStorageTest}>localStorage test</button>
          </div>

          <div className={styles.diagnosticsLog}>
            {entries.length === 0 ? (
              <div className={styles.diagnosticsEmpty}>No diagnostics yet.</div>
            ) : (
              entries.map((entry) => (
                <div
                  key={`${entry.id}-${entry.status}`}
                  className={`${styles.diagnosticsEntry} ${
                    entry.status === "success"
                      ? styles.diagnosticsEntrySuccess
                      : entry.status === "error"
                      ? styles.diagnosticsEntryError
                      : styles.diagnosticsEntryPending
                  }`}
                >
                  <div className={styles.diagnosticsEntryHeader}>
                    <span>{formatTime(entry.timestamp)}</span>
                    <span>{entry.label}</span>
                    <span>{entry.status.toUpperCase()}</span>
                  </div>
                  {entry.error && (
                    <pre className={styles.diagnosticsEntryBody}>{entry.error}</pre>
                  )}
                  {entry.data !== undefined && (
                    <pre className={styles.diagnosticsEntryBody}>
                      {safeStringify(entry.data)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
