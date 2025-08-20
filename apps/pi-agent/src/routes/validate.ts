import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationResultSchema, VALIDATE_SYSTEM_PROMPT, VALIDATE_USER_PROMPT, OLLAMA_VALIDATE_OPTIONS } from '@egregore/shared';
import { config } from '../config.js';
import { createLogger } from '../utils/logger.js';
import { callOllama } from '../services/ollama.js';

const log = createLogger('routes:validate');

const validateRouter = new Hono();

const ValidateRequestSchema = z.object({
  draft: z.string().min(1),
  facts: z.array(z.object({
    claim: z.string(),
    evidence: z.string().optional()
  }))
});

validateRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { draft, facts } = ValidateRequestSchema.parse(body);
    
    log.info(`Validating draft with ${facts.length} claims`);
    
    // If no facts to check, return OK
    if (facts.length === 0) {
      return c.json({ ok: true, issues: [] });
    }
    
    // Call Ollama to validate claims
    const prompt = VALIDATE_USER_PROMPT(draft, facts);
    
    const result = await callOllama({
      model: config.IE_MODEL,
      system: VALIDATE_SYSTEM_PROMPT,
      prompt,
      options: OLLAMA_VALIDATE_OPTIONS
    });
    
    // Parse and validate JSON response
    let validationResult;
    try {
      validationResult = JSON.parse(result);
    } catch (error) {
      log.error('Failed to parse validation JSON:', result);
      
      // Try with fallback model
      log.info('Retrying with fallback model...');
      const fallbackResult = await callOllama({
        model: config.IE_MODEL_FALLBACK,
        system: VALIDATE_SYSTEM_PROMPT,
        prompt,
        options: OLLAMA_VALIDATE_OPTIONS
      });
      
      validationResult = JSON.parse(fallbackResult);
    }
    
    // Validate against schema
    const validated = ValidationResultSchema.parse(validationResult);
    
    log.info(`Validation complete: ${validated.ok ? 'PASSED' : 'FAILED'} with ${validated.issues.length} issues`);
    
    return c.json(validated);
  } catch (error) {
    log.error('Validation failed:', error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation schema error',
        details: error.errors
      }, 400);
    }
    
    return c.json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { validateRouter };