"""
Semantic Search Pipeline using ChromaDB.
Embeds documents and enables natural-language search across cases and agreements.
"""
import os
from typing import List, Optional
from app.config import settings

# Lazy-load ChromaDB to avoid import issues when not needed
_collection = None


def _get_collection():
    """Get or initialize the ChromaDB collection."""
    global _collection
    if _collection is None:
        try:
            import chromadb
            os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
            client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
            _collection = client.get_or_create_collection(
                name="legal_documents",
                metadata={"hnsw:space": "cosine"}
            )
            print(f"SUCCESS: ChromaDB initialized at {settings.CHROMA_PERSIST_DIR}")
        except Exception as e:
            print(f"ERROR: ChromaDB init failed: {e}")
            return None
    return _collection


def add_document(doc_id: str, text: str, metadata: dict):
    """Add or update a document in the vector store."""
    collection = _get_collection()
    if not collection or not text:
        return

    # Cleanup: Delete existing chunks for this specific document
    try:
        collection.delete(where={"parent_doc_id": str(doc_id)})
    except Exception as e:
        # Might fail if ID doesn't exist yet, which is fine
        pass

    # Split into chunks if text is long
    chunks = _chunk_text(text)

    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_chunk_{i}"
        ids.append(chunk_id)
        documents.append(chunk)
        metadatas.append({**metadata, "chunk_index": i, "parent_doc_id": str(doc_id)})

    try:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    except Exception as e:
        print(f"[VectorDB] Error adding document: {e}")


def search(query: str, n_results: int = 10, filter_metadata: dict = None) -> List[dict]:
    """Search the vector store with a natural language query."""
    collection = _get_collection()
    if not collection:
        return []

    try:
        kwargs = {
            "query_texts": [query],
            "n_results": n_results,
        }
        if filter_metadata:
            kwargs["where"] = filter_metadata

        results = collection.query(**kwargs)

        search_results = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                search_results.append({
                    "text": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                    "relevance": round(1 - (results["distances"][0][i] if results["distances"] else 0), 3)
                })

        return search_results
    except Exception as e:
        print(f"[VectorDB] Search error: {e}")
        return []


def _chunk_text(text: str, max_chars: int = 1500, overlap: int = 300) -> List[str]:
    """Split text into overlapping chunks for better context preservation."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        # Try to find a good breaking point (newline or period) near the end
        if end < len(text):
            # Look back 200 chars for a break
            look_back = text.rfind("\n", end - 200, end)
            if look_back == -1:
                look_back = text.rfind(". ", end - 100, end)
            
            if look_back != -1:
                end = look_back + 1

        chunks.append(text[start:end].strip())
        start = end - overlap
        if start < 0: start = 0
        
        # Prevent infinite loop if something goes wrong
        if end >= len(text):
            break
            
    return [c for c in chunks if len(c) > 50]
