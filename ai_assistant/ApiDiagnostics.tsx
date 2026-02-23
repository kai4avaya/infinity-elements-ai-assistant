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

type ConversationSummary = {
  agentStatus: string | null;
  agentName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  interactionId: string | null;
  interactionStatus: string | null;
  interactionType: string | null;
  queueName: string | null;
  notes: string | null;
  subject: string | null;
};

type LiveConversationMessage = {
  id: string;
  timestamp: number;
  from: string;
  text: string;
  type: "customer" | "agent" | "system";
};

type ApiDiagnosticsProps = {
  api: ElementAPI;
  isReady: boolean;
  open: boolean;
  onToggle: () => void;
  liveConversation?: LiveConversationMessage[];
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

// Helper function to extract conversation summary from API data
const extractConversationSummary = (entries: DiagnosticsEntry[]): ConversationSummary => {
  const summary: ConversationSummary = {
    agentStatus: null,
    agentName: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    interactionId: null,
    interactionStatus: null,
    interactionType: null,
    queueName: null,
    notes: null,
    subject: null,
  };

  // Find getUserInfo entry for agent info
  const userInfoEntry = entries.find(e => e.label === "getUserInfo" && e.status === "success");
  if (userInfoEntry?.data) {
    const userData = userInfoEntry.data as any;
    summary.agentName = userData.fullName || userData.displayName || null;
    summary.agentStatus = userData.agentStatus || userData.status || null;
  }

  // Find getInteraction entry for interaction details
  const interactionEntry = entries.find(e => e.label === "getInteraction" && e.status === "success");
  if (interactionEntry?.data) {
    const interactionData = interactionEntry.data as any;
    summary.interactionId = interactionData.interactionId || interactionData.id || null;
    summary.interactionStatus = interactionData.status || null;
    summary.interactionType = interactionData.commType || interactionData.initialCommType || null;
    summary.queueName = interactionData.queue?.name || null;
    summary.notes = interactionData.details?.notes || null;
    summary.subject = interactionData.details?.subject || null;
    
    // Customer info from interaction
    if (interactionData.customer) {
      summary.customerName = interactionData.customer.name || null;
      summary.customerEmail = interactionData.customer.email || null;
      summary.customerPhone = interactionData.customer.phoneNumber?.formatted?.display || 
                              interactionData.customer.phoneNumber || null;
    }
  }

  // Also check getUserInteractions for additional customer info
  const interactionsEntry = entries.find(e => e.label === "getUserInteractions" && e.status === "success");
  if (interactionsEntry?.data) {
    const interactionsData = interactionsEntry.data as any;
    const interactions = interactionsData.interactions || [];
    const activeInteraction = interactions.find((i: any) => i.status === "connected" || i.status === "active");
    
    if (activeInteraction) {
      // Fill in any missing data from getUserInteractions
      if (!summary.interactionId) {
        summary.interactionId = activeInteraction.interactionId || activeInteraction.id || null;
      }
      if (!summary.interactionStatus) {
        summary.interactionStatus = activeInteraction.status || null;
      }
      if (!summary.interactionType) {
        summary.interactionType = activeInteraction.commType || null;
      }
      if (!summary.queueName) {
        summary.queueName = activeInteraction.queue?.name || null;
      }
      if (!summary.customerName && activeInteraction.customer) {
        summary.customerName = activeInteraction.customer.name || null;
      }
      if (!summary.customerEmail && activeInteraction.customer) {
        summary.customerEmail = activeInteraction.customer.email || null;
      }
      if (!summary.customerPhone && activeInteraction.customer) {
        summary.customerPhone = activeInteraction.customer.phoneNumber?.formatted?.display || 
                                activeInteraction.customer.phoneNumber || null;
      }
      if (!summary.notes && activeInteraction.details) {
        summary.notes = activeInteraction.details.notes || null;
      }
      if (!summary.subject && activeInteraction.details) {
        summary.subject = activeInteraction.details.subject || null;
      }
    }
  }

  return summary;
};

export default function ApiDiagnostics({ api, isReady, open, onToggle, liveConversation }: ApiDiagnosticsProps) {
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
          {/* Conversation Summary Section */}
          {entries.length > 0 && (
            <div className={styles.conversationSummary}>
              <div className={styles.conversationSummaryHeader}>
                Conversation Data Summary
              </div>
              <div className={styles.conversationSummaryContent}>
                {(() => {
                  const summary = extractConversationSummary(entries);
                  const hasAnyData = Object.values(summary).some(v => v !== null);
                  
                  if (!hasAnyData) {
                    return <div className={styles.noData}>No conversation data available yet. Run API calls to populate.</div>;
                  }

                  return (
                    <>
                      {summary.agentName && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Agent:</span>
                          <span className={styles.summaryValue}>{summary.agentName}</span>
                        </div>
                      )}
                      {summary.agentStatus && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Agent Status:</span>
                          <span className={styles.summaryValue}>{summary.agentStatus}</span>
                        </div>
                      )}
                      {summary.customerName && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Customer:</span>
                          <span className={styles.summaryValue}>{summary.customerName}</span>
                        </div>
                      )}
                      {summary.customerEmail && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Customer Email:</span>
                          <span className={styles.summaryValue}>{summary.customerEmail}</span>
                        </div>
                      )}
                      {summary.customerPhone && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Customer Phone:</span>
                          <span className={styles.summaryValue}>{summary.customerPhone}</span>
                        </div>
                      )}
                      {summary.interactionId && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Interaction ID:</span>
                          <span className={styles.summaryValue}>{summary.interactionId}</span>
                        </div>
                      )}
                      {summary.interactionStatus && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Interaction Status:</span>
                          <span className={styles.summaryValue}>{summary.interactionStatus}</span>
                        </div>
                      )}
                      {summary.interactionType && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Channel:</span>
                          <span className={styles.summaryValue}>{summary.interactionType}</span>
                        </div>
                      )}
                      {summary.queueName && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Queue:</span>
                          <span className={styles.summaryValue}>{summary.queueName}</span>
                        </div>
                      )}
                      {summary.subject && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Subject:</span>
                          <span className={styles.summaryValue}>{summary.subject}</span>
                        </div>
                      )}
                      {summary.notes && (
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>Notes:</span>
                          <span className={styles.summaryValue}>{summary.notes}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Live Conversation Section */}
          <div className={styles.liveConversation}>
            <div className={styles.liveConversationHeader}>
              Live Conversation ({liveConversation?.length || 0} messages)
            </div>
            <div className={styles.liveConversationContent}>
              {!liveConversation || liveConversation.length === 0 ? (
                <div className={styles.noData}>
                  No live conversation messages yet. Messages will appear here as they arrive in real-time.
                </div>
              ) : (
                liveConversation.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`${styles.liveMessage} ${styles[`liveMessage${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}`]}`}
                  >
                    <div className={styles.liveMessageHeader}>
                      <span className={styles.liveMessageType}>[{msg.type.toUpperCase()}]</span>
                      <span className={styles.liveMessageFrom}>{msg.from}</span>
                      <span className={styles.liveMessageTime}>{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className={styles.liveMessageText}>{msg.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>

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
