import { config } from '../config.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('services:ollama');

interface OllamaGenerateRequest {
  model: string;
  system?: string;
  prompt: string;
  options?: Record<string, any>;
  stream?: boolean;
}

interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

export async function callOllama({
  model,
  system,
  prompt,
  options = {},
  stream = false
}: OllamaGenerateRequest): Promise<string> {
  try {
    const response = await fetch(`${config.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system,
        prompt,
        options,
        stream
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    log.error(`Ollama generate failed for model ${model}:`, error);
    throw error;
  }
}

export async function getEmbedding(text: string): Promise<Float32Array> {
  try {
    const response = await fetch(`${config.OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.EMBED_MODEL,
        prompt: text
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embeddings API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return new Float32Array(data.embedding);
  } catch (error) {
    log.error('Failed to get embedding:', error);
    throw error;
  }
}

export async function checkModelAvailable(modelName: string): Promise<boolean> {
  try {
    const response = await fetch(`${config.OLLAMA_URL}/api/tags`);
    if (!response.ok) return false;
    
    const data = await response.json();
    const models = data.models || [];
    return models.some((m: any) => m.name === modelName || m.name.startsWith(modelName + ':'));
  } catch {
    return false;
  }
}

export async function pullModel(modelName: string): Promise<void> {
  log.info(`Pulling model ${modelName}...`);
  
  try {
    const response = await fetch(`${config.OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: modelName,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to pull model: ${error}`);
    }
    
    log.info(`Model ${modelName} pulled successfully`);
  } catch (error) {
    log.error(`Failed to pull model ${modelName}:`, error);
    throw error;
  }
}