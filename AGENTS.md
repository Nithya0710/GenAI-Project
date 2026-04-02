# AGENTS.md

Agentic coding guidelines for the Smart Revision Generator project.

## Project Overview

A GenAI-powered study assistant that processes documents (PDF, DOCX, PPTX) and generates
summaries, flashcards, FAQs, and quizzes. Backend is FastAPI + Python; Frontend is React 19 + Vite + Tailwind.

## Repository Structure

```
.
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── routers/          # API route handlers
│   │   │   ├── documents.py  # /upload endpoint
│   │   │   ├── generate.py   # /summarize, /flashcards, /faq, /mock-quiz
│   │   │   ├── process.py     # /process endpoint
│   │   │   └── chat.py       # /chat endpoint
│   │   ├── services/         # Business logic
│   │   │   ├── llm_service.py # Gemini API integration
│   │   │   ├── parser.py     # Document parsing (PDF/DOCX/PPTX)
│   │   │   ├── chunker.py     # Text chunking
│   │   │   ├── retriever.py   # FAISS retrieval + RAG
│   │   │   ├── vector_store.py # FAISS index management
│   │   │   ├── embedder.py    # Sentence embeddings
│   │   │   ├── prompts.py     # LLM prompt templates
│   │   │   └── cleaner.py     # Text cleaning
│   │   └── utils/
│   │       └── file_utils.py  # File validation utilities
│   ├── tests/                # pytest tests
│   │   ├── test_retriever.py  # RAG/embedding tests
│   │   ├── test_processing.py # Parser + API endpoint tests
│   │   └── sample_files/     # Test fixtures
│   └── requirements.txt      # Python dependencies
├── frontend/             # React application
│   ├── src/
│   │   ├── App.jsx           # Router setup
│   │   ├── pages/            # Page components
│   │   │   ├── SummaryPage.jsx
│   │   │   ├── FlashcardsPage.jsx
│   │   │   ├── FAQPage.jsx
│   │   │   ├── QuizPage.jsx
│   │   │   └── ...
│   │   ├── components/       # Reusable UI components
│   │   ├── api/              # API service layer
│   │   │   └── apiService.js
│   │   └── context/          # React context providers
│   ├── package.json
│   ├── eslint.config.js
│   └── tailwind.config.js
└── docker-compose.yml   # Development orchestration
```

---

## Build / Lint / Test Commands

### Frontend (from `/frontend` directory)

```bash
# Install dependencies
npm install

# Start development server (hot-reload)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint

# Run a single test file (ESLint)
npx eslint path/to/file.jsx

# Type checking (React 19 + Vite — no built-in typecheck; use ESLint)
```

### Backend (from `/backend` directory)

```bash
# Install dependencies (uses venv)
pip install -r requirements.txt

# Run development server with hot-reload
uvicorn app.main:app --reload --port 8000

# Run all tests
pytest -v

# Run a single test file
pytest tests/test_retriever.py -v
pytest tests/test_processing.py -v

# Run a single test function
pytest tests/test_retriever.py::TestSlidingWindowChunker::test_empty_text_returns_no_chunks -v

# Run tests matching a pattern
pytest -k "test_retrieve" -v

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run linting (ruff if installed)
ruff check .
ruff format .
```

### Docker Compose

```bash
# Start all services (first time or after code changes)
docker compose up --build

# Start services (uses cached images)
docker compose up

# Stop and remove containers
docker compose down

# Tail backend logs
docker compose logs -f backend
```

---

## Code Style Guidelines

### Python (Backend)

**Imports:**
- Standard library first, then third-party, then local application imports
- Use absolute imports from `app` package (e.g., `from app.services.parser import ...`)
- Group imports with blank lines between groups

```python
# Standard library
import os
import uuid
import logging

# Third-party
from fastapi import HTTPException
from pydantic import BaseModel

# Local application
from app.services.parser import parse_document
from app.routers.generate import DOC_STORE
```

**Type Hints:**
- Use type hints for all function parameters and return values
- Use `typing` module for complex types (`List`, `Dict`, `Optional`, `Union`)
- Use modern union syntax for Python 3.10+: `str | None` instead of `Optional[str]`

```python
def generate_summary(text: str, difficulty: str = "Intermediate", doc_id: str | None = None) -> str:
    ...
```

**Naming:**
- Functions: `snake_case` (e.g., `parse_document`, `retrieve_context_string`)
- Classes: `PascalCase` (e.g., `VectorStore`, `TestSlidingWindowChunker`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `RAG_TOP_K`, `CHUNK_SIZE`)
- Private members: Leading underscore (e.g., `_get_model`, `_extract_json`)

**Error Handling:**
- Use `HTTPException` for API-level errors with appropriate status codes
- Log errors with full traceback for debugging
- Never expose internal error details to clients in production

```python
try:
    response = _get_model().generate_content(prompt)
except Exception as exc:
    logger.error("Gemini API call failed:\n%s", traceback.format_exc())
    raise HTTPException(
        status_code=502,
        detail=f"Gemini API error [{type(exc).__name__}]: {exc}"
    )
```

**Logging:**
- Use `logging.getLogger(__name__)` for module-level loggers
- Include relevant context (doc_id, operation) in log messages

```python
logger = logging.getLogger(__name__)
logger.info("Background ingest complete: %d chunks for doc_id=%s", n, doc_id)
```

**Docstrings:**
- Use docstrings for public functions and classes
- Include parameter descriptions and return types

```python
def parse_document(filename: str, file_bytes: bytes) -> str:
    """Route to the correct parser based on file extension.
    
    Args:
        filename: The name of the file including extension
        file_bytes: Raw bytes of the file content
    
    Returns:
        Extracted text content as a string
    
    Raises:
        HTTPException: If the file type is unsupported
    """
```

**FastAPI Patterns:**
- Use `APIRouter` for organizing routes
- Use Pydantic models for request/response validation
- Use `BackgroundTasks` for long-running operations (embedding)

### React / JavaScript (Frontend)

**Component Structure:**
- Use functional components with hooks
- One component per file
- Export as default for page components, named export for reusable components

```jsx
// Pages (default export)
export default function SummaryPage() { ... }

// Reusable components (named export)
export function FlashCard({ front, back }) { ... }
```

**Imports:**
- External libraries first
- Internal imports (components, hooks, utils)
- Use absolute paths via configured aliases or relative paths

```jsx
import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSummary } from '../api/apiService'
import ToolPageLayout from '../components/ToolPageLayout'
```

**Hooks:**
- Follow React 19 and react-hooks rules
- Custom hooks in `/hooks` directory
- Use `useQuery` from TanStack Query for data fetching

```jsx
const query = useQuery({
  queryKey: ['summary', docId, difficulty],
  queryFn: () => getSummary(docId, difficulty).then(r => r.data),
  enabled: !!docId,
  staleTime: 5 * 60 * 1000,
})
```

**Tailwind CSS:**
- Use Tailwind utility classes for styling
- Custom colors defined in `tailwind.config.js` (e.g., `primary-500`, `primary-600`)
- Use `prose` class from `@tailwindcss/typography` for markdown content

```jsx
<div className="bg-white rounded-2xl shadow-sm border border-gray-100">
  <div className="px-8 py-6 prose prose-sm max-w-none">
```

**Naming:**
- Components: `PascalCase` (e.g., `SummaryPage`, `FlashCard`)
- Functions/hooks: `camelCase` (e.g., `handleCopy`, `useAuth`)
- CSS classes: kebab-case (e.g., `text-violet-600`, `bg-indigo-50`)

---

## Environment Configuration

**Backend (.env):**
```
GOOGLE_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-1.5-flash  # or gemini-1.5-pro for higher quality
RAG_TOP_K=5                    # number of chunks to retrieve for RAG
```

**Frontend (.env or vite.config.js):**
```
VITE_API_URL=http://localhost:8000
```

---

## Testing Guidelines

**Python Tests:**
- Use `pytest` with fixtures for shared setup/teardown
- Use `scope="module"` for expensive operations (building FAISS indices)
- Clean up test artifacts (index files) in fixtures

```python
@pytest.fixture(scope="module")
def doc_id():
    _id = f"test-{uuid.uuid4().hex[:8]}"
    # ... setup ...
    yield _id
    # cleanup
    if index_dir.exists():
        shutil.rmtree(index_dir)
```

**Frontend Tests:**
- No test framework currently configured (ESLint only for linting)
- Manual testing via `npm run dev` and API calls

---

## Git Workflow

- Branch naming: `feature/`, `fix/`, `refactor/` prefixes
- Commit messages: Clear, concise descriptions of changes
- PRs target `main` or `dev` branches
- CI runs linting and build checks on `main` and `dev` branches
