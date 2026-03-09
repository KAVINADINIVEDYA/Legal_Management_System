"""Pydantic schemas for Agreements, Versions, and Approval Steps."""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class ApprovalStepResponse(BaseModel):
    id: int
    agreement_id: int
    reviewer_id: int
    step_order: int
    status: str
    comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class AgreementVersionResponse(BaseModel):
    id: int
    agreement_id: int
    version_number: int
    document_id: Optional[int] = None
    change_summary: Optional[str] = None
    created_by: int
    created_at: datetime
    class Config:
        from_attributes = True

class AgreementBase(BaseModel):
    title: str
    agreement_type: Optional[str] = None
    parties: Optional[str] = None
    value: float = 0.0
    currency: str = "LKR"
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    duration_months: Optional[int] = None
    description: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        if v not in ("LKR", "USD"):
            raise ValueError("Currency must be LKR or USD")
        return v
    
    @field_validator("value")
    @classmethod
    def validate_value(cls, v):
        if v < 0:
            raise ValueError("Value cannot be negative")
        return v

class AgreementCreate(AgreementBase):
    document_id: Optional[int] = None
    reviewer_ids: Optional[List[int]] = None

class AgreementUpdate(BaseModel):
    title: Optional[str] = None
    agreement_type: Optional[str] = None
    parties: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    duration_months: Optional[int] = None
    description: Optional[str] = None

class AgreementResponse(AgreementBase):
    id: int
    agreement_number: str
    status: str
    created_by: int
    risk_score: int = 0
    risk_details: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_extracted_data: Optional[str] = None
    ai_clauses: Optional[str] = None
    signature_data: Optional[str] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AgreementDetailResponse(AgreementResponse):
    documents: List[dict] = []
    versions: List[AgreementVersionResponse] = []
    approval_steps: List[ApprovalStepResponse] = []
    linked_cases: List[dict] = []

class ApprovalRequest(BaseModel):
    comments: Optional[str] = None
    signature_data: Optional[str] = None

class SignatureRequest(BaseModel):
    signature_data: str

class SubmitForReviewRequest(BaseModel):
    reviewer_ids: List[int]
    comments: Optional[str] = None
