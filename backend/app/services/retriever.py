"""
retriever.py — Document ingestion pipeline + retrieval interface.

IMPORTANT ordering fix:
    Chunking must happen on the RAW parsed text (before clean_text).
    clean_text collapses all newlines to spaces, which merges [Page N]
    markers into the text body. When that happens, _sliding_window_chunks
    sees a single line starting with "[Page 1]", treats the entire document
    as a page-marker line, and drops all words → zero chunks.

    Correct order: parse → chunk (reads markers) → clean each chunk → embed.
"""

from __future__ import annotations

import logging
import os

from app.services.parser import parse_document
from app.services.vector_store import SearchResult, VectorStore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tunable chunk parameters
# ---------------------------------------------------------------------------

CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE",      "350"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP",   "50"))
DEFAULT_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "5"))


# ---------------------------------------------------------------------------
# Sliding-window chunker  (operates on RAW text — before clean_text)
# ---------------------------------------------------------------------------

def _sliding_window_chunks(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int    = CHUNK_OVERLAP,
    source: str     = "",
) -> tuple[list[str], list[dict]]:
    """
    Split raw parsed text into overlapping word-window chunks.

    Must receive the text BEFORE clean_text() is applied so that
    [Page N] / [Slide N] markers appear on their own lines and can
    be detected to populate chunk metadata.

    Each chunk is individually cleaned (whitespace normalised) after
    the words are extracted.

    Args:
        text:       Raw document text from the parser (with [Page N] markers).
        chunk_size: Target chunk size in words.
        overlap:    Words shared between adjacent chunks.
        source:     Original filename — stored in chunk metadata.

    Returns:
        (chunks, metadata_list)
    """
    if chunk_size <= overlap:
        raise ValueError("chunk_size must be greater than overlap")

    step = chunk_size - overlap
    current_page = 0
    words_with_page: list[tuple[str, int]] = []

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # Page/slide markers are on their own lines in parser output
        if stripped.startswith("[Page ") or stripped.startswith("[Slide "):
            try:
                current_page = int(stripped.split()[-1].rstrip("]"))
            except (ValueError, IndexError):
                pass
            continue
        for word in stripped.split():
            words_with_page.append((word, current_page))

    if not words_with_page:
        return [], []

    words = [w for w, _ in words_with_page]
    pages = [p for _, p in words_with_page]

    chunks:   list[str]  = []
    metadata: list[dict] = []

    i = 0
    while i < len(words):
        end       = min(i + chunk_size, len(words))
        raw_chunk = " ".join(words[i:end])
        page      = pages[i]

        # Normalise whitespace per chunk (replaces clean_text for chunks)
        cleaned_chunk = " ".join(raw_chunk.split())

        if len(cleaned_chunk.split()) >= 5:
            chunks.append(cleaned_chunk)
            metadata.append({"source": source, "page": page})

        if end == len(words):
            break
        i += step

    return chunks, metadata


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ingest_document(
    doc_id: str,
    filename: str,
    file_bytes: bytes,
    force_reindex: bool = False,
) -> int:
    """
    Parse, chunk, embed, and persist a document.

    Returns the number of chunks indexed.
    Idempotent — skips re-embedding if the index already exists
    (unless force_reindex=True).
    """
    if not force_reindex and VectorStore.exists(doc_id):
        logger.info("Index already exists for doc_id=%s, skipping ingest", doc_id)
        return VectorStore.load(doc_id).size

    logger.info("Ingesting: %s (doc_id=%s)", filename, doc_id)

    # 1. Parse — keeps [Page N] / [Slide N] markers on separate lines
    raw_text = parse_document(filename, file_bytes)
    if not raw_text.strip():
        raise ValueError("No text extracted from document — cannot index.")

    # 2. Chunk the RAW text so page markers are still on their own lines
    chunks, meta = _sliding_window_chunks(
        raw_text,
        chunk_size=CHUNK_SIZE,
        overlap=CHUNK_OVERLAP,
        source=filename,
    )

    if not chunks:
        raise ValueError(
            f"Document produced zero indexable chunks "
            f"(raw_text={len(raw_text)} chars, {len(raw_text.split())} words)."
        )

    logger.info(
        "Created %d chunks (size=%d words, overlap=%d) for %s",
        len(chunks), CHUNK_SIZE, CHUNK_OVERLAP, filename,
    )

    # 3. Embed + index
    vs = VectorStore(doc_id)
    vs.add_documents(chunks, meta)

    # 4. Persist to disk
    vs.save()

    return len(chunks)


def retrieve(
    doc_id: str,
    query: str,
    k: int = DEFAULT_TOP_K,
) -> list[SearchResult]:
    """
    Retrieve the top-k most relevant chunks for a query.

    Raises:
        FileNotFoundError: If no index exists for this doc_id.
    """
    vs      = VectorStore.load(doc_id)
    results = vs.search(query, k=k)
    logger.debug("Retrieved %d chunks for query=%r", len(results), query[:60])
    return results


def retrieve_context_string(
    doc_id: str,
    query: str,
    k: int = DEFAULT_TOP_K,
    max_chars: int = 6000,
) -> str:
    """
    Retrieve top-k chunks as a single formatted string for LLM injection.
    Truncated at max_chars.
    """
    results = retrieve(doc_id, query, k=k)

    parts = []
    total = 0
    for r in results:
        label = f"[{r.source} p.{r.page}]" if r.page >= 0 else f"[{r.source}]"
        chunk = f"{label}\n{r.text}\n"
        if total + len(chunk) > max_chars:
            remaining = max_chars - total
            if remaining > 100:
                parts.append(chunk[:remaining])
            break
        parts.append(chunk)
        total += len(chunk)

    return "\n".join(parts)