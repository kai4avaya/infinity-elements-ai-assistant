export interface ConversationMessage {
  id: string;
  timestamp: number;
  from: string;
  text: string;
  type: "customer" | "agent" | "system";
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  sender: "user" | "ai";
  text: string;
  mentionedDocuments?: string[];
}

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  content: string;
  uploadTime: number;
  size: number;
  pageCount?: number;
}

export interface AgentInfo {
  id: string;
  displayName: string;
  email: string;
  agentStatus: string;
  queues: Array<string | { name?: string; queueName?: string }>;
  firstName?: string;
  lastName?: string;
  title?: string;
}

export interface CustomerInfo {
  name?: string;
  phoneNumber?: string;
  email?: string;
  accountNumber?: string;
  firstName?: string;
  lastName?: string;
}

export interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface InteractionInfo {
  id?: string;
  notes?: string;
  subject?: string;
  result?: string;
  queueName?: string;
  crmData?: {
    sfdc?: {
      screenPopObjects?: {
        Id?: string;
        Name?: string;
        Type?: string;
        Email?: string;
        Phone?: string;
      };
    };
  };
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: any;
  };
}

export interface AIResponse {
  response: string;
  status: string;
}
