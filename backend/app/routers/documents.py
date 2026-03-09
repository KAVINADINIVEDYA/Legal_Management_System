"""
Document endpoints: upload, download, version history.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.schemas.document import DocumentResponse, DocumentUploadResponse
from app.services.document_service import (
    upload_document, get_document_by_id, get_documents_for_case, get_documents_for_agreement
)
from app.services.audit_service import log_action
from app.middleware.rbac import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_doc(
    file: UploadFile = File(...),
    doc_type: str = Form(default="attachment"),
    case_id: Optional[int] = Form(default=None),
    agreement_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document (PDF, DOCX, TXT)."""
    content = await file.read()
    doc = upload_document(
        db, content, file.filename, file.content_type,
        current_user.id, doc_type, case_id, agreement_id
    )
    log_action(db, current_user.id, "upload", "document", doc.id, f"Uploaded: {file.filename}")

    preview = doc.extracted_text[:500] if doc.extracted_text else None
    return DocumentUploadResponse(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        extracted_text_preview=preview,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_doc_info(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document metadata."""
    doc = get_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.get("/{doc_id}/download")
def download_doc(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a document file."""
    doc = get_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    log_action(db, current_user.id, "download", "document", doc.id)
    return FileResponse(
        path=doc.file_path,
        filename=doc.original_filename,
        media_type=doc.content_type or "application/octet-stream"
    )


@router.get("/{doc_id}/text")
def get_doc_text(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get extracted text from a document."""
    doc = get_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"document_id": doc.id, "filename": doc.original_filename, "text": doc.extracted_text or ""}
