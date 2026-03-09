"""Pydantic schemas for Legal Cases, Court Events, and Case Notes."""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class CourtEventBase(BaseModel):
    event_type: str
    title: str
    event_date: datetime
    location: Optional[str] = None
    notes: Optional[str] = None

class CourtEventCreate(CourtEventBase):
    pass

class CourtEventResponse(CourtEventBase):
    id: int
    case_id: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class CaseNoteCreate(BaseModel):
    content: str
    note_type: str = "general"

class CaseNoteResponse(BaseModel):
    id: int
    case_id: int
    author_id: int
    content: str
    note_type: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Allowed case types ---
VALID_CASE_TYPES = [
    "money_recovery",
    "damages_recovery",
    "appeals",
    "land_cases",
    "criminal_cases",
    "other",
]


class CaseBase(BaseModel):
    title: str
    case_type: str
    parties: Optional[str] = None
    court_authority: Optional[str] = None
    financial_exposure: float = 0.0
    currency: str = "LKR"
    nature_of_case: Optional[str] = None
    description: Optional[str] = None  # AI-generated summary of facts
    claim_amount: float = 0.0
    recovered_amount: float = 0.0
    outstanding_amount: float = 0.0
    filed_date: Optional[datetime] = None
    case_details: Optional[dict] = None  # Specific fields based on case_type

    @field_validator("financial_exposure")
    @classmethod
    def validate_financial_exposure(cls, v):
        if v < 0:
            raise ValueError("Financial exposure cannot be negative")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        if v not in ("LKR", "USD"):
            raise ValueError("Currency must be LKR or USD")
        return v

class CaseCreate(CaseBase):
    document_id: Optional[int] = None  # Optional for manual entry (PDF will be generated)
    assigned_officer_id: Optional[int] = None
    supervisor_id: Optional[int] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    case_type: Optional[str] = None
    status: Optional[str] = None
    parties: Optional[str] = None
    court_authority: Optional[str] = None
    financial_exposure: Optional[float] = None
    currency: Optional[str] = None
    nature_of_case: Optional[str] = None
    description: Optional[str] = None
    claim_amount: Optional[float] = None
    recovered_amount: Optional[float] = None
    outstanding_amount: Optional[float] = None
    case_details: Optional[dict] = None
    assigned_officer_id: Optional[int] = None
    supervisor_id: Optional[int] = None

class CaseResponse(CaseBase):
    id: int
    case_number: str
    reference_number: Optional[str] = None
    status: str
    assigned_officer_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    ai_summary: Optional[str] = None
    ai_classification: Optional[str] = None
    risk_score: int = 0
    claim_amount: float = 0.0
    recovered_amount: float = 0.0
    outstanding_amount: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CaseDetailResponse(CaseResponse):
    documents: List[dict] = []
    court_events: List[CourtEventResponse] = []
    case_notes: List[CaseNoteResponse] = []
    linked_agreements: List[dict] = []
