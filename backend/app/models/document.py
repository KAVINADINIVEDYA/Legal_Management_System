"""
Document model for file storage and versioning.
Supports both case and agreement document attachments.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(100))
    file_size = Column(Integer)  # bytes
    version = Column(Integer, default=1)
    doc_type = Column(String(50))  # initial_document, attachment, agreement_draft, signed_copy, annexure, evidence
    case_id = Column(Integer, ForeignKey("legal_cases.id"), nullable=True)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    extracted_text = Column(Text)  # Full text extracted from PDF/DOCX
    ai_summary = Column(Text)  # AI-generated summary of this document
    is_active = Column(Boolean, default=True)  # For soft delete / versioning
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("LegalCase", back_populates="documents")
    agreement = relationship("Agreement", back_populates="documents")
    uploader = relationship("User", back_populates="uploaded_documents")
