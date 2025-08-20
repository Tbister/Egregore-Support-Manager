module.exports = {
  apps: [
    {
      name: 'pi-agent',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        OLLAMA_URL: 'http://localhost:11434',
        DB_PATH: '/data/manuals/manuals.db',
        EMBED_MODEL: 'nomic-embed-text',
        IE_MODEL: 'phi3:mini',
        IE_MODEL_FALLBACK: 'qwen2.5:1.5b',
        VEC_DIM: 384,
        CHUNK_SIZE: 900,
        CHUNK_OVERLAP: 150,
        MAX_SEARCH_RESULTS: 20,
        LOG_LEVEL: 'info'
      },
      error_file: '/var/log/pi-agent/pm2-error.log',
      out_file: '/var/log/pi-agent/pm2-out.log',
      log_file: '/var/log/pi-agent/pm2-combined.log',
      time: true,
      kill_timeout: 5000,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    }
  ]
};