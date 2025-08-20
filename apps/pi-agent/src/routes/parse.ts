import { Hono } from 'hono';
import { z } from 'zod';
import { ParseResultSchema, PARSE_SYSTEM_PROMPT, PARSE_USER_PROMPT, OLLAMA_PARSE_OPTIONS } from '@egregore/shared';
import { config } from '../config.js';
import { createLogger } from '../utils/logger.js';
import { callOllama } from '../services/ollama.js';

const log = createLogger('routes:parse');

const parseRouter = new Hono();

const ParseRequestSchema = z.object({
  text: z.string().min(1)
});

parseRouter.post('/', async (c) => {
  try {
    // Validate request
    const body = await c.req.json();
    const { text } = ParseRequestSchema.parse(body);
    
    log.info(`Parsing ticket text (${text.length} chars)`);
    
    // Call Ollama with parse prompt
    const prompt = PARSE_USER_PROMPT(text);
    
    const result = await callOllama({
      model: config.IE_MODEL,
      system: PARSE_SYSTEM_PROMPT,
      prompt,
      options: OLLAMA_PARSE_OPTIONS
    });
    
    // Parse and validate JSON response
    let parseResult;
    try {
      parseResult = JSON.parse(result);
    } catch (error) {
      log.error('Failed to parse Ollama JSON response:', result);
      
      // Try with fallback model
      log.info('Retrying with fallback model...');
      const fallbackResult = await callOllama({
        model: config.IE_MODEL_FALLBACK,
        system: PARSE_SYSTEM_PROMPT,
        prompt,
        options: OLLAMA_PARSE_OPTIONS
      });
      
      parseResult = JSON.parse(fallbackResult);
    }
    
    // Validate against schema
    const validated = ParseResultSchema.parse(parseResult);
    
    log.info('Parse successful:', {
      category: validated.category,
      products: validated.product.length,
      priority: validated.priority,
      missingCount: validated.missing.length
    });
    
    return c.json(validated);
  } catch (error) {
    log.error('Parse failed:', error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors
      }, 400);
    }
    
    return c.json({
      error: 'Parse failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { parseRouter };