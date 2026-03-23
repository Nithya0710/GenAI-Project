"""
llm_service.py — Google Gemini integration for the Smart Revision Generator.

Wraps google-generativeai SDK calls so the rest of the app never
imports the SDK directly — swap models or providers here without
touching routers or other services.
"""

import json
import os
import re
from typing import Any

import google.generativeai as genai
from fastapi import HTTPException

from app.services.prompts import SYSTEM_PROMPT, build_prompt

# ---------------------------------------------------------------------------
# SDK initialisation (runs once at import time)
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
    temperature=0.4,        # low = more deterministic / faithful to source
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,
)

_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",  "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT",  "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _get_model() -> genai.GenerativeModel:
    """Return a configured GenerativeModel instance."""
    return genai.GenerativeModel(
        model_name=_MODEL_NAME,
        generation_config=_GENERATION_CONFIG,
        safety_settings=_SAFETY_SETTINGS,
        system_instruction=SYSTEM_PROMPT,
    )


def _extract_json(raw: str) -> Any:
    """
    Strip markdown code fences and parse JSON from the model response.
    Gemini sometimes wraps JSON in ```json ... ``` despite instructions.
    """
    # Remove ```json ... ``` or ``` ... ``` fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM returned invalid JSON: {exc}. Raw: {raw[:300]}"
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_text(prompt: str) -> str:
    """
    Send a prompt to Gemini and return the raw text response.

    Use this for Markdown outputs (summary).
    Raises HTTPException on API or safety errors.
    """
    try:
        model = _get_model()
        response = model.generate_content(prompt)

        # Check for blocked content
        if not response.candidates:
            raise HTTPException(
                status_code=422,
                detail="Gemini blocked the response (safety filter). "
                       "Try rephrasing or using different content."
            )

        return response.text

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {exc}"
        )


def generate_json(prompt: str) -> Any:
    """
    Send a prompt to Gemini and return a parsed Python object.

    Use this for structured outputs (flashcards, FAQs, mock quiz).
    Raises HTTPException on API, safety, or JSON parse errors.
    """
    raw = generate_text(prompt)
    return _extract_json(raw)


# ---------------------------------------------------------------------------
# Task-level convenience wrappers
# ---------------------------------------------------------------------------

def generate_summary(text: str, difficulty: str = "Intermediate") -> str:
    """Return a Markdown summary string."""
    prompt = build_prompt("summary", text, difficulty=difficulty)
    return generate_text(prompt)


def generate_flashcards(
    text: str,
    difficulty: str = "Intermediate",
    num_cards: int = 15,
) -> dict:
    """Return parsed flashcard JSON dict."""
    prompt = build_prompt(
        "flashcard", text, difficulty=difficulty, num_cards=num_cards
    )
    return generate_json(prompt)


def generate_faqs(
    text: str,
    difficulty: str = "Intermediate",
    num_faqs: int = 10,
) -> dict:
    """Return parsed FAQ JSON dict."""
    prompt = build_prompt("faq", text, difficulty=difficulty, num_faqs=num_faqs)
    return generate_json(prompt)


def generate_mock_quiz(
    text: str,
    difficulty: str = "Intermediate",
    question_type: str = "mcq",
    num_questions: int = 5,
) -> dict:
    """Return parsed mock quiz JSON dict."""
    prompt = build_prompt(
        "mock_quiz",
        text,
        difficulty=difficulty,
        question_type=question_type,
        num_questions=num_questions,
    )
    return generate_json(prompt)


# ---------------------------------------------------------------------------
# Smoke test (run with: python -m app.services.llm_service)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample = (
        "Machine learning is a subset of artificial intelligence that enables "
        "systems to learn from data. Supervised learning uses labelled examples; "
        "unsupervised learning finds hidden patterns without labels."
    )

    print("=== Testing Gemini connection ===")
    print(f"Model : {_MODEL_NAME}")

    summary = generate_summary(sample, difficulty="Basic")
    print("\n--- Summary (first 300 chars) ---")
    print(summary[:300])

    cards = generate_flashcards(sample, num_cards=2)
    print("\n--- Flashcards ---")
    print(json.dumps(cards, indent=2))

    print("\n=== All tests passed ===")