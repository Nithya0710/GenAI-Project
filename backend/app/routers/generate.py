"""
generate.py — FastAPI router for LLM-powered generation endpoints.

v2: passes doc_id to every llm_service function so RAG context
is used automatically when the FAISS index is ready.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.llm_service import (
    generate_faqs,
    generate_flashcards,
    generate_mock_quiz,
    generate_summary,
)

router = APIRouter()

# In-memory text store (keyed by doc_id, written by documents.py after upload)
DOC_STORE: dict[str, str] = {}


def _get_text(doc_id: str) -> str:
    text = DOC_STORE.get(doc_id)
    if not text:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{doc_id}' not found. Please upload it first.",
        )
    return text


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class SummarizeRequest(BaseModel):
    doc_id: str
    difficulty: str = Field(default="Intermediate")


class FlashcardRequest(BaseModel):
    doc_id: str
    difficulty: str = "Intermediate"
    num_cards: int  = Field(default=15, ge=5, le=40)


class FAQRequest(BaseModel):
    doc_id: str
    difficulty: str = "Intermediate"
    num_faqs: int   = Field(default=10, ge=3, le=20)


class MockQuizRequest(BaseModel):
    doc_id: str
    difficulty: str    = "Intermediate"
    question_type: str = Field(default="mcq")
    num_questions: int = Field(default=5, ge=3, le=15)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    text    = _get_text(req.doc_id)
    summary = generate_summary(text, difficulty=req.difficulty, doc_id=req.doc_id)
    return {"doc_id": req.doc_id, "difficulty": req.difficulty, "summary": summary}


@router.post("/flashcards")
async def flashcards(req: FlashcardRequest):
    text   = _get_text(req.doc_id)
    result = generate_flashcards(
        text, difficulty=req.difficulty,
        num_cards=req.num_cards, doc_id=req.doc_id,
    )
    return {"doc_id": req.doc_id, "difficulty": req.difficulty, **result}


@router.post("/faq")
async def faq(req: FAQRequest):
    text   = _get_text(req.doc_id)
    result = generate_faqs(
        text, difficulty=req.difficulty,
        num_faqs=req.num_faqs, doc_id=req.doc_id,
    )
    return {"doc_id": req.doc_id, "difficulty": req.difficulty, **result}


@router.post("/mock-quiz")
async def mock_quiz(req: MockQuizRequest):
    valid_types = {"mcq", "short_answer", "long_answer"}
    if req.question_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid question_type. Must be one of: {valid_types}",
        )
    text   = _get_text(req.doc_id)
    result = generate_mock_quiz(
        text, difficulty=req.difficulty,
        question_type=req.question_type,
        num_questions=req.num_questions,
        doc_id=req.doc_id,
    )
    return {
        "doc_id": req.doc_id,
        "difficulty": req.difficulty,
        "question_type": req.question_type,
        **result,
    }