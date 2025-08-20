import { describe, it, expect, beforeAll } from 'vitest';
import type { CreateTicketRequest, CreateTicketResponse } from '@egregore/shared';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';
const PI_URL = process.env.PI_URL || 'http://localhost:8080';

describe('E2E: Ticket Creation Flow', () => {
  beforeAll(async () => {
    // Check services are running
    const workerHealth = await fetch(`${WORKER_URL}/health`);
    expect(workerHealth.ok).toBe(true);
    
    const piHealth = await fetch(`${PI_URL}/health`);
    expect(piHealth.ok).toBe(true);
  });
  
  describe('Parse Smoke Test', () => {
    it('should correctly parse pricing email', async () => {
      const response = await fetch(`${PI_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Looking for pricing on Blue Ridge Douglas Lighting Controller Retro Kit (36 panels, BACnet MS/TP).'
        })
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.category).toBe('pricing');
      expect(result.quantity).toBe(36);
      expect(result.protocols).toContain('BACnet MS/TP');
    });
    
    it('should detect urgent priority for safety issues', async () => {
      const response = await fetch(`${PI_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Emergency! HVAC system failure causing building evacuation. Need immediate support for Carrier chiller model 30XA.'
        })
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.priority).toBe('urgent');
      expect(result.category).toBe('technical');
    });
  });
  
  describe('Search Relevance Test', () => {
    it('should find relevant Spyder documentation', async () => {
      const response = await fetch(`${PI_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'BACnet MS/TP addressing Spyder',
          k: 5
        })
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      
      // Check if Honeywell Spyder appears in results
      const spyderResult = result.results.find((r: any) => 
        r.title?.includes('Spyder') || r.vendor === 'Honeywell'
      );
      expect(spyderResult).toBeDefined();
    });
  });
  
  describe('Draft Content Test', () => {
    it('should generate draft with citations and word limit', async () => {
      const request: CreateTicketRequest = {
        source: 'manual',
        subject: 'VAV Box Configuration',
        text: 'Need help configuring Johnson Controls VAV box model TEC2000 for BACnet IP network.'
      };
      
      const response = await fetch(`${WORKER_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      expect(response.ok).toBe(true);
      const result: CreateTicketResponse = await response.json();
      
      // Check draft structure
      expect(result.draft).toBeDefined();
      expect(result.draft.subject).toBeDefined();
      expect(result.draft.body).toBeDefined();
      expect(result.draft.citations).toBeDefined();
      
      // Check word count (≤ 200 words)
      const wordCount = result.draft.body.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(200);
      
      // Check citations exist
      expect(result.draft.citations.length).toBeGreaterThan(0);
      
      // Check missing info included if any
      if (result.parse.missing.length > 0) {
        expect(result.draft.body).toMatch(/To proceed|please confirm/i);
      }
    });
  });
  
  describe('Validation Test', () => {
    it('should flag false claims in draft', async () => {
      const response = await fetch(`${PI_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: 'The Honeywell Spyder supports 500VDC power supply and requires Windows 95 for configuration.',
          facts: [
            { claim: '500VDC power supply', evidence: 'Spyder operates on 24VAC power' },
            { claim: 'Windows 95 for configuration', evidence: 'Uses web-based interface' }
          ]
        })
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.ok).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].reason).toBeDefined();
      expect(result.issues[0].suggestion).toBeDefined();
    });
  });
  
  describe('Full E2E Ticket Flow', () => {
    it('should complete full ticket creation flow', async () => {
      const request: CreateTicketRequest = {
        source: 'manual',
        text: 'Looking for pricing on Blue Ridge Douglas Lighting Controller Retro Kit (36 panels, BACnet MS/TP).'
      };
      
      // Create ticket
      const createResponse = await fetch(`${WORKER_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      expect(createResponse.ok).toBe(true);
      const createResult: CreateTicketResponse = await createResponse.json();
      
      // Verify all components present
      expect(createResult.ticketId).toBeDefined();
      expect(createResult.parse).toBeDefined();
      expect(createResult.citations).toBeDefined();
      expect(createResult.draft).toBeDefined();
      expect(createResult.validation).toBeDefined();
      
      // Check parse results
      expect(createResult.parse.category).toBe('pricing');
      expect(createResult.parse.quantity).toBe(36);
      
      // Check citations
      expect(createResult.citations.length).toBeGreaterThan(0);
      
      // Check validation status
      expect(createResult.validation.ok).toBeDefined();
      
      // Retrieve ticket
      const getResponse = await fetch(`${WORKER_URL}/tickets/${createResult.ticketId}`);
      expect(getResponse.ok).toBe(true);
      
      const ticket = await getResponse.json();
      expect(ticket.id).toBe(createResult.ticketId);
      expect(ticket.status).toBe(createResult.validation.ok ? 'ready' : 'escalated');
    });
  });
});