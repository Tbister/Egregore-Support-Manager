import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { 
  CreateTicketRequest, 
  CreateTicketResponse, 
  Ticket,
  ParseResult,
  Citation,
  DraftEmail,
  ValidationResult 
} from '@egregore/shared';
import { 
  CreateTicketRequestSchema, 
  ParseResultSchema,
  DraftEmailSchema,
  ValidationResultSchema 
} from '@egregore/shared';
import { DRAFT_EMAIL_SYSTEM_PROMPT, DRAFT_EMAIL_USER_PROMPT } from '@egregore/shared';
import { nanoid } from 'nanoid';
import { PiClient } from './lib/pi-client';
import { callLLM } from './lib/llm';

type Bindings = {
  TICKETS: KVNamespace;
  MANUALS: R2Bucket;
  PI_API_BASE: string;
  OPENAI_API_KEY: string;
  LLM_MODEL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Create ticket
app.post('/tickets', async (c) => {
  const env = c.env;
  
  try {
    // Validate request
    const body = await c.req.json();
    const request = CreateTicketRequestSchema.parse(body);
    
    console.log(`Creating ticket from ${request.source}: ${request.subject || 'No subject'}`);
    
    // Initialize Pi client
    const pi = new PiClient(env.PI_API_BASE);
    
    // Step 1: Parse the ticket text
    console.log('Step 1: Parsing ticket text...');
    const parseResult = await pi.parse(request.text);
    const validatedParse = ParseResultSchema.parse(parseResult);
    
    // Step 2: Search for relevant manual content
    console.log('Step 2: Searching manuals...');
    const searchQuery = [
      ...validatedParse.product.map(p => `${p.name} ${p.model || ''}`),
      ...validatedParse.protocols
    ].join(' ').trim();
    
    const searchResult = await pi.search({
      q: searchQuery,
      k: 8
    });
    
    const citations: Citation[] = searchResult.results;
    
    // Step 3: Generate draft email using LLM
    console.log('Step 3: Generating draft email...');
    const llmPrompt = DRAFT_EMAIL_USER_PROMPT(
      request.text,
      validatedParse,
      citations.slice(0, 6) // Use top 6 citations
    );
    
    const llmResponse = await callLLM({
      apiKey: env.OPENAI_API_KEY,
      model: env.LLM_MODEL || 'gpt-4o-mini',
      systemPrompt: DRAFT_EMAIL_SYSTEM_PROMPT,
      userPrompt: llmPrompt,
      temperature: 0.3
    });
    
    const draftEmail = DraftEmailSchema.parse(JSON.parse(llmResponse));
    
    // Step 4: Validate the draft
    console.log('Step 4: Validating draft...');
    
    // Extract claims from the draft
    const claims = extractClaims(draftEmail.body);
    
    const validationResult = await pi.validate({
      draft: draftEmail.body,
      facts: claims.map(claim => ({
        claim,
        evidence: citations.find(c => 
          draftEmail.body.includes(c.title) || 
          draftEmail.body.includes(c.snippet.substring(0, 50))
        )?.snippet
      }))
    });
    
    const validatedValidation = ValidationResultSchema.parse(validationResult);
    
    // Step 5: Create and store ticket
    const ticketId = nanoid(12);
    const ticket: Ticket = {
      id: ticketId,
      source: request.source,
      subject: request.subject || draftEmail.subject,
      text: request.text,
      parse: validatedParse,
      citations,
      draft: draftEmail,
      validation: validatedValidation,
      status: validatedValidation.ok ? 'ready' : 'escalated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store in KV
    await env.TICKETS.put(`ticket:${ticketId}`, JSON.stringify(ticket), {
      expirationTtl: 60 * 60 * 24 * 30 // 30 days
    });
    
    console.log(`Ticket ${ticketId} created with status: ${ticket.status}`);
    
    // Return response
    const response: CreateTicketResponse = {
      ticketId,
      draft: draftEmail,
      citations,
      parse: validatedParse,
      validation: validatedValidation
    };
    
    return c.json(response);
    
  } catch (error) {
    console.error('Failed to create ticket:', error);
    
    if (error instanceof Error) {
      return c.json({
        error: 'Ticket creation failed',
        message: error.message
      }, 500);
    }
    
    return c.json({
      error: 'Ticket creation failed',
      message: 'Unknown error occurred'
    }, 500);
  }
});

// Get ticket
app.get('/tickets/:id', async (c) => {
  const env = c.env;
  const ticketId = c.req.param('id');
  
  try {
    const ticketData = await env.TICKETS.get(`ticket:${ticketId}`);
    
    if (!ticketData) {
      return c.json({
        error: 'Ticket not found'
      }, 404);
    }
    
    const ticket = JSON.parse(ticketData);
    return c.json(ticket);
    
  } catch (error) {
    console.error('Failed to retrieve ticket:', error);
    return c.json({
      error: 'Failed to retrieve ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Send ticket (stub for phase 2)
app.post('/tickets/:id/send', async (c) => {
  const ticketId = c.req.param('id');
  
  // TODO: Implement Gmail OAuth and actual sending in phase 2
  
  return c.json({
    message: 'Email sending not yet implemented',
    ticketId
  }, 501);
});

// Helper function to extract claims from draft
function extractClaims(text: string): string[] {
  const claims: string[] = [];
  
  // Extract sentences with specific patterns
  const patterns = [
    /\d+\s*(V|A|W|Hz|kW|BTU|CFM|GPM)/gi, // Numbers with units
    /model\s+[\w\-]+/gi, // Model numbers
    /part\s*(?:number|#)?\s*[\w\-]+/gi, // Part numbers
    /(?:BACnet|Modbus|LON|KNX)[\s\w]+/gi, // Protocols
    /(?:wire|connect|install|configure|set)[\s\w,]+/gi // Procedures
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      claims.push(...matches);
    }
  });
  
  // Also extract sentences with technical terms
  const sentences = text.split(/[.!?]/);
  sentences.forEach(sentence => {
    if (sentence.match(/(?:must|should|require|need|ensure|verify|check)/i)) {
      claims.push(sentence.trim());
    }
  });
  
  // Deduplicate and limit
  return Array.from(new Set(claims)).slice(0, 10);
}

export default app;