from fastapi import HTTPException
import os

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx"}
MAX_FILE_SIZE_MB = 20
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

def validate_file(filename: str, file_size: int) -> None:
    """Raise HTTPException if file type or size is invalid."""
    ext = os.path.splitext(filename)[-1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, PPTX"
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB"
        )

def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[-1].lower()