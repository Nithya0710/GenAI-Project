from typing import List


def chunk_text(text_list: List[str], max_words: int = 300) -> List[str]:
    chunks = []
    current = []

    for text in text_list:
        words = text.split()
        if len(current) + len(words) <= max_words:
            current.extend(words)
        else:
            chunks.append(" ".join(current))
            current = words

    if current:
        chunks.append(" ".join(current))

    return chunks