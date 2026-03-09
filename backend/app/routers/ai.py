"""
AI endpoints: summarization, extraction, clause analysis, risk scoring, chat, templates, etc.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.models.document import Document
from app.services.audit_service import log_action
from app.ai import summarizer, extractor, clause_analyzer, risk_scorer, chatbot
from app.ai import pii_detector, completeness, template_gen, negotiation, timeline

router = APIRouter(prefix="/api/ai", tags=["AI Services"])


# --- Request/Response Models ---
class DocumentTextRequest(BaseModel):
    document_id: Optional[int] = None
    text: Optional[str] = None

class CompareRequest(BaseModel):
    document_id_1: Optional[int] = None
    document_id_2: Optional[int] = None
    text_1: Optional[str] = None
    text_2: Optional[str] = None
    label_1: str = "Document A"
    label_2: str = "Document B"

class ChatRequest(BaseModel):
    question: str
    document_id: Optional[int] = None
    context_text: Optional[str] = None

class TemplateRequest(BaseModel):
    agreement_type: str
    governing_law: str = "Sri Lankan Law"
    vendor: str = ""
    duration_months: int = 12
    value: float = 0
    data_sensitivity: str = "medium"

class NegotiationRequest(BaseModel):
    clause_text: str
    clause_type: str
    agreement_type: str = "general"

class PlaybookRequest(BaseModel):
    agreement_type: str


def _get_doc_text(db: Session, req) -> str:
    """Helper to get document text from request (either by ID or direct text)."""
    if hasattr(req, 'text') and req.text:
        return req.text
    if hasattr(req, 'document_id') and req.document_id:
        doc = db.query(Document).filter(Document.id == req.document_id).first()
        if doc and doc.extracted_text:
            return doc.extracted_text
        raise HTTPException(status_code=404, detail="Document not found or text not extracted")
    raise HTTPException(status_code=400, detail="Provide either document_id or text")


# --- Summarization ---
@router.post("/summarize")
async def summarize_document(
    req: DocumentTextRequest,
    doc_type: str = "agreement",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Summarize a document (case or agreement)."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_summarize", "document", req.document_id)

    if doc_type == "case":
        result = await summarizer.summarize_case_document(text)
    else:
        result = await summarizer.summarize_agreement(text)
    return result


# --- Extraction ---
@router.post("/extract")
async def extract_data(
    req: DocumentTextRequest,
    doc_type: str = "agreement",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract structured data from a document."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_extract", "document", req.document_id)

    if doc_type == "case":
        result = await extractor.extract_case_data(text)
    else:
        result = await extractor.extract_agreement_data(text)
    return result


# --- Clause Analysis ---
@router.post("/clauses")
async def extract_clauses(
    req: DocumentTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract and categorize clauses from a document."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_clauses", "document", req.document_id)
    result = await clause_analyzer.extract_clauses(text)
    return result


# --- Document Comparison ---
@router.post("/compare")
async def compare_docs(
    req: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare two documents clause by clause."""
    text1 = req.text_1
    text2 = req.text_2

    if req.document_id_1:
        doc1 = db.query(Document).filter(Document.id == req.document_id_1).first()
        if doc1:
            text1 = doc1.extracted_text
    if req.document_id_2:
        doc2 = db.query(Document).filter(Document.id == req.document_id_2).first()
        if doc2:
            text2 = doc2.extracted_text

    if not text1 or not text2:
        raise HTTPException(status_code=400, detail="Two documents required for comparison")

    log_action(db, current_user.id, "ai_compare", "document")
    result = await clause_analyzer.compare_documents(text1, text2, req.label_1, req.label_2)
    return result


# --- Risk Scoring ---
@router.post("/risk-score")
async def calculate_risk(
    req: DocumentTextRequest,
    doc_type: str = "agreement",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate explainable risk score for a document."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_risk_score", "document", req.document_id)
    result = await risk_scorer.calculate_risk_score(text, doc_type)
    return result


# --- Chatbot ---
@router.post("/chat")
async def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ask Legal chatbot with strict context grounding."""
    doc_text = None
    if req.document_id:
        doc = db.query(Document).filter(Document.id == req.document_id).first()
        if doc:
            doc_text = doc.extracted_text
    elif req.context_text:
        doc_text = req.context_text

    log_action(db, current_user.id, "ai_chat", details=req.question[:200])
    result = await chatbot.chat_with_context(req.question, db, doc_text)
    return result


# --- Template Generation ---
@router.post("/template")
async def generate_template(
    req: TemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an agreement template based on parameters."""
    log_action(db, current_user.id, "ai_template", details=req.agreement_type)
    result = await template_gen.generate_template(
        req.agreement_type, req.governing_law, req.vendor,
        req.duration_months, req.value, req.data_sensitivity
    )
    return result


@router.post("/template/renewal")
async def generate_renewal(
    req: DocumentTextRequest,
    agreement_type: str = "General",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a renewal template based on existing agreement context."""
    try:
        text = _get_doc_text(db, req)
    except HTTPException as e:
        # Fallback for agreements without documents: use description if available
        if req.text:
            text = req.text
        else:
            raise e

    log_action(db, current_user.id, "ai_template_renewal", "document", req.document_id, details=agreement_type)
    result = await template_gen.generate_renewal_template(text, agreement_type)
    return result


@router.post("/template/case")
async def generate_case_template(
    req: DocumentTextRequest,
    case_type: str = "General",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a legal filing template based on case context."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_template_case", "document", req.document_id)
    result = await template_gen.generate_case_template(text, case_type)
    return result


# --- Negotiation ---
@router.post("/negotiate")
async def negotiate(
    req: NegotiationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get negotiation suggestions for a clause."""
    log_action(db, current_user.id, "ai_negotiate", details=req.clause_type)
    result = await negotiation.get_negotiation_suggestions(
        req.clause_text, req.clause_type, req.agreement_type
    )
    return result


@router.post("/playbook")
async def get_playbook(
    req: PlaybookRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a negotiation playbook for an agreement type."""
    result = await negotiation.generate_playbook(req.agreement_type)
    return result


# --- Document Validation ---
@router.post("/validate")
async def validate_document(
    req: DocumentTextRequest,
    doc_type: str = "agreement",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate document completeness."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_validate", "document", req.document_id)
    result = await completeness.validate_completeness(text, doc_type)
    return result


# --- PII Scan ---
@router.post("/pii-scan")
async def scan_pii(
    req: DocumentTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan document for PII (NIC, passport, bank accounts, etc.)."""
    text = _get_doc_text(db, req)
    masked_text, findings = pii_detector.mask_pii(text)
    return {
        "total_pii_found": len(findings),
        "findings": findings,
        "masked_preview": masked_text[:2000],
        "has_sensitive_data": pii_detector.should_block_external_send(text)
    }


# --- Case Timeline ---
@router.post("/timeline")
async def generate_case_timeline(
    req: DocumentTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered case timeline."""
    text = _get_doc_text(db, req)
    log_action(db, current_user.id, "ai_timeline", "document", req.document_id)
    result = await timeline.generate_timeline(text)
    return result
