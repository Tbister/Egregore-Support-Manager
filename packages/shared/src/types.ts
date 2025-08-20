// Core types for Egregore HVAC Support Manager

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type Category = 'pricing' | 'technical' | 'warranty' | 'other';
export type TicketSource = 'manual' | 'gmail' | 'hubspot';
export type ValidationStatus = 'ok' | 'issues';

export interface ProductRef {
  name: string;
  model?: string | null;
}

export interface ParseResult {
  category: Category;
  product: ProductRef[];
  quantity: number | null;
  protocols: string[];
  priority: Priority;
  missing: string[];
}

export interface Citation {
  doc_id: number;
  title: string;
  vendor?: string;
  family?: string;
  model?: string;
  page_start: number;
  page_end: number;
  snippet: string;
  score?: number;
}

export interface SearchRequest {
  q: string;
  k?: number;
  vendor?: string[];
  family?: string[];
  model?: string[];
}

export interface SearchResult {
  results: Citation[];
}

export interface IngestRequest {
  paths: string[];
}

export interface IngestResult {
  indexed: number;
  skipped: number;
  warnings: string[];
}

export interface ValidationRequest {
  draft: string;
  facts: Array<{
    claim: string;
    evidence?: string;
  }>;
}

export interface ValidationIssue {
  claim: string;
  reason: string;
  suggestion: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface DraftEmail {
  subject: string;
  body: string;
  citations: string[];
}

export interface Ticket {
  id: string;
  source: TicketSource;
  subject?: string;
  text: string;
  parse?: ParseResult;
  citations?: Citation[];
  draft?: DraftEmail;
  validation?: ValidationResult;
  status: 'processing' | 'ready' | 'escalated' | 'sent';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketRequest {
  subject?: string;
  text: string;
  source: TicketSource;
}

export interface CreateTicketResponse {
  ticketId: string;
  draft: DraftEmail;
  citations: Citation[];
  parse: ParseResult;
  validation: ValidationResult;
}

// Document types for manuals database
export interface Document {
  id: number;
  title: string;
  vendor?: string;
  family?: string;
  model?: string;
  file_path: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: number;
  doc_id: number;
  text: string;
  page_start: number;
  page_end: number;
  embedding?: Float32Array;
  created_at: string;
}