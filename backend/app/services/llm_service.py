"""
llm_service.py — Google Gemini integration for the Smart Revision Generator.

v2 update: retrieval-augmented generation (RAG).
All four generation functions now optionally accept a doc_id. When
provided they fetch the top-k relevant chunks from the FAISS index and
inject them as grounded context before the LLM prompt — preventing
hallucination and keeping answers faithful to the source material.

If doc_id is None (or the index doesn't exist yet), the functions fall
back to the full raw text passed in, preserving backward compatibility.
"""

import json
import logging
import os
import re
from typing import Any
from dotenv import load_dotenv

import google.generativeai as genai
from fastapi import HTTPException

from app.services.prompts import SYSTEM_PROMPT, build_prompt

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SDK initialisation
# ---------------------------------------------------------------------------

_API_KEY = os.getenv("GOOGLE_API_KEY")
if not _API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY environment variable is not set. "
        "Add it to your .env file and restart."
    )

genai.configure(api_key=_API_KEY)

# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------

_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

_GENERATION_CONFIG = genai.GenerationConfig(
    temperature=0.4,
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,
)

_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _get_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(
        model_name=_MODEL_NAME,
        generation_config=_GENERATION_CONFIG,
        safety_settings=_SAFETY_SETTINGS,
        system_instruction=SYSTEM_PROMPT,
    )


def _extract_json(raw: str) -> Any:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM returned invalid JSON: {exc}. Raw: {raw[:300]}"
        )


def _get_rag_context(doc_id: str | None, query: str) -> str | None:
    """
    Try to retrieve relevant chunks for RAG.
    Returns None silently if doc_id is absent or index doesn't exist.
    """
    if not doc_id:
        return None
    try:
        from app.services.retriever import retrieve_context_string
        from app.services.vector_store import VectorStore
        if not VectorStore.exists(doc_id):
            logger.debug("No FAISS index for doc_id=%s — using raw text", doc_id)
            return None
        ctx = retrieve_context_string(doc_id, query, k=RAG_TOP_K)
        logger.debug("RAG context fetched (%d chars)", len(ctx))
        return ctx
    except Exception as exc:
        logger.warning("RAG retrieval failed (%s) — falling back to raw text", exc)
        return None


# ---------------------------------------------------------------------------
# Core generation functions
# ---------------------------------------------------------------------------

def generate_text(prompt: str) -> str:
    """Send a prompt to Gemini and return raw text."""
    try:
        model    = _get_model()
        response = model.generate_content(prompt)
        if not response.candidates:
            raise HTTPException(
                status_code=422,
                detail="Gemini blocked the response (safety filter).",
            )
        return response.text
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc}")


def generate_json(prompt: str) -> Any:
    """Send a prompt to Gemini and return a parsed Python object."""
    return _extract_json(generate_text(prompt))


# ---------------------------------------------------------------------------
# Task-level wrappers with RAG support
# ---------------------------------------------------------------------------

def generate_summary(
    text: str,
    difficulty: str = "Intermediate",
    doc_id: str | None = None,
) -> str:
    """Return a Markdown summary string, optionally RAG-grounded."""
    rag_ctx = _get_rag_context(doc_id, query="key concepts core ideas summary")
    content = rag_ctx if rag_ctx else text
    prompt  = build_prompt("summary", content, difficulty=difficulty)
    return generate_text(prompt)


def generate_flashcards(
    text: str,
    difficulty: str = "Intermediate",
    num_cards: int = 15,
    doc_id: str | None = None,
) -> dict:
    """Return parsed flashcard JSON dict, optionally RAG-grounded."""
    rag_ctx = _get_rag_context(doc_id, query="key terms definitions concepts vocabulary")
    content = rag_ctx if rag_ctx else text
    prompt  = build_prompt("flashcard", content, difficulty=difficulty, num_cards=num_cards)
    return generate_json(prompt)


def generate_faqs(
    text: str,
    difficulty: str = "Intermediate",
    num_faqs: int = 10,
    doc_id: str | None = None,
) -> dict:
    """Return parsed FAQ JSON dict, optionally RAG-grounded."""
    rag_ctx = _get_rag_context(doc_id, query="common questions student misconceptions how why")
    content = rag_ctx if rag_ctx else text
    prompt  = build_prompt("faq", content, difficulty=difficulty, num_faqs=num_faqs)
    return generate_json(prompt)


def generate_mock_quiz(
    text: str,
    difficulty: str = "Intermediate",
    question_type: str = "mcq",
    num_questions: int = 5,
    doc_id: str | None = None,
) -> dict:
    """Return parsed mock quiz JSON dict, optionally RAG-grounded."""
    query_map = {
        "mcq":          "exam questions multiple choice test assessment",
        "short_answer": "short answer exam questions explain describe",
        "long_answer":  "essay questions analysis evaluation deep understanding",
    }
    rag_ctx = _get_rag_context(doc_id, query=query_map.get(question_type, "exam questions"))
    content = rag_ctx if rag_ctx else text
    prompt  = build_prompt(
        "mock_quiz", content,
        difficulty=difficulty,
        question_type=question_type,
        num_questions=num_questions,
    )
    return generate_json(prompt)


# ---------------------------------------------------------------------------
# Smoke test  (python -m app.services.llm_service)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample = (
        "Machine learning is a subset of artificial intelligence that enables "
        "systems to learn from data. Supervised learning uses labelled examples; "
        "unsupervised learning finds hidden patterns without labels."
    )
    print(f"Model: {_MODEL_NAME}")
    summary = generate_summary(sample, difficulty="Basic")
    print(summary[:300])
    cards = generate_flashcards(sample, num_cards=2)
    print(json.dumps(cards, indent=2))
    print("=== passed ===")