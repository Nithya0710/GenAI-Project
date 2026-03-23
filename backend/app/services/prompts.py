"""
prompts.py — Centralized prompt templates for the Smart Revision Generator.

Version: 1.0.0
All prompts are versioned here so changes are tracked in git.
Import PROMPT_REGISTRY to get the right template by name.
"""

# ---------------------------------------------------------------------------
# System prompt (shared across all generation tasks)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert academic tutor and study assistant.
Your job is to transform raw lecture notes, slides, or transcripts into
high-quality revision materials.

Rules you must always follow:
- Stay strictly faithful to the source content — never hallucinate facts.
- Use clear, concise academic English.
- Structure output exactly as requested (JSON, Markdown, numbered lists, etc.).
- Calibrate depth and vocabulary to the requested difficulty level.
- Never include meta-commentary like "Here is your summary". Just output the content.
"""

# ---------------------------------------------------------------------------
# Difficulty level instructions (injected into each prompt)
# ---------------------------------------------------------------------------

DIFFICULTY_INSTRUCTIONS = {
    "Basic": (
        "Use simple language suitable for a first-time learner. "
        "Focus on core definitions and the most important concepts only. "
        "Avoid jargon; explain any technical terms when they appear."
    ),
    "Intermediate": (
        "Use standard academic language. Cover all key concepts, their "
        "relationships, and common applications. Assume the reader has "
        "introductory knowledge of the subject."
    ),
    "Advanced": (
        "Use precise technical language. Go beyond surface definitions — "
        "include nuance, edge cases, comparisons, and exam-level depth. "
        "Assume the reader is preparing for a comprehensive assessment."
    ),
}

# ---------------------------------------------------------------------------
# 1. Summary prompt
# ---------------------------------------------------------------------------

SUMMARY_PROMPT = """You are given the following lecture content:

<content>
{text}
</content>

Difficulty level: {difficulty}
{difficulty_instruction}

Generate a structured summary of the content above.

Output format (Markdown):
# Summary

## Key Concepts
- List each major concept as a bullet point with a 1–2 sentence explanation.

## Core Ideas
Write 3–5 paragraphs covering the main ideas in logical order.

## Key Takeaways
- 3–5 bullet points the student must remember for an exam.
"""

# ---------------------------------------------------------------------------
# 2. Flashcard prompt
# ---------------------------------------------------------------------------

FLASHCARD_PROMPT = """You are given the following lecture content:

<content>
{text}
</content>

Difficulty level: {difficulty}
{difficulty_instruction}

Generate exactly {num_cards} flashcards from this content.

Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.
Schema:
{{
  "flashcards": [
    {{
      "id": 1,
      "front": "<term or question>",
      "back": "<definition or answer>",
      "topic": "<sub-topic this card belongs to>"
    }}
  ]
}}

Rules:
- Each front should be a concise term, phrase, or question (max 15 words).
- Each back should be a complete, self-contained answer (1–3 sentences).
- Cover a broad range of topics from the content — do not cluster on one section.
- No duplicate fronts.
"""

# ---------------------------------------------------------------------------
# 3. FAQ prompt
# ---------------------------------------------------------------------------

FAQ_PROMPT = """You are given the following lecture content:

<content>
{text}
</content>

Difficulty level: {difficulty}
{difficulty_instruction}

Generate exactly {num_faqs} Frequently Asked Questions (FAQs) a student might
ask about this content, along with clear answers.

Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.
Schema:
{{
  "faqs": [
    {{
      "id": 1,
      "question": "<the question>",
      "answer": "<a clear, complete answer>",
      "category": "conceptual | application | clarification"
    }}
  ]
}}

Rules:
- Mix question types: conceptual (what/why), application (how), clarification (common misconceptions).
- Answers must be fully self-contained — the student should not need the source to understand them.
- Questions should reflect what real students commonly struggle with.
"""

# ---------------------------------------------------------------------------
# 4. Mock quiz prompt
# ---------------------------------------------------------------------------

MOCK_QUIZ_PROMPT = """You are given the following lecture content:

<content>
{text}
</content>

Difficulty level: {difficulty}
{difficulty_instruction}

Question type requested: {question_type}

Generate exactly {num_questions} exam-style questions of type "{question_type}".

Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

If question_type is "mcq":
{{
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "question": "<the question stem>",
      "options": {{
        "A": "<option A>",
        "B": "<option B>",
        "C": "<option C>",
        "D": "<option D>"
      }},
      "correct_answer": "A",
      "explanation": "<why this answer is correct>"
    }}
  ]
}}

If question_type is "short_answer":
{{
  "questions": [
    {{
      "id": 1,
      "type": "short_answer",
      "question": "<the question>",
      "model_answer": "<ideal 2–4 sentence answer>",
      "marks": 2
    }}
  ]
}}

If question_type is "long_answer":
{{
  "questions": [
    {{
      "id": 1,
      "type": "long_answer",
      "question": "<the question>",
      "key_points": ["<point 1>", "<point 2>", "<point 3>"],
      "marks": 10
    }}
  ]
}}

Rules:
- Questions must be answerable from the provided content only.
- For MCQ: exactly one correct answer; distractors must be plausible.
- Vary the cognitive level: recall, comprehension, and application.
"""

# ---------------------------------------------------------------------------
# Prompt registry — use this to look up templates by name
# ---------------------------------------------------------------------------

PROMPT_REGISTRY = {
    "summary":    SUMMARY_PROMPT,
    "flashcard":  FLASHCARD_PROMPT,
    "faq":        FAQ_PROMPT,
    "mock_quiz":  MOCK_QUIZ_PROMPT,
}

# ---------------------------------------------------------------------------
# Default generation parameters
# ---------------------------------------------------------------------------

DEFAULT_PARAMS = {
    "summary": {
        "difficulty": "Intermediate",
    },
    "flashcard": {
        "num_cards": 15,
        "difficulty": "Intermediate",
    },
    "faq": {
        "num_faqs": 10,
        "difficulty": "Intermediate",
    },
    "mock_quiz": {
        "num_questions": 5,
        "question_type": "mcq",   # "mcq" | "short_answer" | "long_answer"
        "difficulty": "Intermediate",
    },
}


def build_prompt(task: str, text: str, **kwargs) -> str:
    """
    Build a filled prompt string for a given task.

    Args:
        task:   One of "summary", "flashcard", "faq", "mock_quiz".
        text:   The extracted document text to insert into the prompt.
        **kwargs: Override any DEFAULT_PARAMS for this task
                  (e.g. difficulty="Advanced", num_cards=20).

    Returns:
        A fully formatted prompt string ready to send to the LLM.

    Raises:
        ValueError: If the task name is not in PROMPT_REGISTRY.

    Example:
        prompt = build_prompt("summary", doc_text, difficulty="Advanced")
        prompt = build_prompt("flashcard", doc_text, num_cards=20)
        prompt = build_prompt("mock_quiz", doc_text, question_type="long_answer")
    """
    if task not in PROMPT_REGISTRY:
        raise ValueError(
            f"Unknown task '{task}'. "
            f"Valid tasks: {list(PROMPT_REGISTRY.keys())}"
        )

    # Merge defaults with caller overrides
    params = {**DEFAULT_PARAMS.get(task, {}), **kwargs}

    # Inject difficulty instruction text
    difficulty = params.get("difficulty", "Intermediate")
    params["difficulty_instruction"] = DIFFICULTY_INSTRUCTIONS.get(
        difficulty, DIFFICULTY_INSTRUCTIONS["Intermediate"]
    )

    template = PROMPT_REGISTRY[task]
    return template.format(text=text, **params)