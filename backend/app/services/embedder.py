"""
embedder.py — Sentence-transformer embedding wrapper.

Loads the model once at import time (singleton pattern) so FastAPI
doesn't reload it on every request.

Model: all-MiniLM-L6-v2
  - 384-dim embeddings, ~23MB, fast on CPU
  - Strong semantic similarity for academic/technical text
  - Good fit for 256-512 token chunks

Usage:
    from app.services.embedder import get_embedder

    embedder = get_embedder()
    vectors  = embedder.embed(["chunk one", "chunk two"])   # np.ndarray (N, 384)
    query_v  = embedder.embed_query("what is backpropagation")  # np.ndarray (384,)
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model config — change MODEL_NAME to swap to a different checkpoint
# ---------------------------------------------------------------------------

MODEL_NAME = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
EMBED_DIM  = 384   # dimensionality for all-MiniLM-L6-v2

# Batch size for encoding — keep low on CPU to avoid OOM
ENCODE_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "32"))


class Embedder:
    """
    Thin wrapper around SentenceTransformer.

    Keeps the model in memory as a singleton.
    All public methods return plain numpy arrays so the rest of the
    app has no direct dependency on the sentence-transformers API.
    """

    def __init__(self, model_name: str = MODEL_NAME) -> None:
        logger.info("Loading embedding model: %s", model_name)
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(model_name)
            self._dim   = self._model.get_sentence_embedding_dimension()
            logger.info("Embedding model ready (dim=%d)", self._dim)
        except ImportError as exc:
            raise RuntimeError(
                "sentence-transformers is not installed. "
                "Run: pip install sentence-transformers"
            ) from exc

    @property
    def dim(self) -> int:
        """Embedding dimensionality."""
        return self._dim

    def embed(self, texts: list[str], show_progress: bool = False) -> np.ndarray:
        """
        Embed a list of text strings.

        Args:
            texts:         List of strings to embed.
            show_progress: Show tqdm bar (useful for large batches in scripts).

        Returns:
            np.ndarray of shape (len(texts), dim), dtype float32.
        """
        if not texts:
            return np.empty((0, self._dim), dtype=np.float32)

        vectors = self._model.encode(
            texts,
            batch_size=ENCODE_BATCH_SIZE,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=True,   # unit vectors → dot product == cosine sim
        )
        return vectors.astype(np.float32)

    def embed_query(self, query: str) -> np.ndarray:
        """
        Embed a single query string.

        Returns:
            np.ndarray of shape (dim,), dtype float32.
        """
        return self.embed([query])[0]


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    """
    Return the shared Embedder instance (loaded once, cached forever).

    Call this everywhere instead of constructing Embedder() directly.
    """
    return Embedder(MODEL_NAME)


# ---------------------------------------------------------------------------
# Smoke test  (python -m app.services.embedder)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    emb = get_embedder()

    sentences = [
        "The mitochondria is the powerhouse of the cell.",
        "Gradient descent minimizes the loss function iteratively.",
        "What is the powerhouse of the cell?",
    ]

    vecs = emb.embed(sentences, show_progress=True)
    print(f"\nShape : {vecs.shape}")

    # Cosine similarity between sentence 0 and sentence 2 should be high
    sim = float(np.dot(vecs[0], vecs[2]))
    print(f"Sim(s0, s2) = {sim:.4f}  (expected > 0.7 for paraphrase pair)")
    assert sim > 0.5, "Similarity too low — model may not have loaded correctly"
    print("Smoke test passed.")