import pino from 'pino';
import { config } from '../config.js';

const pinoConfig = {
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard'
    }
  } : undefined
};

const baseLogger = pino(pinoConfig);

export function createLogger(module: string) {
  return baseLogger.child({ module });
}