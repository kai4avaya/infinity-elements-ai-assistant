import * as pdfjsLib from "pdfjs-dist";
import type { StoredDocument } from "./Element.types";
import {
  localDocumentsKey,
  localConversationsKey,
  sharedDocumentsKey,
  sharedConversationsKey,
} from "./Element.constants";

// Local storage helpers
export const loadLocalDocuments = (): StoredDocument[] => {
  try {
    const raw =
      localStorage.getItem(sharedDocumentsKey) ||
      localStorage.getItem(localDocumentsKey);
    return raw ? (JSON.parse(raw) as StoredDocument[]) : [];
  } catch (err) {
    console.error("[AI Assistant] Failed to read local documents:", err);
    return [];
  }
};

export const saveLocalDocuments = (docs: StoredDocument[]) => {
  try {
    localStorage.setItem(sharedDocumentsKey, JSON.stringify(docs));
    localStorage.setItem(localDocumentsKey, JSON.stringify(docs));
  } catch (err) {
    console.error("[AI Assistant] Failed to save local documents:", err);
  }
};

export const loadLocalConversations = () => {
  try {
    const raw =
      localStorage.getItem(sharedConversationsKey) ||
      localStorage.getItem(localConversationsKey);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("[AI Assistant] Failed to read local conversations:", err);
    return [];
  }
};

export const saveLocalConversations = (conversations: unknown[]) => {
  try {
    localStorage.setItem(sharedConversationsKey, JSON.stringify(conversations));
    localStorage.setItem(localConversationsKey, JSON.stringify(conversations));
  } catch (err) {
    console.error("[AI Assistant] Failed to save local conversations:", err);
  }
};

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// PDF extraction
export const extractPDFText = async (
  file: File
): Promise<{ text: string; pageCount: number }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    const pageCount = pdf.numPages;

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: unknown) => (item as { str: string }).str).join(" ");
      fullText += pageText + "\n";
    }

    return { text: fullText.trim(), pageCount };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

// Queue label helper
export const getPrimaryQueueLabel = (
  agentInfo: {
    queues?: Array<string | { name?: string; queueName?: string }>;
    agentStatus?: string;
  } | null
): string => {
  const primary = agentInfo?.queues?.[0];
  if (!primary) return agentInfo?.agentStatus ?? "";
  if (typeof primary === "string") return primary;
  if (typeof primary === "object") {
    const queue = primary as { name?: string; queueName?: string };
    return queue.name || queue.queueName || agentInfo?.agentStatus || "";
  }
  return agentInfo?.agentStatus ?? "";
};

// Timestamp formatter
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
