import { Hono } from 'hono';
import { SearchRequestSchema, type Citation } from '@egregore/shared';
import { getDb } from '../db/setup.js';
import { getEmbedding } from '../services/ollama.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const log = createLogger('routes:search');

const searchRouter = new Hono();

searchRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const searchRequest = SearchRequestSchema.parse(body);
    
    log.info(`Searching for: "${searchRequest.q}" (k=${searchRequest.k})`);
    
    const db = getDb();
    
    // Build filters
    const filters: string[] = [];
    const params: any = {};
    
    if (searchRequest.vendor?.length) {
      filters.push(`d.vendor IN (${searchRequest.vendor.map((_, i) => `$vendor${i}`).join(',')})`);
      searchRequest.vendor.forEach((v, i) => params[`vendor${i}`] = v);
    }
    
    if (searchRequest.family?.length) {
      filters.push(`d.family IN (${searchRequest.family.map((_, i) => `$family${i}`).join(',')})`);
      searchRequest.family.forEach((f, i) => params[`family${i}`] = f);
    }
    
    if (searchRequest.model?.length) {
      filters.push(`d.model IN (${searchRequest.model.map((_, i) => `$model${i}`).join(',')})`);
      searchRequest.model.forEach((m, i) => params[`model${i}`] = m);
    }
    
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    
    // 1. Full-text search (FTS5)
    const ftsQuery = `
      SELECT 
        c.id, c.doc_id, c.text, c.page_start, c.page_end,
        d.title, d.vendor, d.family, d.model,
        bm25(chunks_fts) as score
      FROM chunks_fts
      JOIN chunks c ON chunks_fts.rowid = c.id
      JOIN docs d ON c.doc_id = d.id
      ${whereClause}
      WHERE chunks_fts MATCH $query
      ORDER BY bm25(chunks_fts)
      LIMIT $limit
    `;
    
    const ftsResults = db.prepare(ftsQuery).all({
      ...params,
      query: searchRequest.q,
      limit: config.MAX_SEARCH_RESULTS
    });
    
    // 2. Vector similarity search (VSS)
    let vssResults: any[] = [];
    try {
      const embedding = await getEmbedding(searchRequest.q);
      
      // Note: SQLite doesn't have native vector operations
      // We'll fetch candidates and compute similarity in-memory
      const vssQuery = `
        SELECT 
          c.id, c.doc_id, c.text, c.page_start, c.page_end, c.embedding,
          d.title, d.vendor, d.family, d.model
        FROM chunks c
        JOIN docs d ON c.doc_id = d.id
        ${whereClause}
        WHERE c.embedding IS NOT NULL
      `;
      
      const candidates = db.prepare(vssQuery).all(params);
      
      // Compute cosine similarity
      const withScores = candidates.map((candidate: any) => {
        const candidateEmb = new Float32Array(candidate.embedding);
        const score = cosineSimilarity(embedding, candidateEmb);
        return { ...candidate, score };
      });
      
      // Sort by similarity and take top k
      vssResults = withScores
        .sort((a, b) => b.score - a.score)
        .slice(0, config.MAX_SEARCH_RESULTS);
      
    } catch (error) {
      log.warn('Vector search failed, falling back to FTS only:', error);
    }
    
    // 3. Merge and rank results (0.6 FTS, 0.4 VSS)
    const merged = mergeSearchResults(ftsResults, vssResults, searchRequest.k || 10);
    
    // Format as Citations
    const citations: Citation[] = merged.map(r => ({
      doc_id: r.doc_id,
      title: r.title,
      vendor: r.vendor,
      family: r.family,
      model: r.model,
      page_start: r.page_start,
      page_end: r.page_end,
      snippet: r.text.substring(0, 300) + (r.text.length > 300 ? '...' : ''),
      score: r.score
    }));
    
    log.info(`Search returned ${citations.length} results`);
    
    return c.json({ results: citations });
  } catch (error) {
    log.error('Search failed:', error);
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function mergeSearchResults(fts: any[], vss: any[], k: number): any[] {
  const merged = new Map<number, any>();
  
  // Add FTS results with weighted score
  fts.forEach((result, idx) => {
    const normalizedScore = 1 - (idx / fts.length);
    merged.set(result.id, {
      ...result,
      score: normalizedScore * 0.6
    });
  });
  
  // Add/update with VSS results
  vss.forEach((result, idx) => {
    const normalizedScore = 1 - (idx / vss.length);
    const existing = merged.get(result.id);
    
    if (existing) {
      existing.score += normalizedScore * 0.4;
    } else {
      merged.set(result.id, {
        ...result,
        score: normalizedScore * 0.4
      });
    }
  });
  
  // Sort by combined score and return top k
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export { searchRouter };