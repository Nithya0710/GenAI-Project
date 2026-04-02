"""
backend/app/routers/chat.py — Chat with document endpoint.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm_service import generate_text
from app.services.prompts import SYSTEM_PROMPT

router = APIRouter()


class ChatRequest(BaseModel):
    doc_id: str
    message: str
    history: list[dict] = []   # [{"role": "user"|"assistant", "content": "..."}]


CHAT_PROMPT = """You are an expert tutor helping a student understand a document.

Document context:
<content>
{context}
</content>

Conversation history:
{history}

Student's question: {message}

Answer clearly and helpfully based on the document content. If the answer isn't in the document, say so honestly.
Keep answers concise (2-4 paragraphs max) unless the student asks for a detailed explanation.
"""


@router.post("/chat")
async def chat_with_document(req: ChatRequest):
    # Get document text from DOC_STORE
    from app.routers.generate import DOC_STORE
    text = DOC_STORE.get(req.doc_id)
    if not text:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{req.doc_id}' not found. Please upload it first.",
        )

    # Try RAG context first, fall back to full text (truncated)
    context = None
    try:
        from app.services.retriever import retrieve_context_string
        from app.services.vector_store import VectorStore
        if VectorStore.exists(req.doc_id):
            context = retrieve_context_string(req.doc_id, req.message, k=5)
    except Exception:
        pass

    if not context:
        context = text[:6000]  # fallback: first 6000 chars

    # Format history
    history_str = ""
    for msg in req.history[-6:]:  # last 6 messages for context window
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_str += f"{role.capitalize()}: {content}\n"

    prompt = CHAT_PROMPT.format(
        context=context,
        history=history_str or "No previous messages.",
        message=req.message,
    )

    response = generate_text(prompt)
    return {"response": response, "doc_id": req.doc_id}