
import os
import sys
# Add parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.document import Document
from app.ai.semantic_search import add_document

def reindex_all_documents():
    """Iterate through all documents in DB and add them to ChromaDB."""
    db = SessionLocal()
    try:
        documents = db.query(Document).filter(Document.extracted_text != None).all()
        print(f"SEARCHING: Found {len(documents)} documents to index...")
        
        for doc in documents:
            print(f"DOC: Indexing: {doc.original_filename} (ID: {doc.id})")
            metadata = {
                "title": doc.original_filename,
                "entity_type": "case" if doc.case_id else "agreement",
                "doc_id": doc.id,
                "uploaded_at": str(doc.created_at)
            }
            if doc.case_id: metadata["case_id"] = doc.case_id
            if doc.agreement_id: metadata["agreement_id"] = doc.agreement_id
            
            add_document(str(doc.id), doc.extracted_text, metadata)
        
        print("SUCCESS: Re-indexing complete!")
    finally:
        db.close()

if __name__ == "__main__":
    reindex_all_documents()
