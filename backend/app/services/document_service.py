"""
Document service: file upload, text extraction, and version management.
"""
import os
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.document import Document


from app.utils.file_processing import extract_text_from_file, save_uploaded_file


def upload_document(db: Session, file_content: bytes, original_filename: str,
                    content_type: str, uploaded_by_id: int, doc_type: str = "attachment",
                    case_id: Optional[int] = None, agreement_id: Optional[int] = None) -> Document:
    """Upload and register a document."""
    file_path, unique_name = save_uploaded_file(file_content, original_filename)

    # Extract text
    extracted_text = extract_text_from_file(file_path, content_type)

    # Determine version
    version = 1
    if case_id:
        existing = db.query(Document).filter(
            Document.case_id == case_id,
            Document.original_filename == original_filename
        ).count()
        version = existing + 1
    elif agreement_id:
        existing = db.query(Document).filter(
            Document.agreement_id == agreement_id,
            Document.original_filename == original_filename
        ).count()
        version = existing + 1

    doc = Document(
        filename=unique_name,
        original_filename=original_filename,
        file_path=file_path,
        content_type=content_type,
        file_size=len(file_content),
        version=version,
        doc_type=doc_type,
        case_id=case_id,
        agreement_id=agreement_id,
        uploaded_by=uploaded_by_id,
        extracted_text=extracted_text,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Index for semantic search
    if extracted_text:
        from app.ai.semantic_search import add_document
        metadata = {
            "title": original_filename,
            "entity_type": "case" if case_id else "agreement",
            "doc_id": doc.id,
            "uploaded_at": str(doc.created_at)
        }
        if case_id: metadata["case_id"] = case_id
        if agreement_id: metadata["agreement_id"] = agreement_id
        
        add_document(str(doc.id), extracted_text, metadata)

    return doc


def get_document_by_id(db: Session, doc_id: int) -> Optional[Document]:
    """Get a document by ID."""
    return db.query(Document).filter(Document.id == doc_id).first()


def get_documents_for_case(db: Session, case_id: int):
    """Get all documents for a case."""
    return db.query(Document).filter(Document.case_id == case_id, Document.is_active == True).all()


def get_documents_for_agreement(db: Session, agreement_id: int):
    """Get all documents for an agreement."""
    return db.query(Document).filter(Document.agreement_id == agreement_id, Document.is_active == True).all()
