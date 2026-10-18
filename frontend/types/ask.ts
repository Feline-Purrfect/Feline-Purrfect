/** 'general' or a cat's id. */
export type AskSubject = 'general' | string;

export interface AskStatus {
  available: boolean;
  consented: boolean;
  consentedAt: string | null;
  dailyLimit: number;
  remainingToday: number;
}

export interface AskThread {
  threadId: string;
  catId: string | null; // null = General
  catName: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Which logs an answer looked at: "Used Mochi's logs, Sep 17 – Oct 16". */
export interface AskContext {
  catId: string;
  catName: string;
  from: string; // YYYY-MM-DD
  to: string;
  loggedDays: number;
}

export interface AskMessage {
  messageId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  emergency: boolean;
  context: AskContext | null;
  reported: boolean;
  createdAt: string;
}

export interface AskRequest {
  message: string;
  threadId?: string;
  catId?: string | null;
  today: string;
}

export interface AskResponse {
  thread: AskThread;
  messages: AskMessage[];
  remainingToday: number;
}
