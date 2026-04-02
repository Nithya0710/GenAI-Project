# Smart Revision Generator

A GenAI-powered study assistant that processes documents (PDF, DOCX, PPTX) and generates summaries, flashcards, FAQs, and quizzes. Features RAG-powered chat for interactive document exploration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React 19)                      │
│                    Vite + Tailwind + TanStack Query             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/REST
┌───────────────────────────────▼─────────────────────────────────┐
│                       Backend (FastAPI)                          │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ /upload  │   │/summarize│   │/flashcards│  │ /faq     │   │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘  └────┬─────┘   │
│       │              │              │             │             │
│  ┌────▼──────────────▼──────────────▼─────────────▼────────┐  │
│  │                   LLM Service (Gemini 1.5)               │  │
│  │         + RAG Retrieval (FAISS + SentenceTransformers)   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Document Upload**: Upload PDF, DOCX, PPTX files up to 20MB
- **Smart Summaries**: Generate structured summaries at Basic, Intermediate, or Advanced difficulty
- **Flashcards**: Auto-generated flashcards with flip cards, reset, and topic grouping
- **FAQs**: Common questions with categorized answers (conceptual, application, clarification)
- **Mock Quizzes**: MCQ, short-answer, and long-answer questions
- **RAG Chat**: Ask questions about your documents with semantic retrieval from FAISS
- **Difficulty Calibration**: All content adapts to student's level (Basic/Intermediate/Advanced)

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, Vite 7, Tailwind 4        |
| Backend   | FastAPI, uvicorn, Pydantic          |
| LLM       | Google Gemini 1.5 Flash/Pro         |
| Embeddings| SentenceTransformers (all-MiniLM-L6-v2) |
| Vector DB | FAISS (IndexFlatIP, CPU)            |
| Parsing   | PyMuPDF, python-docx, python-pptx  |
| Testing   | pytest, pytest-asyncio, httpx       |

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, router registration
│   │   ├── routers/
│   │   │   ├── documents.py         # POST /api/upload — file upload + RAG ingest
│   │   │   ├── generate.py          # POST /api/summarize, /flashcards, /faq, /mock-quiz
│   │   │   ├── process.py          # POST /api/process — chunk extraction
│   │   │   └── chat.py             # POST /api/chat — RAG chat
│   │   ├── services/
│   │   │   ├── llm_service.py      # Gemini API, JSON parsing, RAG context injection
│   │   │   ├── parser.py           # PDF/DOCX/PPTX text extraction
│   │   │   ├── chunker.py          # Simple word-boundary chunking
│   │   │   ├── retriever.py        # Sliding-window chunker + ingest/retrieve API
│   │   │   ├── vector_store.py     # FAISS index (add_documents, search, save, load)
│   │   │   ├── embedder.py         # SentenceTransformer singleton wrapper
│   │   │   └── prompts.py          # All LLM prompt templates + build_prompt()
│   │   └── utils/
│   │       └── file_utils.py        # File type/size validation
│   ├── tests/
│   │   ├── test_retriever.py        # Chunking + ingest + retrieval integration tests
│   │   ├── test_processing.py       # Parser + /process endpoint tests
│   │   ├── test_parser.py           # Individual parser tests
│   │   └── sample_files/            # sample.pdf, sample.docx, sample.pptx
│   ├── faiss_index/                # Persisted FAISS indices (gitignored)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Router: NotebooksList, Notebook, Summary, Flashcards, FAQ, Quiz
│   │   ├── pages/
│   │   │   ├── NotebooksListPage.jsx
│   │   │   ├── NotebookPage.jsx     # 3-panel: Resources | Chat | Tools
│   │   │   ├── SummaryPage.jsx
│   │   │   ├── FlashcardsPage.jsx
│   │   │   ├── FAQPage.jsx
│   │   │   └── QuizPage.jsx
│   │   ├── components/
│   │   │   ├── ToolPageLayout.jsx  # Reusable layout with loading/error states
│   │   │   ├── FlashCard.jsx       # 3D flip card component
│   │   │   ├── FileUpload.jsx      # Drag-and-drop uploader
│   │   │   ├── Navbar.jsx
│   │   │   └── ui/                 # Button, Badge, Skeleton, Spinner, ProgressBar
│   │   ├── context/
│   │   │   ├── NotebookContext.jsx # Notebook/doc state management
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── api/
│   │   │   └── apiService.js       # Axios API client
│   │   └── index.css               # Tailwind + typography plugin
│   ├── package.json
│   ├── eslint.config.js
│   ├── tailwind.config.js          # Custom primary color palette
│   ├── vite.config.js              # React plugin + /api proxy to backend
│   └── Dockerfile
│
├── github/workflows/
│   └── frontend-ci.yml             # ESLint + build on push/PR to main/dev
│
└── docker-compose.yml              # Backend + Frontend orchestration
```

---

## API Endpoints

### Document Management

| Method | Endpoint   | Description                                           |
|--------|------------|-------------------------------------------------------|
| POST   | `/api/upload`   | Upload file, returns `doc_id` + text preview          |
| POST   | `/api/process`  | Extract chunks from file (for preview/debugging)      |

### Content Generation

| Method | Endpoint        | Description                                   |
|--------|-----------------|-----------------------------------------------|
| POST   | `/api/summarize`    | Generate structured Markdown summary          |
| POST   | `/api/flashcards`   | Generate flip-card flashcards (JSON)          |
| POST   | `/api/faq`          | Generate FAQs with categories (JSON)          |
| POST   | `/api/mock-quiz`    | Generate MCQ/short/long-answer quiz (JSON)   |
| POST   | `/api/chat`         | RAG-powered chat with conversation history    |

### Health

| Method | Endpoint   | Description                        |
|--------|------------|------------------------------------|
| GET    | `/health`  | Health check (no auth required)    |

### Request/Response Examples

**POST /api/upload**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@lecture.pdf"
```

**Response:**
```json
{
  "doc_id": "abc-123",
  "filename": "lecture.pdf",
  "char_count": 15000,
  "word_count": 2200,
  "preview": "Machine learning is a subset of...",
  "full_text": "..."
}
```

**POST /api/summarize**
```json
{
  "doc_id": "abc-123",
  "difficulty": "Intermediate"
}
```

**POST /api/flashcards**
```json
{
  "doc_id": "abc-123",
  "difficulty": "Intermediate",
  "num_cards": 15
}
```

**POST /api/chat**
```json
{
  "doc_id": "abc-123",
  "message": "What is backpropagation?",
  "history": [
    {"role": "user", "content": "What is a neural network?"},
    {"role": "assistant", "content": "A neural network is..."}
  ]
}
```

---

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
RAG_TOP_K=5
EOF

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies /api to localhost:8000)
npm run dev
```

### Docker Compose (Full Stack)

```bash
# Copy and fill in your API key
cp backend/.env.example backend/.env
# Edit .env with your GOOGLE_API_KEY

# Start both services
docker compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# Docs:     http://localhost:8000/docs
```

---

## Configuration

### Backend Environment Variables

| Variable          | Default              | Description                            |
|-------------------|----------------------|----------------------------------------|
| `GOOGLE_API_KEY`  | **required**         | Gemini API key                         |
| `GEMINI_MODEL`    | `gemini-2.5-flash`   | Model: flash (fast) or pro (quality)  |
| `RAG_TOP_K`       | `5`                  | Chunks retrieved per RAG query         |
| `CHUNK_SIZE`      | `350`                | Target words per chunk                 |
| `CHUNK_OVERLAP`   | `50`                 | Overlapping words between chunks       |
| `EMBED_MODEL`     | `all-MiniLM-L6-v2`   | SentenceTransformer model name         |
| `EMBED_BATCH_SIZE`| `32`                 | Embedding batch size (CPU-safe)        |
| `FAISS_INDEX_ROOT`| `faiss_index`        | Directory for persisted indices        |

### Frontend Environment Variables

| Variable       | Default                  | Description              |
|----------------|--------------------------|--------------------------|
| `VITE_API_URL` | `http://localhost:8000`  | Backend API base URL     |

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest -v

# Run a specific test file
pytest tests/test_retriever.py -v

# Run a single test function
pytest tests/test_retriever.py::TestSlidingWindowChunker::test_empty_text_returns_no_chunks -v

# Run tests matching a pattern
pytest -k "test_retrieve" -v

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

### Frontend Linting

```bash
cd frontend
npm run lint
```

---

## RAG Pipeline

The Retrieval-Augmented Generation pipeline works as follows:

1. **Upload** → `documents.py` calls `ingest_document()`
2. **Parse** → `parser.py` extracts raw text with `[Page N]` / `[Slide N]` markers
3. **Chunk** → `retriever._sliding_window_chunks()` splits text into word windows (keeps markers on separate lines so page numbers are preserved in metadata)
4. **Embed** → `embedder.py` converts chunks to 384-dim vectors using all-MiniLM-L6-v2
5. **Index** → `vector_store.py` adds vectors to FAISS IndexFlatIP + saves to disk
6. **Retrieve** → On generation request, `retriever.retrieve_context_string()` finds top-k chunks by cosine similarity
7. **Generate** → `llm_service.py` injects context into the prompt and calls Gemini

The FAISS index persists to `backend/faiss_index/<doc_id>/` (gitignored) so re-generation requests use cached embeddings without re-embedding.

---

## Code Style

See [AGENTS.md](./AGENTS.md) for full coding guidelines covering:
- Python import ordering, type hints, naming conventions, error handling, logging
- React component structure, hooks patterns, Tailwind CSS conventions
- Testing guidelines

---

## License

MIT
