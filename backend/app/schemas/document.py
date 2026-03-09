"""Pydantic schemas for Documents."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    version: int = 1
    doc_type: Optional[str] = None
    case_id: Optional[int] = None
    agreement_id: Optional[int] = None
    uploaded_by: int
    ai_summary: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    extracted_text_preview: Optional[str] = None
    message: str = "Document uploaded successfully"
