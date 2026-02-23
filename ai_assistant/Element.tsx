import { ElementAPI } from "@avaya/infinity-elements-api";
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import * as pdfjsLib from "pdfjs-dist";
import ApiDiagnostics from "./ApiDiagnostics";
import DocumentEditor from "./DocumentEditor";
import styles from "./Element.module.css";
import type {
  ConversationMessage,
  ChatMessage,
  StoredDocument,
  AgentInfo,
  CustomerInfo,
  SavedConversation,
  InteractionInfo,
} from "./Element.types";
import {
  // localDocumentsKey,
  // localConversationsKey,
  // sharedDocumentsKey,
  // sharedConversationsKey,
  sharedDbName,
  documentDbVersion,
  getCompanyDocuments,
} from "./Element.constants";
import {
  loadLocalDocuments,
  saveLocalDocuments,
  loadLocalConversations,
  saveLocalConversations,
  // formatFileSize,
  // extractPDFText,
  getPrimaryQueueLabel,
  formatTimestamp,
} from "./Element.utils";
import { AI_BACKEND_URL } from "./config";

// Configure PDF.js worker
console.log("[AI Assistant] Setting up PDF.js worker...");
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  console.log("[AI Assistant] PDF.js worker configured, version:", pdfjsLib.version);
} catch (err) {
  console.error("[AI Assistant] PDF.js worker setup failed:", err);
}

// Create API instance
console.log("[AI Assistant] Creating ElementAPI instance...");
let api;
try {
  api = new ElementAPI({
    elementId: "ai-assistant",
    debug: true,
  });
  console.log("[AI Assistant] ElementAPI instance created successfully");
} catch (err) {
  console.error("[AI Assistant] ElementAPI instance creation failed:", err);
  throw err;
}

export default function Element() {
  console.log("[AI Assistant] React component function called - starting initialization...");
  
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [interactionInfo, setInteractionInfo] = useState<InteractionInfo | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<StoredDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const currentConversationIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);
  const conversationPanelRef = useRef<HTMLElement | null>(null);
  const documentPanelRef = useRef<HTMLElement | null>(null);
  const showCustomerInfo = false;
  const MAX_DOC_LENGTH = 10000; // Max characters per document
  const MAX_PROMPT_LENGTH = 50000; // Warning threshold
  const [showSizeWarning, setShowSizeWarning] = useState(false);

  // Notify core-agent-ui that the element is ready
  useEffect(() => {
    console.log("[AI Assistant] Broadcasting element-ready...");
    const readyChannel = new BroadcastChannel("element-ready");
    readyChannel.postMessage({ ready: true });
    readyChannel.close();
    setIsReady(true);
  }, []);

  // Initialize IndexedDB for document storage
  useEffect(() => {
    if (!isReady) return;
    console.log("[AI Assistant] IndexedDB useEffect triggered - checking support...");
    
    // Check if IndexedDB is available in this environment
    if (!('indexedDB' in window)) {
      console.log("[AI Assistant] IndexedDB is NOT available in this environment - using localStorage fallback");
      return;
    }
    console.log("[AI Assistant] IndexedDB is available, starting initialization...");
    
    const initDB = async () => {
      try {
        console.log("[AI Assistant] Calling initDocumentDB()...");
        await initDocumentDB();
        console.log("[AI Assistant] initDocumentDB() completed successfully");
        
        console.log("[AI Assistant] Loading stored documents...");
        await loadStoredDocuments();
        console.log("[AI Assistant] Stored documents loaded");
        
        console.log("[AI Assistant] Loading company documents...");
        await loadCompanyDocuments();
        console.log("[AI Assistant] Company documents loaded");
        
        console.log("[AI Assistant] Loading saved conversations...");
        await loadSavedConversations();
        console.log("[AI Assistant] Saved conversations loaded - IndexedDB init complete");
      } catch (err) {
        console.error("[AI Assistant] Failed to initialize document storage:", err);
        setStorageAvailable(false);
        console.log("[AI Assistant] Document storage unavailable in Infinity (running without persistence)");
        setStoredDocuments(loadLocalDocuments());
        setSavedConversations(loadLocalConversations());
      }
    };
    initDB();
  }, [isReady]);

  // Always load company documents on ready
  useEffect(() => {
    if (!isReady) return;
    loadCompanyDocuments();
  }, [isReady]);

  // Fetch agent info from Infinity API
  useEffect(() => {
    if (!isReady) return;
    const fetchAgentInfo = async () => {
      try {
        console.log("[AI Assistant] Fetching agent info...");
        const userInfo = await api.getUserInfo();
        console.log("[AI Assistant] Received user info:", userInfo);
        setAgentInfo({
          id: userInfo.id,
          displayName: userInfo.displayName,
          email: userInfo.email,
          agentStatus: userInfo.agentStatus,
          queues: userInfo.queues || [],
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          title: userInfo.title,
        });
      } catch (err) {
        console.error("[AI Assistant] Failed to fetch agent info:", err);
      }
    };
    fetchAgentInfo();
  }, [isReady]);

  const loadCompanyDocuments = async () => {
    setCompanyDocuments(getCompanyDocuments());
  };

  // Load agent and interaction data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get agent information with richer fields
        const userInfo: any = await api.getUserInfo();
        setAgentInfo({
          id: userInfo.userId,
          displayName: userInfo.displayName || userInfo.fullName || "Unknown Agent",
          email: userInfo.email || "",
          agentStatus: userInfo.agentStatus || "Unknown",
          queues: userInfo.queues?.map((q: any) => q.name || q.queueName) || [],
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          title: userInfo.title,
        });

        // Get current interaction for conversation, customer, and interaction info
        try {
          const interaction: any = await api.getInteraction();
          if (interaction.customer) {
            setCustomerInfo({
              name: interaction.customer.name,
              phoneNumber: interaction.customer.phoneNumber?.formatted?.display || interaction.customer.number,
              email: interaction.customer.email || "",
              accountNumber: interaction.customer.id,
              firstName: interaction.customer.name?.split(' ')[0],
              lastName: interaction.customer.name?.split(' ').slice(1).join(' '),
            });
          }

          // Capture interaction info including notes, CRM data
          setInteractionInfo({
            id: interaction.id || interaction.interactionId,
            notes: interaction.details?.notes,
            subject: interaction.details?.subject,
            result: interaction.details?.result,
            queueName: interaction.queue?.name,
            crmData: interaction.custom?.crm,
            customer: {
              name: interaction.customer?.name,
              email: interaction.customer?.email,
              phoneNumber: interaction.customer?.phoneNumber,
            },
          });

          // Load conversation history
          await loadConversationHistory(interaction.interactionId || interaction.id);
        } catch (interactionError) {
          console.log("No active interaction:", interactionError);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError("Failed to load agent information");
      }
    };

    loadData();

    // Set up event listeners for real-time updates
    const unsubscribeInteractionAccepted = api.onInteractionAccepted(async (interactionId) => {
      console.log("New interaction accepted:", interactionId);
      await loadConversationHistory(interactionId);
      // Refresh customer info
      try {
        const interaction: any = await api.getInteraction();
        if (interaction.customer) {
          setCustomerInfo({
            name: interaction.customer.name,
            phoneNumber: interaction.customer.number,
            email: interaction.customer.email || "",
            accountNumber: interaction.customer.id,
          });
        }
      } catch (err) {
        console.error("Failed to get interaction details:", err);
      }
    });

    // Helper function to extract text from a message (from Infinity API docs)
    const getMessageText = (msg: any): string => {
      if (typeof msg.message === 'string') {
        return msg.message;
      }
      // Handle rich content array
      if (Array.isArray(msg.message)) {
        return msg.message
          .map((part: any) => {
            if (part.type === 'text') return part.text;
            if (part.type === 'email' && part.email) return part.email.plainText;
            return ''; // Skip other types (images, etc.)
          })
          .join(' ')
          .trim();
      }
      return '';
    };

    const unsubscribeFeedMessage = api.onReceivedFeedMessage((message: any) => {
      console.log("Received feed message:", message);
      console.log("Feed message keys:", Object.keys(message || {}));
      
      // Log the full message structure for debugging
      console.log("Feed message structure:", JSON.stringify(message, null, 2));
      
      // Extract text using the documented approach
      const messageText = getMessageText(message);
      
      // Get sender from various possible display name fields (leave blank if not found)
      const sender = message.author?.displayName || 
                     message.author?.details?.displayName || 
                     message.displayNameOverride || 
                     "";
      
      // Determine message type based on direction field (most reliable)
      // direction: "in" = incoming from customer, "out" = outgoing from agent
      let messageType: "customer" | "agent" | "system" = "agent";
      
      if (message.direction === "in") {
        messageType = "customer";
      } else if (message.direction === "out") {
        if (message.isPrivate) {
          messageType = "system";
        } else {
          messageType = "agent";
        }
      }
      
      // Add new message to conversation
      const newMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        from: sender,
        text: messageText,
        type: messageType,
      };
      console.log("Created conversation message:", newMessage);
      setConversation(prev => [...prev, newMessage]);
    });

    const unsubscribeError = api.onError((error) => {
      console.error("API Error:", error);
      setError(error.message);
    });

    return () => {
      unsubscribeInteractionAccepted();
      unsubscribeFeedMessage();
      unsubscribeError();
      api.destroy();
    };
  }, []);

  // IndexedDB functions
  const resolveDocumentDbName = async () => {
    try {
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        const sharedDb = databases.find((db) => db.name === sharedDbName);
        if (sharedDb) {
          return sharedDbName;
        }
      }
    } catch (err) {
      console.warn("[AI Assistant] Unable to inspect IndexedDB databases:", err);
    }
    return "AIAssistantDB";
  };

  const initDocumentDB = async (): Promise<IDBDatabase> => {
    const dbName = await resolveDocumentDbName();
    console.log("[AI Assistant] initDocumentDB() called - opening database:", dbName);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, documentDbVersion);
      
      request.onerror = () => {
        console.error("[AI Assistant] IndexedDB open error:", request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log("[AI Assistant] IndexedDB opened successfully");
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        console.log("[AI Assistant] IndexedDB upgrade needed - creating object stores...");
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("documents")) {
          const store = db.createObjectStore("documents", { keyPath: "id" });
          store.createIndex("uploadTime", "uploadTime", { unique: false });
          console.log("[AI Assistant] Created 'documents' object store");
        }
        if (!db.objectStoreNames.contains("conversations")) {
          const conversationStore = db.createObjectStore("conversations", { keyPath: "id" });
          conversationStore.createIndex("createdAt", "createdAt", { unique: false });
          conversationStore.createIndex("updatedAt", "updatedAt", { unique: false });
          console.log("[AI Assistant] Created 'conversations' object store");
        }
      };
    });
  };

  const loadStoredDocuments = async () => {
    if (!storageAvailable) {
      setStoredDocuments(loadLocalDocuments());
      return;
    }
    try {
      const db = await initDocumentDB();
      const transaction = db.transaction("documents", "readonly");
      const store = transaction.objectStore("documents");
      const request = store.getAll();
      
      request.onsuccess = () => {
        setStoredDocuments(request.result);
      };
      request.onerror = () => {
        console.error("Failed to load documents:", request.error);
      };
    } catch (err) {
      console.error("Failed to load stored documents:", err);
      setStoredDocuments(loadLocalDocuments());
    }
  };

  const storeDocument = async (document: StoredDocument) => {
    if (!storageAvailable) {
      setStoredDocuments((prev) => {
        const updated = [...prev, document];
        saveLocalDocuments(updated);
        return updated;
      });
      return;
    }
    try {
      const db = await initDocumentDB();
      const transaction = db.transaction("documents", "readwrite");
      const store = transaction.objectStore("documents");
      const request = store.add(document);
      
      request.onsuccess = () => {
        setStoredDocuments(prev => [...prev, document]);
      };
      request.onerror = () => {
        console.error("Failed to store document:", request.error);
      };
    } catch (err) {
      console.error("Failed to store document:", err);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!storageAvailable) {
      setStoredDocuments((prev) => {
        const updated = prev.filter(doc => doc.id !== documentId);
        saveLocalDocuments(updated);
        return updated;
      });
      return;
    }
    try {
      const db = await initDocumentDB();
      const transaction = db.transaction("documents", "readwrite");
      const store = transaction.objectStore("documents");
      const request = store.delete(documentId);
      
      request.onsuccess = () => {
        setStoredDocuments(prev => prev.filter(doc => doc.id !== documentId));
      };
      request.onerror = () => {
        console.error("Failed to delete document:", request.error);
      };
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const loadSavedConversations = async () => {
    if (!storageAvailable) {
      setSavedConversations(loadLocalConversations());
      return;
    }
    try {
      const db = await initDocumentDB();
      const transaction = db.transaction("conversations", "readonly");
      const store = transaction.objectStore("conversations");
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sortedConversations = [...request.result].sort((a, b) => b.updatedAt - a.updatedAt);
        setSavedConversations(sortedConversations);
      };
      request.onerror = () => {
        console.error("Failed to load conversations:", request.error);
      };
    } catch (err) {
      console.error("Failed to load saved conversations:", err);
      setSavedConversations(loadLocalConversations());
    }
  };

  const saveConversation = async (messages: ChatMessage[]) => {
    if (messages.length === 0) return;

    const firstUserMessage = messages.find(message => message.sender === "user");
    const rawTitle = firstUserMessage?.text?.trim() || "Conversation";
    const title = rawTitle.length > 60 ? `${rawTitle.slice(0, 57)}...` : rawTitle;
    const now = Date.now();
    const conversationId = currentConversationIdRef.current ?? `conv-${now}`;

    // Set ID immediately to prevent duplicate creation on rapid calls
    if (!currentConversationIdRef.current) {
      currentConversationIdRef.current = conversationId;
      setCurrentConversationId(conversationId);
    }

    try {
      if (!storageAvailable) {
        const fallbackConversation: SavedConversation = {
          id: conversationId,
          title,
          messages,
          createdAt: now,
          updatedAt: now,
        };
        setSavedConversations((prev) => {
          const filtered = prev.filter((conv) => conv.id !== conversationId);
          const updated = [fallbackConversation, ...filtered].slice(0, 50);
          saveLocalConversations(updated);
          return updated;
        });
        return;
      }
      const db = await initDocumentDB();
      const transaction = db.transaction("conversations", "readwrite");
      const store = transaction.objectStore("conversations");
      const existing = savedConversations.find(item => item.id === conversationId);
      const createdAt = existing?.createdAt ?? now;
      const conversation: SavedConversation = {
        id: conversationId,
        title,
        messages,
        createdAt,
        updatedAt: now,
      };

      store.put(conversation);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });

      setSavedConversations(prev => [conversation, ...prev.filter(item => item.id !== conversationId)]);
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  };

  const loadConversation = (conversation: SavedConversation) => {
    console.log("[AI Assistant] Loading conversation:", conversation.title);
    setChatMessages(conversation.messages);
    currentConversationIdRef.current = conversation.id;
    setCurrentConversationId(conversation.id);
    setShowConversationPanel(false);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const db = await initDocumentDB();
      const transaction = db.transaction("conversations", "readwrite");
      const store = transaction.objectStore("conversations");
      const request = store.delete(conversationId);
      
      request.onsuccess = () => {
        setSavedConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (currentConversationIdRef.current === conversationId) {
          currentConversationIdRef.current = null;
        }
        setCurrentConversationId(prev => (prev === conversationId ? null : prev));
        console.log("[AI Assistant] Conversation deleted");
      };
      request.onerror = () => {
        console.error("Failed to delete conversation:", request.error);
      };
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const extractPDFText = async (file: File): Promise<{ text: string; pageCount: number }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    const pageCount = pdf.numPages;
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return { text: fullText.trim(), pageCount };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

const getDocumentIcon = (mimeType: string) => {
  switch (mimeType) {
    case 'application/pdf':
      return (
        <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#c58b8b" strokeWidth="2"/>
          <path d="M14 2v6h6" stroke="#c58b8b" strokeWidth="2"/>
          <text x="12" y="16" textAnchor="middle" fill="#c58b8b" fontSize="8" fontWeight="bold">PDF</text>
        </svg>
      );
    case 'text/plain':
      return (
        <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#9ab3d9" strokeWidth="2"/>
          <path d="M14 2v6h6" stroke="#9ab3d9" strokeWidth="2"/>
          <path d="M16 13H8" stroke="#9ab3d9" strokeWidth="2"/>
          <path d="M16 17H8" stroke="#9ab3d9" strokeWidth="2"/>
          <path d="M10 9H8" stroke="#9ab3d9" strokeWidth="2"/>
        </svg>
      );
    default:
      return (
        <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#b7b1a5" strokeWidth="2"/>
          <path d="M14 2v6h6" stroke="#b7b1a5" strokeWidth="2"/>
        </svg>
      );
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getAllDocuments = () => {
    return [...companyDocuments, ...storedDocuments];
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (queryInputRef.current) {
      queryInputRef.current.style.height = "auto";
      queryInputRef.current.style.height = `${Math.min(
        queryInputRef.current.scrollHeight,
        160
      )}px`;
    }
    
    // Check for @ symbol
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const mentionText = textBeforeCursor.substring(atIndex + 1);
      const hasSpaceAfterMention = mentionText.includes(' ');
      
      if (!hasSpaceAfterMention) {
        setMentionFilter(mentionText);
        setShowMentionList(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const handleMentionSelect = (document: StoredDocument) => {
    const cursorPosition = queryInputRef.current?.selectionStart || 0;
    const textBeforeCursor = query.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const newQuery = query.substring(0, atIndex) + `@${document.name} ` + query.substring(cursorPosition);
      setQuery(newQuery);
      setShowMentionList(false);
      setMentionFilter("");
      
      // Set cursor position after the mention
      setTimeout(() => {
        const newCursorPosition = atIndex + document.name.length + 2;
        queryInputRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
        queryInputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentionList) {
      e.preventDefault();
      handleAIQuery();
      return;
    }
    
    if (!showMentionList) return;
    
    const allDocs = getAllDocuments();
    const filteredDocs = allDocs.filter(doc =>
      doc.name.toLowerCase().includes(mentionFilter.toLowerCase())
    );
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev => 
        prev < filteredDocs.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev => 
        prev > 0 ? prev - 1 : filteredDocs.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDocs[selectedMentionIndex]) {
        handleMentionSelect(filteredDocs[selectedMentionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowMentionList(false);
      setMentionFilter("");
    }
  };

  const getFilteredDocuments = () => {
    const allDocs = getAllDocuments();
    return allDocs.filter((doc) =>
      doc.name.toLowerCase().includes(mentionFilter.toLowerCase())
    );
  };

  const getLibraryDocuments = () => {
    return [...companyDocuments, ...storedDocuments];
  };

const loadConversationHistory = async (interactionId: string) => {
  // The Infinity Elements API does not provide a transcript endpoint.
  // Conversation history is built in real-time via onReceivedFeedMessage().
  // Reset to empty so we start fresh for each new interaction.
  console.log("[AI Assistant] loadConversationHistory called for interaction:", interactionId);
  setConversation([]);
};

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        let content = "";
        let pageCount: number | undefined;
        
        if (file.type === "text/plain") {
          content = await file.text();
        } else if (file.type === "application/pdf") {
          // Use PDF.js for proper PDF text extraction
          const pdfData = await extractPDFText(file);
          content = pdfData.text;
          pageCount = pdfData.pageCount;
        } else {
          content = `Unsupported file type: ${file.type}`;
        }

        const document: StoredDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type.split('/')[1] || 'unknown',
          mimeType: file.type,
          content,
          uploadTime: Date.now(),
          size: file.size,
          pageCount,
        };

        await storeDocument(document);
      } catch (err) {
        console.error("Failed to process file:", err);
        setError(`Failed to process file: ${file.name}`);
      }
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopyMessage = async (messageId: string, text: string) => {
    console.log("[AI Assistant] Copying message:", messageId, text?.substring(0, 50));
    try {
      if (!text) {
        console.warn("[AI Assistant] No text to copy");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(messageId);
      setNotice("Message copied");
      setTimeout(() => setNotice(null), 1500);
      console.log("[AI Assistant] Copied message ID:", messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
        console.log("[AI Assistant] Reset copied message ID");
      }, 2000);
    } catch (err) {
      console.error('[AI Assistant] Failed to copy message:', err);
    }
  };

  const handleRetryMessage = async (messageId: string, originalUserMessage: string) => {
    setRetryingMessageId(messageId);
    try {
      // Remove the previous AI message
      setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
      // Resend the user's message to trigger a new AI response
      setQuery(originalUserMessage);
      await handleAIQuery(originalUserMessage);
    } catch (err) {
      console.error('Failed to retry message:', err);
    } finally {
      setRetryingMessageId(null);
    }
  };

  // Handle send AI message to customer chat
  const handleSendMessageToChat = async (text: string) => {
    try {
      if (!interactionInfo?.id) {
        console.warn("[AI Assistant] No active interaction to send message to");
        setError("No active customer chat to send message to");
        return;
      }

      await api.sendChatMessage({
        interactionId: interactionInfo.id,
        text: text,
      });

      console.log("[AI Assistant] Sent AI message to customer chat");
      setNotice("Message sent to customer chat");
      setTimeout(() => setNotice(null), 2000);
    } catch (err) {
      console.error("[AI Assistant] Failed to send message to chat:", err);
      setError("Failed to send message to customer chat");
    }
  };

  // Handle start editing AI message
  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  // Handle save edited message
  const handleSaveEdit = (messageId: string) => {
    setChatMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === messageId ? { ...msg, text: editText } : msg
      );
      void saveConversation(updated);
      return updated;
    });
    setEditingMessageId(null);
    setEditText("");
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  // Handle send document to chat as file attachment
  const handleSendDocumentToChat = async (doc: StoredDocument) => {
    try {
      if (!interactionInfo?.id) {
        console.warn("[AI Assistant] No active interaction to send document to");
        setError("No active customer chat to send document to");
        return;
      }
      
      if (!doc.content) {
        console.warn("[AI Assistant] Document has no content to send:", doc.name);
        setError("Document has no content to send");
        return;
      }

      const baseName = doc.name.replace(/\.[^/.]+$/, "");
      const safeHtml = doc.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><pre>${safeHtml}</pre></body></html>`;
      const blob = new Blob([docHtml], { type: "application/msword" });
      const file = new File([blob], `${baseName}.doc`, { type: "application/msword" });

      await api.sendChatMessage({
        interactionId: interactionInfo.id,
        text: `Document: ${file.name}`,
        file: file,
        fileName: file.name,
      });

      console.log("[AI Assistant] Sent document to chat:", doc.name);
      setNotice(`Sent "${file.name}" to chat`);
      setTimeout(() => setNotice(null), 2000);
    } catch (err) {
      console.error("[AI Assistant] Failed to send document to chat:", err);
      setError("Failed to send document to customer chat");
    }
  };

  // Handle send document text content to chat (as text message)
  const handleSendDocumentTextToChat = async (doc: StoredDocument) => {
    try {
      if (!interactionInfo?.id) {
        console.warn("[AI Assistant] No active interaction to send document text to");
        setError("No active customer chat to send document to");
        return;
      }
      
      if (!doc.content) {
        console.warn("[AI Assistant] Document has no content to send:", doc.name);
        setError("Document has no content to send");
        return;
      }

      // Truncate if too long for chat
      const maxChatLength = 4000;
      let contentToSend = doc.content;
      let truncated = false;
      
      if (contentToSend.length > maxChatLength) {
        contentToSend = contentToSend.substring(0, maxChatLength) + "\n\n[Document truncated due to length...]";
        truncated = true;
      }

      // Send document content as text message
      await api.sendChatMessage({
        interactionId: interactionInfo.id,
        text: `Document "${doc.name}":\n\n${contentToSend}`,
      });

      console.log("[AI Assistant] Sent document text to chat:", doc.name, truncated ? "(truncated)" : "");
      setNotice(`Sent "${doc.name}" content to chat${truncated ? " (truncated)" : ""}`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error("[AI Assistant] Failed to send document text to chat:", err);
      setError("Failed to send document content to customer chat");
    }
  };

  // Handle download document from library
  const handleDownloadDocument = async (doc: StoredDocument) => {
    console.log("[AI Assistant] Download requested for:", doc.name);
    
    if (!doc.content) {
      console.warn("[AI Assistant] Document has no content to download:", doc.name);
      setError("Document has no content to download");
      return;
    }
    
    // Since iframe sandbox blocks downloads, copy to clipboard instead
    try {
      await navigator.clipboard.writeText(doc.content);
      console.log("[AI Assistant] Document copied to clipboard:", doc.name);
      setNotice(`"${doc.name}" copied to clipboard`);
      setTimeout(() => setNotice(null), 2000);
    } catch (clipboardErr) {
      console.warn("[AI Assistant] Clipboard API blocked, trying execCommand:", clipboardErr);
      try {
        const textarea = document.createElement("textarea");
        textarea.value = doc.content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (copied) {
          console.log("[AI Assistant] Document copied to clipboard (fallback):", doc.name);
          setNotice(`"${doc.name}" copied to clipboard`);
          setTimeout(() => setNotice(null), 2000);
          return;
        }
      } catch (fallbackErr) {
        console.error("[AI Assistant] execCommand copy failed:", fallbackErr);
      }

      setError("Copy blocked by browser policy. Please open the document and manually select + copy the text.");
    }
  };

  const handleAIQuery = async (overrideQuery?: string) => {
    const activeQuery = overrideQuery ?? query;
    if (!activeQuery.trim()) return;

    // Extract mentioned documents from the query
    const mentionedDocs: string[] = [];
    const mentionRegex = /@([^@\s]+)/g;
    let match;
    while ((match = mentionRegex.exec(activeQuery)) !== null) {
      mentionedDocs.push(match[1]);
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      timestamp: Date.now(),
      sender: "user",
      text: activeQuery,
      mentionedDocuments: mentionedDocs,
    };
    setChatMessages(prev => {
      const updatedMessages = [...prev, userMessage];
      void saveConversation(updatedMessages);
      return updatedMessages;
    });

    setIsLoading(true);
    setError(null);
    setStreamingResponse("");
    setIsStreaming(true);

    try {
      // Prepare conversation transcript (limit to last 20 messages to control size)
      const transcript = conversation
        .slice(-20)
        .map(msg => `[${msg.type.toUpperCase()}] ${msg.from}: ${msg.text}`)
        .join("\n");

      // Prepare document context - ONLY include @mentioned documents
      const allDocs = [...storedDocuments, ...companyDocuments];
      const mentionedDocNames = mentionedDocs.map(name => name.toLowerCase());
      
      const relevantDocs = allDocs.filter(doc =>
        mentionedDocNames.some(mention => doc.name.toLowerCase().includes(mention))
      );

      // Truncate large documents and track which were truncated
      const truncatedDocNames: string[] = [];
      const documentContext = relevantDocs
        .map(doc => {
          if (doc.content.length > MAX_DOC_LENGTH) {
            truncatedDocNames.push(doc.name);
            return `Document: ${doc.name} (truncated)\n${doc.content.slice(0, MAX_DOC_LENGTH)}...`;
          }
          return `Document: ${doc.name}\n${doc.content}`;
        })
        .join("\n\n");

      const prompt = `You are an AI assistant helping a customer service agent. 
Context:
- Agent: ${agentInfo?.displayName}
- Customer: ${customerInfo?.name || 'Unknown'}
- Agent Status: ${agentInfo?.agentStatus}

Conversation History:
${transcript}

${relevantDocs.length > 0 ? `Referenced Documents:
${documentContext}

` : ''}${truncatedDocNames.length > 0 ? `Note: The following documents were truncated due to size: ${truncatedDocNames.join(', ')}\n
` : ''}Please provide a helpful response to the agent's query: ${activeQuery}`;

      // Check prompt size and show warning if needed
      setShowSizeWarning(prompt.length > MAX_PROMPT_LENGTH);

      const response = await fetch(AI_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          retry: 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the AI response from the correct format
      let aiText = "No response received";
      if (data.AIResponse) {
        aiText = data.AIResponse;
      } else if (data.response) {
        aiText = data.response;
      }
      
      // Start streaming effect
      if (aiText && aiText !== "No response received") {
        await streamText(aiText);
        
        // Add AI message to chat
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          timestamp: Date.now(),
          sender: "ai",
          text: aiText,
        };
        setChatMessages(prev => {
          const updatedMessages = [...prev, aiMessage];
          void saveConversation(updatedMessages);
          return updatedMessages;
        });
      } else {
        setStreamingResponse("No response received");
        
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          timestamp: Date.now(),
          sender: "ai",
          text: "No response received",
        };
        setChatMessages(prev => {
          const updatedMessages = [...prev, aiMessage];
          void saveConversation(updatedMessages);
          return updatedMessages;
        });
      }
    } catch (err) {
      console.error("AI Query failed:", err);
      setError("Failed to get AI response");
      const errorText = "Sorry, I encountered an error while processing your request.";
      setStreamingResponse(errorText);
      
      const errorMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        timestamp: Date.now(),
        sender: "ai",
        text: errorText,
      };
      setChatMessages(prev => {
        const updatedMessages = [...prev, errorMessage];
        void saveConversation(updatedMessages);
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setQuery(""); // Clear the input after sending
    }
  };

  const streamText = async (text: string) => {
    const words = text.split(' ');
    let currentText = "";
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingResponse(currentText);
      
      // Variable delay for natural streaming effect
      const delay = Math.random() * 30 + 10; // 10-40ms per word
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  const handleNewConversation = () => {
    console.log("[AI Assistant] Starting new conversation");
    setChatMessages([]);
    setQuery("");
    setStreamingResponse("");
    setIsStreaming(false);
    currentConversationIdRef.current = null;
    setCurrentConversationId(null);
  };

  const toggleConversationPanel = () => {
    setShowConversationPanel((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          conversationPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
      return next;
    });
  };

  const toggleDocumentPanel = () => {
    setShowDocumentPanel((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          documentPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
      return next;
    });
  };

  const buildAIContext = () => {
    const contextBlocks: string[] = [];
    const customerDetails: string[] = [];
    const agentDetails: string[] = [];
    const interactionDetails: string[] = [];

    if (customerInfo) {
      if (customerInfo.name) customerDetails.push(`- Name: ${customerInfo.name}`);
      if (customerInfo.firstName) customerDetails.push(`- First Name: ${customerInfo.firstName}`);
      if (customerInfo.lastName) customerDetails.push(`- Last Name: ${customerInfo.lastName}`);
      if (customerInfo.email) customerDetails.push(`- Email: ${customerInfo.email}`);
      if (customerInfo.phoneNumber) customerDetails.push(`- Phone: ${customerInfo.phoneNumber}`);
      if (customerInfo.accountNumber) customerDetails.push(`- Account: ${customerInfo.accountNumber}`);
    }

    if (agentInfo) {
      if (agentInfo.displayName) agentDetails.push(`- Name: ${agentInfo.displayName}`);
      if (agentInfo.firstName) agentDetails.push(`- First Name: ${agentInfo.firstName}`);
      if (agentInfo.lastName) agentDetails.push(`- Last Name: ${agentInfo.lastName}`);
      if (agentInfo.title) agentDetails.push(`- Title: ${agentInfo.title}`);
      if (agentInfo.email) agentDetails.push(`- Email: ${agentInfo.email}`);
      if (agentInfo.agentStatus) agentDetails.push(`- Status: ${agentInfo.agentStatus}`);
      const queueLabel = getPrimaryQueueLabel(agentInfo);
      if (queueLabel) agentDetails.push(`- Primary Queue: ${queueLabel}`);
    }

    if (interactionInfo) {
      if (interactionInfo.notes) interactionDetails.push(`- Notes: ${interactionInfo.notes}`);
      if (interactionInfo.subject) interactionDetails.push(`- Subject: ${interactionInfo.subject}`);
      if (interactionInfo.result) interactionDetails.push(`- Result: ${interactionInfo.result}`);
      if (interactionInfo.queueName) interactionDetails.push(`- Queue: ${interactionInfo.queueName}`);
      if (interactionInfo.crmData?.sfdc?.screenPopObjects) {
        const crm = interactionInfo.crmData.sfdc.screenPopObjects;
        if (crm.Name || crm.Id) {
          interactionDetails.push(`- CRM Contact: ${crm.Name || ''} (${crm.Id || ''})`);
        }
      }
    }

    if (customerDetails.length > 0) {
      contextBlocks.push(`Customer Information:\n${customerDetails.join("\n")}`);
    }

    if (agentDetails.length > 0) {
      contextBlocks.push(`Agent Information:\n${agentDetails.join("\n")}`);
    }

    if (interactionDetails.length > 0) {
      contextBlocks.push(`Interaction Details:\n${interactionDetails.join("\n")}`);
    }

    return contextBlocks.join("\n\n");
  };

  // AI helper functions for Document Editor
  const handleAICompletion = async (prompt: string): Promise<string> => {
    const fullPrompt = `Complete the following document request. Provide only the completion text, no explanations.\n\nRequest: ${prompt}\n\nCompletion:`;
    
    const response = await fetch(AI_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt, retry: 3 }),
    });
    
    if (!response.ok) throw new Error("AI completion failed");
    const data = await response.json();
    return data.AIResponse?.trim() || data.response?.trim() || "";
  };

  const handleAIRewrite = async (content: string, promptOverride?: string): Promise<string> => {
    const promptSuffix = promptOverride?.trim()
      ? `Additional instructions: ${promptOverride.trim()}\n\n`
      : "";
    const context = buildAIContext();
    const contextBlock = context ? `Context from Infinity APIs:\n${context}\n\n` : "";
    const prompt = `Rewrite and improve the following document. Maintain the markdown formatting. Make it more professional, clear, and well-structured.\n${promptSuffix}${contextBlock}${content}\n\nRewritten version:`;
    
    const response = await fetch(AI_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, retry: 3 }),
    });
    
    if (!response.ok) throw new Error("AI rewrite failed");
    const data = await response.json();
    return data.AIResponse?.trim() || data.response?.trim() || content;
  };

  const handleSaveEditorDocument = (doc: Omit<StoredDocument, "id" | "uploadTime" | "size">) => {
    const newDoc: StoredDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadTime: Date.now(),
      size: new Blob([doc.content]).size,
    };
    
    setStoredDocuments(prev => {
      const updated = [...prev, newDoc];
      void saveLocalDocuments(updated);
      return updated;
    });
  };

  // Error state for critical errors
  const [criticalError, setCriticalError] = useState<string | null>(null);

  // Catch uncaught errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[AI Assistant] Uncaught error:', event.error);
      setCriticalError(`Error: ${event.error?.message || 'Unknown error'}`);
      event.preventDefault();
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (criticalError) {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#8b0000', 
        color: '#fff',
        fontFamily: 'monospace',
        maxHeight: '100vh',
        overflow: 'auto'
      }}>
        <h2>Critical Error - AI Assistant</h2>
        <pre>{criticalError}</pre>
        <button 
          onClick={() => setCriticalError(null)}
          style={{ 
            padding: '10px 20px', 
            marginTop: '10px',
            background: '#fff',
            color: '#8b0000',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Try to Recover
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2>Document Assistant</h2>
          <div className={styles.headerRight}>
            <div className={styles.headerRightDesktop}>
              <button
                onClick={toggleConversationPanel}
                className={styles.menuLabelButton}
                aria-label="Toggle conversation menu"
              >
                <span className={styles.menuLabel}>Previous Conversations</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <button
                onClick={toggleDocumentPanel}
                className={styles.menuLabelButton}
                aria-label="Toggle document library"
              >
                <span className={styles.menuLabel}>Documents</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2h8l4 4v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <path d="M14 2v4h4" />
                </svg>
              </button>
            </div>
            <div className={styles.headerRightMobile}>
              <button
                onClick={() => setShowMobileMenu(prev => !prev)}
                className={styles.mobileMenuButton}
                aria-label="Toggle menu"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
              {showMobileMenu && (
                <div className={styles.mobileDropdown}>
                  <button
                    onClick={() => {
                      toggleConversationPanel();
                      setShowMobileMenu(false);
                    }}
                    className={styles.mobileDropdownItem}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                    Previous Conversations
                  </button>
                  <button
                    onClick={() => {
                      toggleDocumentPanel();
                      setShowMobileMenu(false);
                    }}
                    className={styles.mobileDropdownItem}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2h8l4 4v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                      <path d="M14 2v4h4" />
                    </svg>
                    Documents
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {agentInfo && (
          <div className={styles.agentInfo}>
            {agentInfo.displayName} [QUEUE: {getPrimaryQueueLabel(agentInfo).toUpperCase()}]
          </div>
        )}
        <ApiDiagnostics
          api={api}
          isReady={isReady}
          open={showDiagnostics}
          onToggle={() => setShowDiagnostics((prev) => !prev)}
          liveConversation={conversation}
        />
      </div>
      <div className={styles.content}>
        <div className={`${styles.layout} ${selectedDocument ? styles.layoutWithPanel : ""}`}>
          {showConversationPanel && (
            <aside className={styles.conversationPanel} ref={conversationPanelRef}>
              <div className={styles.conversationPanelHeader}>
                <div>
                  <div className={styles.conversationPanelLabel}>[conversation-history]</div>
                  <div className={styles.conversationPanelTitle}>Saved Conversations</div>
                </div>
                <button
                  className={styles.conversationPanelClose}
                  onClick={toggleConversationPanel}
                  aria-label="Close conversation panel"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className={styles.conversationPanelContent}>
                <button
                  onClick={() => {
                    handleNewConversation();
                    setShowConversationPanel(false);
                  }}
                  className={styles.newConversationButton}
                  aria-label="Start new conversation"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New Message
                </button>
                <div className={styles.conversationList}>
                  {savedConversations.length === 0 ? (
                    <div className={styles.emptyConversations}>No saved conversations</div>
                  ) : (
                    savedConversations.map((conv) => (
                      <div key={conv.id} className={styles.conversationItem}>
                        <div className={styles.conversationInfo} onClick={() => loadConversation(conv)}>
                          <div className={styles.conversationTitle}>{conv.title}</div>
                          <div className={styles.conversationMeta}>
                            <span>Last: {new Date(conv.updatedAt).toLocaleString()}</span>
                            <span>{conv.messages.length} messages</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteConversation(conv.id)}
                          className={styles.deleteConversationButton}
                          aria-label="Delete conversation"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          )}
          <div className={styles.mainColumn}>
            {notice && (
              <div className={styles.notice}>
                {notice}
              </div>
            )}
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
            {showCustomerInfo && customerInfo && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>[customer-info]</div>
                <div className={styles.sectionContent}>
                  <h3>Customer Information</h3>
                  <div className={styles.infoGrid}>
                    {customerInfo.name && <div><strong>Name:</strong> {customerInfo.name}</div>}
                    {customerInfo.phoneNumber && <div><strong>Phone:</strong> {customerInfo.phoneNumber}</div>}
                    {customerInfo.email && <div><strong>Email:</strong> {customerInfo.email}</div>}
                    {customerInfo.accountNumber && <div><strong>Account:</strong> {customerInfo.accountNumber}</div>}
                  </div>
                </div>
              </div>
            )}


            {/* AI Query or Document Editor */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>[ai-assistant]</span>
                <button
                  onClick={() => setShowDocumentEditor((prev) => !prev)}
                  className={`${styles.sectionToggleButton} ${showDocumentEditor ? styles.active : ""}`}
                  aria-label="Toggle document editor"
                  title={showDocumentEditor ? "Switch to AI Chat" : "Open Document Editor"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Document Editor
                </button>
              </div>
              <div className={styles.sectionContent}>
                <h3>{showDocumentEditor ? "Document Editor" : "Document Assistant"}</h3>

                {showDocumentEditor ? (
                  <DocumentEditor
                    onSaveDocument={handleSaveEditorDocument}
                    onAIRewrite={handleAIRewrite}
                    existingDocuments={getLibraryDocuments()}
                    customerInfo={customerInfo}
                    agentInfo={agentInfo}
                    interactionInfo={interactionInfo}
                  />
                ) : (
                  <div className={styles.chatContainer}>
                    <div className={styles.chatMessages}>
                    {chatMessages.length === 0 ? (
                      <div className={styles.chatEmpty}>Start a conversation with the AI assistant</div>
                    ) : (
                      chatMessages.map((message, msgIndex) => (
                        <div key={message.id} className={`${styles.chatMessage} ${styles[message.sender]}`}>
                          <div className={styles.messageHeader}>
                            <span className={styles.senderName}>
                              {message.sender === "user" ? "You" : "AI Assistant"}
                            </span>
                            <span className={styles.messageTime}>
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <div className={styles.messageContent}>
                            {editingMessageId === message.id ? (
                              <div className={styles.editMode}>
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className={styles.editTextarea}
                                  rows={4}
                                />
                                <div className={styles.editActions}>
                                  <button
                                    onClick={() => handleSaveEdit(message.id)}
                                    className={styles.saveEditButton}
                                    title="Save changes"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className={styles.cancelEditButton}
                                    title="Cancel"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                                {message.mentionedDocuments && message.mentionedDocuments.length > 0 && (
                                  <div className={styles.mentionedDocs}>
                                    <span className={styles.mentionedDocsLabel}>Referenced:</span>
                                    {message.mentionedDocuments.map((doc, index) => (
                                      <span key={index} className={styles.mentionedDoc}>
                                        {doc}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                            {message.sender === "ai" && editingMessageId !== message.id && (
                              <div className={styles.messageActions}>
                                <button
                                  className={styles.messageActionButton}
                                  onClick={() => handleCopyMessage(message.id, message.text)}
                                  title="Copy message"
                                >
                                  {copiedMessageId === message.id ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                  )}
                                </button>
                                <button
                                  className={styles.messageActionButton}
                                  onClick={() => handleSendMessageToChat(message.text)}
                                  disabled={!interactionInfo?.id}
                                  title="Send to customer chat"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                  </svg>
                                </button>
                                <button
                                  className={styles.messageActionButton}
                                  onClick={() => handleStartEdit(message)}
                                  title="Edit message"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  className={styles.messageActionButton}
                                  onClick={() => {
                                    const userMessage = chatMessages[msgIndex - 1];
                                    if (userMessage?.sender === "user") {
                                      handleRetryMessage(message.id, userMessage.text);
                                    }
                                  }}
                                  title="Retry response"
                                  disabled={retryingMessageId === message.id}
                                >
                                  {retryingMessageId === message.id ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={styles.spinning}>
                                      <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isStreaming && (
                      <div className={`${styles.chatMessage} ${styles.ai}`}>
                        <div className={styles.messageHeader}>
                          <span className={styles.senderName}>AI Assistant</span>
                          <span className={styles.messageTime}>
                            {formatTimestamp(Date.now())}
                          </span>
                        </div>
                        <div className={styles.messageContent}>
                          {streamingResponse}
                          <span className={styles.cursor}>|</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.chatInputContainer}>
                    {showSizeWarning && (
                      <div className={styles.sizeWarning}>
                        Warning: Message is very large and may be truncated for processing.
                      </div>
                    )}
                    <div className={styles.queryInputWrapper}>
                      <textarea
                        ref={queryInputRef}
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about the customer, conversation, or uploaded documents... Type @ to reference documents"
                        className={styles.queryInput}
                        rows={1}
                      />
                      {showMentionList && (
                        <div className={styles.mentionList}>
                          {getFilteredDocuments().map((doc, index) => (
                            <div
                              key={doc.id}
                              className={`${styles.mentionItem} ${index === selectedMentionIndex ? styles.selected : ''}`}
                              onClick={() => handleMentionSelect(doc)}
                            >
                              <div className={styles.mentionIcon}>
                                {doc.type === "company" ? (
                                  <svg className={styles.companyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18" />
                                    <path d="M5 21V7l7-4 7 4v14" />
                                    <path d="M9 9h6" />
                                    <path d="M9 13h6" />
                                    <path d="M9 17h6" />
                                  </svg>
                                ) : (
                                  getDocumentIcon(doc.mimeType)
                                )}
                              </div>
                              <div className={styles.mentionInfo}>
                                <div className={styles.mentionName}>{doc.name}</div>
                                <div className={styles.mentionType}>
                                  {doc.type === "company" ? "Company Policy" : doc.type.toUpperCase()}
                                </div>
                              </div>
                            </div>
                          ))}
                          {getFilteredDocuments().length === 0 && (
                            <div className={styles.mentionEmpty}>No documents found</div>
                          )}
                        </div>
                      )}
                      <div className={styles.inputButtons}>
                        <button
                          onClick={handleNewConversation}
                          className={styles.newButton}
                          aria-label="New conversation"
                          title="Start new conversation"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleAIQuery()}
                          disabled={isLoading || !query.trim()}
                          className={styles.sendButton}
                          aria-label="Send message"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7" />
                            <path d="M7 7h10v10" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {showDocumentPanel && (
            <aside className={styles.documentPanel} ref={documentPanelRef}>
              <div className={styles.documentPanelHeader}>
                <div>
                  <div className={styles.documentPanelLabel}>[document-library]</div>
                  <div className={styles.documentPanelTitle}>Documents</div>
                </div>
                <button
                  className={styles.documentPanelClose}
                  onClick={() => {
                    setShowDocumentPanel(false);
                  }}
                  aria-label="Close document library"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className={styles.documentPanelMeta}>
                <span>{getLibraryDocuments().length} documents</span>
              </div>
              <div className={styles.documentPanelBody}>
                {selectedDocument ? (
                  <div className={styles.documentViewer}>
                    <button
                      className={styles.backButton}
                      onClick={() => setSelectedDocument(null)}
                      aria-label="Back to document list"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      Back to list
                    </button>
                    <div className={styles.documentPanelLabel}>[document-viewer]</div>
                    <div className={styles.documentViewerHeader}>
                      <div className={styles.documentPanelTitle}>{selectedDocument.name}</div>
                      <button
                        onClick={() => handleSendDocumentTextToChat(selectedDocument)}
                        className={styles.sendToChatButton}
                        title="Send document text to chat"
                        aria-label="Send document text content to customer chat"
                        disabled={!interactionInfo?.id}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleSendDocumentToChat(selectedDocument)}
                        className={styles.sendToChatButton}
                        title="Send as .doc attachment"
                        aria-label="Send document as .doc attachment to customer chat"
                        disabled={!interactionInfo?.id}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(selectedDocument)}
                        className={styles.downloadButton}
                        title="Copy document to clipboard"
                        aria-label="Copy document content to clipboard"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    <div className={styles.documentPanelMeta}>
                      <span>{selectedDocument.type === "company" ? "Company Document" : "User Upload"}</span>
                      <span>{formatFileSize(selectedDocument.size)}</span>
                      {selectedDocument.pageCount && <span>{selectedDocument.pageCount} pages</span>}
                    </div>
                    <div className={styles.documentPreview}>
                      <ReactMarkdown>{selectedDocument.content}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.documentUpload}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,.doc,.docx,.rtf"
                        multiple
                        onChange={handleFileUpload}
                        className={styles.fileInput}
                      />
                      <button onClick={() => fileInputRef.current?.click()} className={styles.uploadButton}>
                        Upload Documents
                      </button>
                      <div className={styles.uploadHint}>
                        Supports: TXT, PDF, DOC, DOCX, RTF
                      </div>
                    </div>
                    <div className={styles.documentGrid}>
                      {getLibraryDocuments().map((doc) => (
                        <div
                          key={doc.id}
                          className={`${styles.documentCard} ${doc.type === "company" ? styles.companyDoc : styles.userDoc}`}
                          onClick={() => {
                            console.log("[AI Assistant] Document selected:", {
                              id: doc.id,
                              name: doc.name,
                              type: doc.type,
                            });
                            setSelectedDocument(doc);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={styles.documentIcon}>
                            {getDocumentIcon(doc.mimeType)}
                          </div>
                          <div className={styles.documentInfo}>
                            <div className={styles.documentName}>
                              <strong>{doc.name}</strong>
                            </div>
                            <div className={styles.documentMeta}>
                              <span className={styles.documentType}>
                                {doc.type === "company" ? "COMPANY" : doc.type.toUpperCase()}
                              </span>
                              <span className={styles.documentSize}>{formatFileSize(doc.size)}</span>
                              {doc.pageCount && (
                                <span className={styles.documentPages}>{doc.pageCount} pages</span>
                              )}
                            </div>
                          </div>
                          {doc.type !== "company" && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteDocument(doc.id);
                              }}
                              className={styles.deleteButton}
                              title="Delete document"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
