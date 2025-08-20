import { Hono } from 'hono';
import { getDb } from '../db/setup.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('routes:doc');

const docRouter = new Hono();

// Get document metadata
docRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id)) {
      return c.json({ error: 'Invalid document ID' }, 400);
    }
    
    const db = getDb();
    const doc = db.prepare(`
      SELECT id, title, vendor, family, model, file_path, page_count, created_at, updated_at
      FROM docs
      WHERE id = ?
    `).get(id);
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    return c.json(doc);
  } catch (error) {
    log.error('Failed to get document:', error);
    return c.json({
      error: 'Failed to retrieve document',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get page text
docRouter.get('/page/:doc_id/:page', async (c) => {
  try {
    const docId = parseInt(c.req.param('doc_id'));
    const page = parseInt(c.req.param('page'));
    
    if (isNaN(docId) || isNaN(page)) {
      return c.json({ error: 'Invalid parameters' }, 400);
    }
    
    const db = getDb();
    
    // Get document info
    const doc = db.prepare('SELECT * FROM docs WHERE id = ?').get(docId);
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    // Get chunks for this page
    const chunks = db.prepare(`
      SELECT text, page_start, page_end
      FROM chunks
      WHERE doc_id = ? AND page_start <= ? AND page_end >= ?
      ORDER BY page_start
    `).all(docId, page, page);
    
    if (chunks.length === 0) {
      return c.json({ error: 'Page not found' }, 404);
    }
    
    return c.json({
      doc_id: docId,
      title: doc.title,
      page,
      total_pages: doc.page_count,
      text: chunks.map((c: any) => c.text).join('\n\n')
    });
  } catch (error) {
    log.error('Failed to get page:', error);
    return c.json({
      error: 'Failed to retrieve page',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { docRouter };