import React, { useState, useRef, useEffect, useCallback } from "react";
import OverType from "overtype";
import styles from "./Element.module.css";
import type { AgentInfo, CustomerInfo, InteractionInfo } from "./Element.types";

// Custom Template Storage Keys
const CUSTOM_TEMPLATES_DB_NAME = "AIAssistantDB";
const CUSTOM_TEMPLATES_STORE_NAME = "customTemplates";
const CUSTOM_TEMPLATES_LOCAL_KEY = "ai_assistant_custom_templates";

interface CustomTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

interface StoredDocument {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  content: string;
  uploadTime: number;
  size: number;
  pageCount?: number;
}

interface DocumentEditorProps {
  onSaveDocument: (doc: Omit<StoredDocument, "id" | "uploadTime" | "size">) => void;
  onAIRewrite: (content: string, prompt?: string) => Promise<string>;
  existingDocuments: StoredDocument[];
  customerInfo?: CustomerInfo | null;
  agentInfo?: AgentInfo | null;
  interactionInfo?: InteractionInfo | null;
}

export default function DocumentEditor({
  onSaveDocument,
  onAIRewrite,
  existingDocuments: _existingDocuments,
  customerInfo,
  agentInfo,
  interactionInfo,
}: DocumentEditorProps) {
  const [content, setContent] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [isAIRewriting, setIsAIRewriting] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const isProgrammaticUpdateRef = useRef(false);

  const getFieldValue = useCallback((value: string | undefined, placeholder: string) => {
    return value && value.trim().length > 0 ? value : placeholder;
  }, []);

  const getEditorTextarea = useCallback(() => {
    return editorContainerRef.current?.querySelector("textarea") as HTMLTextAreaElement | null;
  }, []);

  const updateEditorValue = useCallback((nextValue: string) => {
    setContent(nextValue);
    if (editorRef.current?.getValue && editorRef.current.getValue() === nextValue) {
      return;
    }
    if (editorRef.current?.setValue) {
      isProgrammaticUpdateRef.current = true;
      editorRef.current.setValue(nextValue);
      requestAnimationFrame(() => {
        isProgrammaticUpdateRef.current = false;
      });
    }
  }, []);

  const handleEditorChange = useCallback((value: string) => {
    if (isProgrammaticUpdateRef.current) {
      setContent(value);
      return;
    }

    setContent(value);
  }, []);

  // Initialize IndexedDB for custom templates
  useEffect(() => {
    if (!('indexedDB' in window)) {
      console.log("[DocumentEditor] IndexedDB not available, using localStorage fallback");
      // Load from localStorage fallback
      const saved = localStorage.getItem(CUSTOM_TEMPLATES_LOCAL_KEY);
      if (saved) {
        try {
          setCustomTemplates(JSON.parse(saved));
        } catch (err) {
          console.error("Failed to parse custom templates from localStorage:", err);
        }
      }
      return;
    }

    const initDB = async () => {
      try {
        await loadCustomTemplates();
      } catch (err) {
        console.error("[DocumentEditor] Failed to initialize custom templates storage:", err);
        setStorageAvailable(false);
        // Fallback to localStorage
        const saved = localStorage.getItem(CUSTOM_TEMPLATES_LOCAL_KEY);
        if (saved) {
          try {
            setCustomTemplates(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse custom templates from localStorage:", e);
          }
        }
      }
    };
    initDB();
  }, []);

  const initCustomTemplatesDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CUSTOM_TEMPLATES_DB_NAME, 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CUSTOM_TEMPLATES_STORE_NAME)) {
          const store = db.createObjectStore(CUSTOM_TEMPLATES_STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  };

  const loadCustomTemplates = async () => {
    if (!storageAvailable || !('indexedDB' in window)) {
      const saved = localStorage.getItem(CUSTOM_TEMPLATES_LOCAL_KEY);
      if (saved) {
        try {
          setCustomTemplates(JSON.parse(saved));
        } catch (err) {
          console.error("Failed to parse custom templates:", err);
        }
      }
      return;
    }

    try {
      const db = await initCustomTemplatesDB();
      const transaction = db.transaction(CUSTOM_TEMPLATES_STORE_NAME, "readonly");
      const store = transaction.objectStore(CUSTOM_TEMPLATES_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const templates = request.result as CustomTemplate[];
        setCustomTemplates(templates.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => {
        console.error("Failed to load custom templates:", request.error);
      };
    } catch (err) {
      console.error("Failed to load custom templates from IndexedDB:", err);
    }
  };

  const saveCustomTemplate = async (template: CustomTemplate) => {
    if (!storageAvailable || !('indexedDB' in window)) {
      // Fallback to localStorage
      const updated = [...customTemplates, template];
      localStorage.setItem(CUSTOM_TEMPLATES_LOCAL_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
      return;
    }

    try {
      const db = await initCustomTemplatesDB();
      const transaction = db.transaction(CUSTOM_TEMPLATES_STORE_NAME, "readwrite");
      const store = transaction.objectStore(CUSTOM_TEMPLATES_STORE_NAME);
      const request = store.add(template);

      request.onsuccess = () => {
        setCustomTemplates(prev => [...prev, template]);
      };
      request.onerror = () => {
        console.error("Failed to save custom template:", request.error);
      };
    } catch (err) {
      console.error("Failed to save custom template:", err);
      // Fallback to localStorage
      const updated = [...customTemplates, template];
      localStorage.setItem(CUSTOM_TEMPLATES_LOCAL_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
    }
  };

  const deleteCustomTemplate = async (templateId: string) => {
    if (!storageAvailable || !('indexedDB' in window)) {
      const updated = customTemplates.filter(t => t.id !== templateId);
      localStorage.setItem(CUSTOM_TEMPLATES_LOCAL_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
      return;
    }

    try {
      const db = await initCustomTemplatesDB();
      const transaction = db.transaction(CUSTOM_TEMPLATES_STORE_NAME, "readwrite");
      const store = transaction.objectStore(CUSTOM_TEMPLATES_STORE_NAME);
      const request = store.delete(templateId);

      request.onsuccess = () => {
        setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
      };
      request.onerror = () => {
        console.error("Failed to delete custom template:", request.error);
      };
    } catch (err) {
      console.error("Failed to delete custom template:", err);
      const updated = customTemplates.filter(t => t.id !== templateId);
      localStorage.setItem(CUSTOM_TEMPLATES_LOCAL_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
    }
  };

  // Handle Create Template
  const handleCreateTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;

    const template: CustomTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName.trim(),
      content: newTemplateContent,
      createdAt: Date.now(),
    };

    void saveCustomTemplate(template);
    setNewTemplateName("");
    setNewTemplateContent("");
    setShowCreateTemplateModal(false);
  };

  const handleOpenCreateTemplateModal = () => {
    setShowCreateTemplateModal(true);
    setNewTemplateContent(content); // Pre-fill with current editor content
  };

  // Handle Rewrite with AI
  const handleRewrite = async () => {
    if (!content.trim() || isAIRewriting) return;
    setIsAIRewriting(true);
    try {
      const rewritten = await onAIRewrite(content, rewritePrompt.trim());
      updateEditorValue(rewritten);
      setRewritePrompt("");
    } catch (err) {
      console.error("AI rewrite failed:", err);
    } finally {
      setIsAIRewriting(false);
    }
  };

  // Handle download document as txt
  const handleDownload = () => {
    if (!content.trim()) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${documentName.trim() || "document"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle save
  const handleSave = () => {
    if (!documentName.trim() || !content.trim()) return;
    
    onSaveDocument({
      name: documentName,
      type: "user",
      mimeType: "text/markdown",
      content: content,
      pageCount: 1,
    });
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
    
    // Clear form
    setDocumentName("");
    updateEditorValue("");
  };

  // Insert template
  const insertTemplate = (templateName: string) => {
    const customerName = getFieldValue(customerInfo?.name, "[Customer Name]");
    const customerFirstName = getFieldValue(customerInfo?.firstName || customerInfo?.name?.split(' ')[0], "[Customer First Name]");
    const customerEmail = getFieldValue(customerInfo?.email, "[Customer Email]");
    const customerPhone = getFieldValue(customerInfo?.phoneNumber, "[Customer Phone]");
    const customerAccount = getFieldValue(customerInfo?.accountNumber, "[Account Number]");
    // Use firstName + lastName if available, otherwise fall back to displayName
    const agentFirstName = getFieldValue(agentInfo?.firstName, "");
    const agentLastName = getFieldValue(agentInfo?.lastName, "");
    const agentName = agentFirstName && agentLastName 
      ? `${agentFirstName} ${agentLastName}` 
      : getFieldValue(agentInfo?.displayName, "[Agent Name]");
    const agentTitle = getFieldValue(agentInfo?.title, "[Agent Title]");
    const agentEmail = getFieldValue(agentInfo?.email, "[Agent Email]");
    const agentStatus = getFieldValue(agentInfo?.agentStatus, "[Agent Status]");
    // Interaction info
    const interactionNotes = getFieldValue(interactionInfo?.notes, "");
    const interactionSubject = getFieldValue(interactionInfo?.subject, "[Subject]");
    const crmContactName = getFieldValue(interactionInfo?.crmData?.sfdc?.screenPopObjects?.Name, "");
    const templates: Record<string, string> = {
      receipt: `# Receipt Statement

**Date:** ${new Date().toLocaleDateString()}
**Receipt #:** REC-${Date.now().toString(36).toUpperCase()}

## Customer Information
- Name: ${customerName}
- Account: ${customerAccount}
- Contact: ${customerEmail} / ${customerPhone}

## Transaction Details
- Description: 
- Amount: $
- Payment Method: 
- Status: Paid

## Notes

---
Thank you for your business!
`,
      letter: `# Letter Template

**Date:** ${new Date().toLocaleDateString()}

Dear ${customerFirstName || customerName},

[Body of the letter...]

Sincerely,
${agentName}
${agentTitle}
`,
      meeting: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 
**Subject:** 

## Agenda
1. 
2. 
3. 

## Discussion Points


## Action Items
- [ ] 
- [ ] 
- [ ] 

## Next Steps

`,
      followUp: `# Customer Follow-Up

**Date:** ${new Date().toLocaleDateString()}
**Customer:** ${customerName}
**Contact:** ${customerEmail}
**Phone:** ${customerPhone}
**Account:** ${customerAccount}

## Summary
- Reason for contact: ${interactionSubject}
- Resolution provided: 

## Promised Actions
- 

## Next Touchpoint
- 

${interactionNotes ? `## Interaction Notes\n${interactionNotes}\n\n` : ""}Regards,
${agentName}
${agentTitle}
${agentEmail}
` ,
      escalation: `# Escalation Summary

**Date:** ${new Date().toLocaleDateString()}
**Customer:** ${customerName}
**Account:** ${customerAccount}
**Agent:** ${agentName}
**Agent Status:** ${agentStatus}

## Issue Summary

## Impact

## Steps Taken
1. 
2. 
3. 

## Requested Assistance

## Attachments/References

` ,
      caseUpdate: `# Case Update

**Date:** ${new Date().toLocaleDateString()}
**Customer:** ${customerName}
**Account:** ${customerAccount}
**Case ID:** [Case ID]

## Update Summary

## Current Status

## Next Steps

Prepared by: ${agentName}
` ,
    };

    const template = templates[templateName];
    // Check for custom templates
    const customTemplate = customTemplates.find(t => t.id === templateName);
    const finalTemplate = template || customTemplate?.content;
    const textarea = getEditorTextarea();
    if (finalTemplate && textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + finalTemplate + content.substring(end);
      updateEditorValue(newContent);
    }
  };

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const [instance] = OverType.init(editorContainerRef.current, {
      value: content,
      placeholder: "Type your document here...",
      toolbar: false,
      autoResize: true,
      minHeight: "320px",
      maxHeight: "820px",
      fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
      fontSize: "14px",
      lineHeight: 1.6,
      padding: "16px",
      theme: {
        name: "ai-assistant",
        colors: {
          bgPrimary: "#ffffff",
          bgSecondary: "#ffffff",
          text: "#1a1a1a",
          h1: "#1a1a1a",
          h2: "#1a1a1a",
          h3: "#1a1a1a",
          strong: "#1a1a1a",
          em: "#1a1a1a",
          link: "#0da968",
          code: "#1a1a1a",
          codeBg: "rgba(0, 0, 0, 0.05)",
          blockquote: "#4f4f4f",
          hr: "#d0d0d0",
          syntaxMarker: "rgba(0, 0, 0, 0.35)",
          cursor: "#333333",
          selection: "rgba(13, 169, 104, 0.2)",
        },
      },
      onChange: (value: string) => {
        void handleEditorChange(value);
      },
    });

    editorRef.current = instance;

    return () => {
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, [handleEditorChange]);

  return (
    <div className={styles.documentEditor}>
      <div className={styles.editorHeader}>
        <div className={styles.editorTitleSection}>
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Document name..."
            className={styles.documentNameInput}
          />
        </div>
        <div className={styles.editorActions}>
          <select
            onChange={(e) => insertTemplate(e.target.value)}
            className={styles.templateSelect}
            value=""
          >
            <option value="" disabled>
              Insert Template
            </option>
            <option value="receipt">Receipt Statement</option>
            <option value="letter">Letter Template</option>
            <option value="meeting">Meeting Notes</option>
            <option value="followUp">Customer Follow-Up</option>
            <option value="caseUpdate">Case Update</option>
            <option value="escalation">Escalation Summary</option>
            {customTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleOpenCreateTemplateModal}
            className={styles.createTemplateLink}
            title="Create a custom template"
          >
            + Create a template
          </button>
          <button
            onClick={handleSave}
            disabled={!documentName.trim() || !content.trim()}
            className={styles.saveButton}
          >
            {showSaveSuccess ? "Saved!" : "Save Document"}
          </button>
        </div>
      </div>

      <div className={styles.editorContainer}>
        <div className={styles.overtypeContainer} ref={editorContainerRef} />
      </div>

      <div className={styles.editorPromptRow}>
        <input
          type="text"
          value={rewritePrompt}
          onChange={(e) => setRewritePrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleRewrite();
            }
          }}
          placeholder="Optional AI prompt (e.g., summarize, formalize, shorten)"
          className={styles.rewritePromptInput}
        />
        <button
          onClick={handleRewrite}
          disabled={isAIRewriting || !content.trim()}
          className={styles.rewriteButton}
        >
          {isAIRewriting ? "Rewriting..." : "Rewrite with AI"}
        </button>
        <button
          onClick={handleDownload}
          disabled={!content.trim()}
          className={styles.downloadButton}
          title="Download as TXT"
          aria-label="Download document as text file"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>

      <div className={styles.editorFooter}>
        <span className={styles.wordCount}>
          {content.split(/\s+/).filter((w) => w.length > 0).length} words
        </span>
        <span className={styles.characterCount}>{content.length} characters</span>
      </div>

      {/* Create Template Modal */}
      {showCreateTemplateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateTemplateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create Custom Template</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowCreateTemplateModal(false)}
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label htmlFor="templateName">Template Name</label>
                <input
                  id="templateName"
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Support Response, Invoice Template..."
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalField}>
                <label htmlFor="templateContent">Template Content</label>
                <textarea
                  id="templateContent"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="Enter template content with variables like ${customerName}, ${agentName}, etc."
                  className={styles.modalTextarea}
                  rows={8}
                />
              </div>
              <p className={styles.modalHint}>
                New templates will appear in the "Insert Template" dropdown after creation.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowCreateTemplateModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.modalSaveButton}
                onClick={handleCreateTemplate}
                disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
