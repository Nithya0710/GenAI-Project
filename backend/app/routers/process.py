from fastapi import APIRouter, UploadFile, File
from app.services.parser import parse_document_chunks
from app.services.cleaner import clean_text
from app.services.chunker import chunk_text

router = APIRouter()


@router.post("/process")
async def process_file(file: UploadFile = File(...)):
    file_bytes = await file.read()

    # THIS IS WHERE YOU USE IT
    raw_chunks = parse_document_chunks(file.filename, file_bytes)

    cleaned = [clean_text(chunk) for chunk in raw_chunks]
    final_chunks = chunk_text(cleaned)

    return {
        "filename": file.filename,
        "num_chunks": len(final_chunks),
        "chunks": final_chunks
    }