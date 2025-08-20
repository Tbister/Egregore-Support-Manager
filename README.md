# Egregore - HVAC Support Manager

> Two-agent production system for intelligent HVAC technical support

## 🏗️ Architecture Overview

Egregore implements a sophisticated two-agent architecture:
- **Front Agent (LLM)**: OpenAI GPT-4 for drafting polished customer emails
- **Back Agent (SLM)**: Ollama (Phi3/Qwen) on Raspberry Pi for deterministic parsing and validation
- **Orchestrator**: Cloudflare Worker coordinating the agent loop
- **Frontend**: React dashboard for ticket management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Raspberry Pi with Ollama installed
- Cloudflare account
- OpenAI API key

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/egregore.git
cd egregore

# Install dependencies
pnpm install

# Build all packages
pnpm run build
```

### Configuration

#### 1. Pi Agent Setup (Raspberry Pi)
```bash
cd apps/pi-agent
cp .env.example .env
# Edit .env with your configuration

# Install Ollama models
ollama pull phi3:mini
ollama pull qwen2.5:1.5b
ollama pull nomic-embed-text

# Initialize database
npm run db:init

# Start service
npm run start:pm2
# OR use systemd
sudo npm run deploy
```

#### 2. Worker Deployment (Cloudflare)
```bash
cd apps/worker
cp .dev.vars.example .dev.vars
# Add your OPENAI_API_KEY and PI_API_BASE

# Deploy to Cloudflare
wrangler login
npm run deploy
```

#### 3. Frontend Deployment (Vercel)
```bash
cd apps/frontend
# Set VITE_WORKER_URL and VITE_PI_URL in .env
npm run build
npm run deploy
```

## 📡 API Endpoints

### Pi Agent (Port 8080)
- `POST /parse` - Extract structured data from ticket text
- `POST /search` - Hybrid search (FTS + VSS) in manuals database
- `POST /validate` - Fact-check draft against manuals
- `POST /ingest` - Index PDF manuals into database
- `GET /doc/:id` - Get document metadata
- `GET /doc/page/:doc_id/:page` - Get page text

### Worker Orchestrator
- `POST /tickets` - Create new support ticket
- `GET /tickets/:id` - Retrieve ticket details
- `POST /tickets/:id/send` - Send email (Phase 2)

## 🔄 Data Flow

1. **Ticket Intake**: Customer inquiry via manual input, Gmail, or HubSpot
2. **Parse (Pi)**: Extract category, products, protocols, priority, missing info
3. **Search (Pi)**: Find relevant manual chunks using hybrid search
4. **Draft (LLM)**: Compose professional response with citations
5. **Validate (Pi)**: Cross-check technical claims against manuals
6. **Decision**: If validated → Ready to send, else → Escalate to human

## 📊 Database Schema

### SQLite with FTS5 + Vector Extensions
```sql
-- Documents table
docs (id, title, vendor, family, model, file_path, page_count)

-- Chunks table with embeddings
chunks (id, doc_id, text, page_start, page_end, embedding)

-- Full-text search virtual table
chunks_fts (text)
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# E2E tests
cd tests/e2e
npm test

# Test coverage
npm run test:coverage
```

### Test Cases
- ✅ Parse pricing emails correctly
- ✅ Detect urgent priority for safety issues
- ✅ Search returns relevant Spyder documentation
- ✅ Draft stays under 200 words with citations
- ✅ Validation flags incorrect technical claims
- ✅ Complete ticket flow from creation to validation

## 🚢 Production Deployment

### Raspberry Pi Setup
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install nodejs npm postgresql tesseract-ocr poppler-utils

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Deploy Pi Agent
cd /home/pi
git clone <repo>
cd egregore/apps/pi-agent
npm install --production
sudo cp ../../infra/systemd/pi-agent.service /etc/systemd/system/
sudo systemctl enable pi-agent
sudo systemctl start pi-agent
```

### Monitoring
```bash
# Check service status
sudo systemctl status pi-agent

# View logs
sudo journalctl -u pi-agent -f

# PM2 monitoring
pm2 monit
```

## 📈 Performance Metrics

- **Parse latency**: < 500ms (Phi3 on Pi)
- **Search latency**: < 200ms (SQLite FTS5)
- **Draft generation**: < 3s (GPT-4)
- **Validation**: < 1s (Phi3)
- **End-to-end ticket**: < 5s total

## 🔒 Security

- API keys stored in environment variables
- CORS configured for frontend domain only
- Rate limiting on public endpoints
- Input validation with Zod schemas
- Deterministic JSON output (temperature=0)

## 🛠️ Troubleshooting

### Common Issues

**Ollama not responding**
```bash
# Check Ollama service
systemctl status ollama
# Restart if needed
sudo systemctl restart ollama
```

**Database locked**
```bash
# Check for stuck processes
lsof | grep manuals.db
# Kill if necessary
kill -9 <PID>
```

**Memory issues on Pi**
```bash
# Check memory usage
free -h
# Restart Pi Agent with lower limits
pm2 restart pi-agent --max-memory-restart 512M
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📧 Support

For issues and questions:
- GitHub Issues: [github.com/yourusername/egregore/issues](https://github.com/yourusername/egregore/issues)
- Email: support@yourcompany.com

---

Built with ❤️ for HVAC professionals