import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
  PORT: z.string().default('8080').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  
  // Ollama Configuration
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  EMBED_MODEL: z.string().default('nomic-embed-text'),
  IE_MODEL: z.string().default('phi3:mini'),
  IE_MODEL_FALLBACK: z.string().default('qwen2.5:1.5b'),
  
  // Database Configuration
  DB_PATH: z.string().default('/data/manuals/manuals.db'),
  VEC_DIM: z.string().default('384').transform(Number),
  
  // Processing Configuration
  CHUNK_SIZE: z.string().default('900').transform(Number),
  CHUNK_OVERLAP: z.string().default('150').transform(Number),
  MAX_SEARCH_RESULTS: z.string().default('20').transform(Number),
  
  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
});

// Parse and validate environment variables
const parseResult = ConfigSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid configuration:', parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;

// Export type for config
export type Config = typeof config;