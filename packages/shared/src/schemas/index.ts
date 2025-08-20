import { z } from 'zod';

// Enums
export const PrioritySchema = z.enum(['urgent', 'high', 'medium', 'low']);
export const CategorySchema = z.enum(['pricing', 'technical', 'warranty', 'other']);
export const TicketSourceSchema = z.enum(['manual', 'gmail', 'hubspot']);

// Product Reference
export const ProductRefSchema = z.object({
  name: z.string().min(1),
  model: z.string().nullable().optional()
});

// Parse Result Schema - for Pi Agent JSON validation
export const ParseResultSchema = z.object({
  category: CategorySchema,
  product: z.array(ProductRefSchema),
  quantity: z.number().nullable(),
  protocols: z.array(z.string()),
  priority: PrioritySchema,
  missing: z.array(z.string())
}).strict();

// Citation Schema
export const CitationSchema = z.object({
  doc_id: z.number(),
  title: z.string(),
  vendor: z.string().optional(),
  family: z.string().optional(),
  model: z.string().optional(),
  page_start: z.number(),
  page_end: z.number(),
  snippet: z.string(),
  score: z.number().optional()
});

// Search Request Schema
export const SearchRequestSchema = z.object({
  q: z.string().min(1),
  k: z.number().min(1).max(50).default(10),
  vendor: z.array(z.string()).optional(),
  family: z.array(z.string()).optional(),
  model: z.array(z.string()).optional()
});

// Validation Schemas
export const ValidationIssueSchema = z.object({
  claim: z.string(),
  reason: z.string(),
  suggestion: z.string()
});

export const ValidationResultSchema = z.object({
  ok: z.boolean(),
  issues: z.array(ValidationIssueSchema)
});

// Draft Email Schema
export const DraftEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  citations: z.array(z.string())
});

// Ticket Schemas
export const CreateTicketRequestSchema = z.object({
  subject: z.string().optional(),
  text: z.string().min(1),
  source: TicketSourceSchema
});

export const TicketSchema = z.object({
  id: z.string(),
  source: TicketSourceSchema,
  subject: z.string().optional(),
  text: z.string(),
  parse: ParseResultSchema.optional(),
  citations: z.array(CitationSchema).optional(),
  draft: DraftEmailSchema.optional(),
  validation: ValidationResultSchema.optional(),
  status: z.enum(['processing', 'ready', 'escalated', 'sent']),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Export types from schemas
export type Priority = z.infer<typeof PrioritySchema>;
export type Category = z.infer<typeof CategorySchema>;
export type TicketSource = z.infer<typeof TicketSourceSchema>;
export type ProductRef = z.infer<typeof ProductRefSchema>;
export type ParseResult = z.infer<typeof ParseResultSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type DraftEmail = z.infer<typeof DraftEmailSchema>;
export type Ticket = z.infer<typeof TicketSchema>;