import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { setupDatabase } from './db/setup.js';
import { ingestRouter } from './routes/ingest.js';
import { searchRouter } from './routes/search.js';
import { parseRouter } from './routes/parse.js';
import { validateRouter } from './routes/validate.js';
import { docRouter } from './routes/doc.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('main');

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', async (c) => {
  try {
    // Test Ollama connection
    const ollamaResponse = await fetch(`${config.OLLAMA_URL}/api/tags`);
    const ollamaOk = ollamaResponse.ok;
    
    // Test database connection
    const db = await setupDatabase();
    const dbOk = !!db;
    
    const healthy = ollamaOk && dbOk;
    
    return c.json({
      status: healthy ? 'healthy' : 'degraded',
      services: {
        ollama: ollamaOk ? 'up' : 'down',
        database: dbOk ? 'up' : 'down'
      },
      timestamp: new Date().toISOString()
    }, healthy ? 200 : 503);
  } catch (error) {
    log.error('Health check failed:', error);
    return c.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 503);
  }
});

// Mount routers
app.route('/ingest', ingestRouter);
app.route('/search', searchRouter);
app.route('/parse', parseRouter);
app.route('/validate', validateRouter);
app.route('/doc', docRouter);

// Error handling
app.onError((err, c) => {
  log.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: err instanceof Error ? err.message : 'Unknown error'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    path: c.req.path
  }, 404);
});

// Initialize database on startup
async function startup() {
  try {
    log.info('Starting Pi Agent...');
    
    // Setup database
    await setupDatabase();
    log.info('Database initialized');
    
    // Test Ollama connection
    const ollamaResponse = await fetch(`${config.OLLAMA_URL}/api/tags`);
    if (!ollamaResponse.ok) {
      log.warn('Ollama not responding - some features may be unavailable');
    } else {
      const data = await ollamaResponse.json();
      log.info(`Ollama connected. Available models: ${data.models?.map((m: any) => m.name).join(', ')}`);
    }
    
    // Start server
    const port = config.PORT;
    log.info(`Pi Agent listening on port ${port}`);
    
    serve({
      fetch: app.fetch,
      port
    });
  } catch (error) {
    log.error('Startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startup();