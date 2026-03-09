# Mobitel Integrated Legal Management System (MobiLex)

AI-Powered Legal Case Handling & Agreement Approval Management System

## Tech Stack
- **Frontend**: React 18 + Vite + MUI 5
- **Backend**: FastAPI + SQLAlchemy + SQLite
- **AI Engine**: Groq LLM (llama-3.3-70b-versatile)
- **Vector DB**: ChromaDB for semantic search
- **Local Fallback**: Ollama (optional)

## Quick Start

### 1. Backend Setup
```bash
cd backend

# Activate virtual environment
# Windows:
..\venv\Scripts\Activate.ps1
# Linux/Mac:
source ../venv/bin/activate

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Run backend
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Access
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Supervisor | supervisor | super123 |
| Legal Officer | officer1 | officer123 |
| Reviewer | reviewer1 | review123 |
| Manager | manager | manager123 |

## API Key Setup
Get a free Groq API key at https://console.groq.com and set it in `backend/.env`:
```
GROQ_API_KEY=your_key_here
```

## Features
- Legal Case Handling with full lifecycle
- Agreement Approval with review workflow
- AI Document Summarization
- Structured Data Extraction
- Clause-Level Intelligence & Comparison
- Explainable Risk Scoring (0-100)
- Semantic Search (ChromaDB)
- Ask Legal AI Chatbot (RAG)
- PII Detection & Masking
- Smart Negotiation Assistant
- Auto Template Generator
- Case Timeline Intelligence
- Document Completeness Validator
- RBAC (4 roles) with audit trail
