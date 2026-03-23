from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import parse_document
from app.utils.file_utils import validate_file
import uuid

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accept a PDF, DOCX, or PPTX file.
    Parse its text and return structured content.
    """
    file_bytes = await file.read()

    # Validate
    validate_file(file.filename, len(file_bytes))

    # Parse
    extracted_text = parse_document(file.filename, file_bytes)

    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in the uploaded file."
        )

    # Generate a doc ID for this session
    doc_id = str(uuid.uuid4())

    from app.routers.generate import DOC_STORE
    DOC_STORE[doc_id] = extracted_text

    return {
        "doc_id":      doc_id,
        "filename":    file.filename,
        "char_count":  len(extracted_text),
        "word_count":  len(extracted_text.split()),
        "preview":     extracted_text[:500],   # first 500 chars as preview
        "full_text":   extracted_text          # full text (will go to vector store later)
    }