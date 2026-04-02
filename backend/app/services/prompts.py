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

Output format — follow this EXACT structure:
# Summary

---

# Key Concepts

Use a numbered list. Each item must have a bold term followed by an em-dash with a 1–2 sentence explanation. Cover all major concepts from the content.

Example:
1. **Neural Networks** — Inspired by the human brain, consisting of layers of interconnected nodes with weighted connections that learn hierarchical representations from raw data.
2. **Backpropagation** — The algorithm used to train neural networks by propagating errors backward through the network and computing gradients to update weights iteratively.

---

## Core Ideas

Write 3–5 paragraphs covering the main ideas in logical order. Each paragraph must start with a bold topic sentence on its own line, followed by the paragraph body on the next line. Do not merge the topic sentence into the paragraph body.

Example:
**Neural networks learn hierarchical representations from raw data.**  
Deep learning stacks many hidden layers to progressively extract higher-level features from input, eliminating the need for manual feature engineering. Each layer transforms the data into increasingly abstract representations.

---

**Key Takeaways:**

Use a bullet list of 3–5 exam-critical points. Each bullet must be a complete, standalone statement that a student can memorize.

Example:
- Neural networks consist of layers of interconnected neurons with weighted connections
- Backpropagation computes gradients to update weights during training
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
    "summary": SUMMARY_PROMPT,
    "flashcard": FLASHCARD_PROMPT,
    "faq": FAQ_PROMPT,
    "mock_quiz": MOCK_QUIZ_PROMPT,
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
        "question_type": "mcq",  # "mcq" | "short_answer" | "long_answer"
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
            f"Unknown task '{task}'. Valid tasks: {list(PROMPT_REGISTRY.keys())}"
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
