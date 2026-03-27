"""
documents.py — /upload endpoint.

After parsing, triggers the RAG ingestion pipeline (embed + FAISS index)
as a background task so the HTTP response returns immediately.
"""

import uuid
import logging

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.services.parser import parse_document
from app.utils.file_utils import validate_file

logger = logging.getLogger(__name__)
router = APIRouter()


def _ingest_background(doc_id: str, filename: str, file_bytes: bytes) -> None:
    """Background task: embed chunks and persist FAISS index."""
    try:
        from app.services.retriever import ingest_document
        n = ingest_document(doc_id, filename, file_bytes)
        logger.info("Background ingest complete: %d chunks for doc_id=%s", n, doc_id)
    except Exception as exc:
        logger.error("Background ingest failed for doc_id=%s: %s", doc_id, exc)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Accept a PDF, DOCX, or PPTX file.
    Parse its text, store it in DOC_STORE, and kick off background embedding.
    """
    file_bytes = await file.read()

    validate_file(file.filename, len(file_bytes))

    extracted_text = parse_document(file.filename, file_bytes)

    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in the uploaded file.",
        )

    doc_id = str(uuid.uuid4())

    # Store full text for immediate generation requests
    from app.routers.generate import DOC_STORE
    DOC_STORE[doc_id] = extracted_text

    # Kick off embedding in the background — non-blocking
    background_tasks.add_task(
        _ingest_background, doc_id, file.filename, file_bytes
    )

    return {
        "doc_id":     doc_id,
        "filename":   file.filename,
        "char_count": len(extracted_text),
        "word_count": len(extracted_text.split()),
        "preview":    extracted_text[:500],
        "full_text":  extracted_text,
    }