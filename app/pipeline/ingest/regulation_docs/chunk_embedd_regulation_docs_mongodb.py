import os
import re
from datetime import datetime, timezone
from io import BytesIO

import voyageai
from pypdf import PdfReader
from dotenv import load_dotenv
import gridfs

from core.database import get_mongo_connection

load_dotenv()

# Matches both real ARTICLE/APPENDIX headers *and* their table-of-contents entries
# (and stray running-header artifacts on continuation pages) - all three share the
# same "\nARTICLE X#:" shape in pypdf's extracted text, so this alone can't tell them
# apart. Disambiguation happens in find_section_headers() below.
HEADER_PATTERN = re.compile(r"\n(ARTICLE|APPENDIX)\s+([A-F]\d+):")

VOYAGE_MODEL = "voyage-context-3"
# voyage-context-3's context window is 32K tokens per contextualized-embed request;
# leave headroom below that per batch.
MAX_TOKENS_PER_BATCH = 28_000


def extract_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def find_section_headers(text: str) -> list[re.Match]:
    """Find the real ARTICLE/APPENDIX body headers in extracted PDF text.

    Every header number appears at least twice: once in the table of contents
    (and sometimes again in a page-break coincidence or a running-header
    artifact on continuation pages), and once at the start of its real body
    content. TOC/artifact occurrences always sit close to the next header
    match; a real body header is always followed by the article's full text
    before the next header appears. So per (type, number), keep only the
    occurrence with the largest gap to the next header - that's the one
    starting genuine content.
    """
    matches = list(HEADER_PATTERN.finditer(text))
    gaps = [matches[i + 1].start() - matches[i].start() for i in range(len(matches) - 1)]
    gaps.append(len(text) - matches[-1].start() if matches else 0)

    best_by_key: dict[tuple[str, str], tuple[re.Match, int]] = {}
    for match, gap in zip(matches, gaps):
        key = (match.group(1), match.group(2))
        if key not in best_by_key or gap > best_by_key[key][1]:
            best_by_key[key] = (match, gap)

    return sorted((m for m, _ in best_by_key.values()), key=lambda m: m.start())


def chunk_text(text: str) -> list[str]:
    headers = find_section_headers(text)
    if not headers:
        return [text.strip()] if text.strip() else []

    bounds = [0] + [h.start() for h in headers] + [len(text)]
    chunks = [text[bounds[i]:bounds[i + 1]].strip() for i in range(len(bounds) - 1)]
    return [c for c in chunks if c]


def batch_chunks(vo: voyageai.Client, chunks: list[str]) -> list[list[str]]:
    batches: list[list[str]] = []
    current: list[str] = []
    current_tokens = 0

    for chunk in chunks:
        chunk_tokens = vo.count_tokens(texts=[chunk], model=VOYAGE_MODEL)
        if current and current_tokens + chunk_tokens > MAX_TOKENS_PER_BATCH:
            batches.append(current)
            current = []
            current_tokens = 0
        current.append(chunk)
        current_tokens += chunk_tokens

    if current:
        batches.append(current)

    return batches


def chunk_and_embed():
    mongodb_client = get_mongo_connection()
    db = mongodb_client[os.environ["MONGODB_DATABASE_NAME"]]
    bucket_name = os.environ["MONGODB_BUCKET_NAME"]
    bucket = gridfs.GridFSBucket(db, bucket_name=bucket_name)
    embeddings_col = db["regulation_embeddings"]

    vo = voyageai.Client()

    for file_doc in db[f"{bucket_name}.files"].find():
        file_id = file_doc["_id"]
        metadata = file_doc.get("metadata", {})

        if embeddings_col.find_one({"metadata.document_id": file_id}):
            continue

        filename = file_doc["filename"]
        pdf_bytes = bucket.open_download_stream(file_id).read()
        text = extract_text(pdf_bytes)
        chunks = chunk_text(text)
        if not chunks:
            continue

        docs = []
        for batch in batch_chunks(vo, chunks):
            result = vo.contextualized_embed(
                inputs=[batch],
                model=VOYAGE_MODEL,
                input_type="document",
                output_dimension=1024,
            )
            batch_embeddings = result.results[0].embeddings

            for chunk_text_, embedding in zip(batch, batch_embeddings):
                header_match = re.match(r"\n?(ARTICLE|APPENDIX)\s+([A-F]\d+):", chunk_text_)
                docs.append({
                    "text": chunk_text_,
                    "voyage_embedding": embedding,
                    "metadata": {
                        "filename": filename,
                        "season": metadata.get("season"),
                        "regulation_type": metadata.get("regulation_type"),
                        "document_id": file_id,
                        "section_type": header_match.group(1) if header_match else None,
                        "section_number": header_match.group(2) if header_match else None,
                    },
                    "ingested_at": datetime.now(timezone.utc),
                })

        embeddings_col.insert_many(docs)


if __name__ == "__main__":
    chunk_and_embed()
