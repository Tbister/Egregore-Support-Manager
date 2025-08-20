import { Hono } from 'hono';
import { z } from 'zod';
import { IngestRequestSchema, type IngestResult } from '@egregore/shared';
import { getDb } from '../db/setup.js';
import { getEmbedding } from '../services/ollama.js';
import { extractTextFromPdf } from '../services/pdf.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';
import path from 'path';

const log = createLogger('routes:ingest');

const ingestRouter = new Hono();

ingestRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { paths } = IngestRequestSchema.parse(body);
    
    log.info(`Starting ingestion of ${paths.length} documents`);
    
    const result: IngestResult = {
      indexed: 0,
      skipped: 0,
      warnings: []
    };
    
    const db = getDb();
    
    for (const filePath of paths) {
      try {
        // Check if document already exists
        const existing = db.prepare('SELECT id FROM docs WHERE file_path = ?').get(filePath);
        if (existing) {
          log.info(`Skipping already indexed: ${filePath}`);
          result.skipped++;
          continue;
        }
        
        // Extract text from PDF
        log.info(`Extracting text from: ${filePath}`);
        const { text, pageCount, metadata } = await extractTextFromPdf(filePath);
        
        if (!text || text.length < 100) {
          result.warnings.push(`${path.basename(filePath)}: Insufficient text extracted`);
          result.skipped++;
          continue;
        }
        
        // Parse metadata from filename if not in PDF
        const fileName = path.basename(filePath, path.extname(filePath));
        const { vendor, family, model } = parseFileName(fileName, metadata);
        
        // Insert document
        const docResult = db.prepare(`
          INSERT INTO docs (title, vendor, family, model, file_path, page_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          metadata.title || fileName,
          vendor,
          family,
          model,
          filePath,
          pageCount
        );
        
        const docId = docResult.lastInsertRowid;
        
        // Chunk the text
        const chunks = chunkText(text, config.CHUNK_SIZE, config.CHUNK_OVERLAP);
        log.info(`Created ${chunks.length} chunks for document ${docId}`);
        
        // Process each chunk
        const insertChunk = db.prepare(`
          INSERT INTO chunks (doc_id, text, page_start, page_end, embedding)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const chunk of chunks) {
          // Get embedding
          const embedding = await getEmbedding(chunk.text);
          
          insertChunk.run(
            docId,
            chunk.text,
            chunk.pageStart,
            chunk.pageEnd,
            Buffer.from(embedding.buffer)
          );
        }
        
        result.indexed++;
        log.info(`Successfully indexed: ${filePath}`);
        
      } catch (error) {
        log.error(`Failed to ingest ${filePath}:`, error);
        result.warnings.push(`${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.skipped++;
      }
    }
    
    log.info(`Ingestion complete: ${result.indexed} indexed, ${result.skipped} skipped`);
    
    return c.json(result);
  } catch (error) {
    log.error('Ingestion failed:', error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Invalid request',
        details: error.errors
      }, 400);
    }
    
    return c.json({
      error: 'Ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

interface Chunk {
  text: string;
  pageStart: number;
  pageEnd: number;
}

function chunkText(text: string, chunkSize: number, overlap: number): Chunk[] {
  const words = text.split(/\s+/);
  const chunks: Chunk[] = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length < chunkSize / 2 && chunks.length > 0) {
      // Merge small last chunk with previous
      break;
    }
    
    chunks.push({
      text: chunkWords.join(' '),
      pageStart: Math.floor(i / 300) + 1, // Rough estimate: 300 words per page
      pageEnd: Math.floor((i + chunkWords.length) / 300) + 1
    });
  }
  
  return chunks;
}

function parseFileName(fileName: string, metadata: any): { vendor?: string; family?: string; model?: string } {
  // Try to extract vendor, family, model from filename
  // Examples: "Honeywell_Spyder_IOM_RevC", "Johnson_Controls_NAE55_Manual"
  
  const parts = fileName.replace(/[-_]/g, ' ').split(' ');
  
  // Known vendors
  const vendors = ['Honeywell', 'Johnson', 'Siemens', 'Schneider', 'Trane', 'Carrier', 'Daikin'];
  const vendor = parts.find(p => vendors.some(v => v.toLowerCase() === p.toLowerCase()));
  
  return {
    vendor: metadata.vendor || vendor,
    family: metadata.family || parts[1],
    model: metadata.model || parts[2]
  };
}

export { ingestRouter };