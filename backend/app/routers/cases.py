"""
Legal Case endpoints: CRUD, AI extraction, status changes, court events, notes, timeline.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.case import (
    CaseCreate, CaseUpdate, CaseResponse, CaseDetailResponse,
    CourtEventCreate, CourtEventResponse, CaseNoteCreate, CaseNoteResponse
)
from app.services.case_service import (
    create_case, get_cases, get_case_by_id, update_case,
    update_case_status, add_court_event, add_case_note
)
from app.services.audit_service import log_action
from app.services.workflow_service import log_workflow_action, get_workflow_history
from app.services.document_service import get_document_by_id
from app.ai.extractor import extract_case_data
from app.middleware.rbac import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/api/cases", tags=["Legal Cases"])


@router.post("/extract")
async def extract_from_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract case fields from an uploaded document using AI."""
    doc = get_document_by_id(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="No text could be extracted from the document")

    # Call AI to extract structured case data
    extracted = await extract_case_data(doc.extracted_text)

    # Normalize the response to match our form fields
    result = {
        "title": extracted.get("title", ""),
        "case_type": extracted.get("case_type", "other"),
        "parties": extracted.get("parties", ""),
        "nature_of_case": extracted.get("nature_of_case", ""),
        "filed_date": extracted.get("filed_date"),
        "court_authority": extracted.get("court_authority", ""),
        "case_details": extracted.get("case_details", {}),
        "financial_exposure": extracted.get("financial_exposure", {}).get("amount", 0),
        "currency": extracted.get("financial_exposure", {}).get("currency", "LKR"),
        "summary_of_facts": extracted.get("summary_of_facts", "")
    }

    # Parse financial exposure
    fin = extracted.get("financial_exposure", {})
    if isinstance(fin, dict):
        amount = fin.get("amount", 0)
        if isinstance(amount, (int, float)) and amount > 0:
            result["financial_exposure"] = float(amount)
        result["currency"] = fin.get("currency", "LKR")
        if result["currency"] not in ("LKR", "USD"):
            result["currency"] = "LKR"
    elif isinstance(fin, (int, float)):
        result["financial_exposure"] = max(0.0, float(fin))

    # Validate case_type
    from app.schemas.case import VALID_CASE_TYPES
    if result["case_type"] not in VALID_CASE_TYPES:
        result["case_type"] = "other"

    return result


@router.get("", response_model=List[CaseResponse])
def list_cases(
    status_filter: Optional[str] = None,
    case_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List legal cases with RBAC filtering."""
    cases = get_cases(db, current_user, status=status_filter, case_type=case_type, skip=skip, limit=limit)
    return [CaseResponse.model_validate(c) for c in cases]


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_new_case(
    req: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "supervisor"))
):
    """Create a new legal case."""
    case = create_case(db, req.model_dump(), current_user.id)
    log_action(db, current_user.id, "create", "case", case.id, f"Created case: {case.case_number}")
    log_workflow_action(db, "case", case.id, "create", current_user.id, to_status="NEW")
    return CaseResponse.model_validate(case)


@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get case detail with documents, events, and notes."""
    case = get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or access denied")

    log_action(db, current_user.id, "read", "case", case.id)

    # Build response with nested data
    result = CaseResponse.model_validate(case).model_dump()
    result["documents"] = [{"id": d.id, "filename": d.original_filename, "doc_type": d.doc_type,
                            "version": d.version, "created_at": str(d.created_at)} for d in case.documents]
    result["court_events"] = [CourtEventResponse.model_validate(e).model_dump() for e in case.court_events]
    result["case_notes"] = [CaseNoteResponse.model_validate(n).model_dump() for n in case.case_notes]
    result["linked_agreements"] = [{"id": a.id, "title": a.title, "agreement_number": a.agreement_number}
                                    for a in case.linked_agreements]
    return result


@router.put("/{case_id}", response_model=CaseResponse)
def update_existing_case(
    case_id: int,
    req: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "supervisor"))
):
    """Update a legal case."""
    try:
        case = update_case(db, case_id, req.model_dump(exclude_unset=True), current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or access denied")

    log_action(db, current_user.id, "update", "case", case.id)
    return CaseResponse.model_validate(case)


@router.put("/{case_id}/status")
def change_case_status(
    case_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change case status with validation."""
    case = get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = case.status
    try:
        case = update_case_status(db, case_id, new_status, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_action(db, current_user.id, "status_change", "case", case.id, f"{old_status} → {new_status}")
    log_workflow_action(db, "case", case.id, "status_change", current_user.id, old_status, new_status)
    return {"message": f"Status changed to {new_status}", "case": CaseResponse.model_validate(case).model_dump()}


@router.post("/{case_id}/events", response_model=CourtEventResponse)
def create_court_event(
    case_id: int,
    req: CourtEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a court event to a case."""
    case = get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    event = add_court_event(db, case_id, req.model_dump())
    log_action(db, current_user.id, "create", "court_event", event.id)
    return CourtEventResponse.model_validate(event)


@router.post("/{case_id}/notes", response_model=CaseNoteResponse)
def create_case_note(
    case_id: int,
    req: CaseNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a note to a case."""
    case = get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    note = add_case_note(db, case_id, current_user.id, req.content, req.note_type)
    log_action(db, current_user.id, "create", "case_note", note.id)
    return CaseNoteResponse.model_validate(note)


@router.get("/{case_id}/timeline")
def get_case_timeline(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow history / timeline for a case."""
    case = get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    history = get_workflow_history(db, "case", case_id)
    return [{"action": h.action, "from_status": h.from_status, "to_status": h.to_status,
             "performed_by": h.performed_by, "comments": h.comments,
             "created_at": str(h.created_at)} for h in history]
@router.get("/{case_id}/audit")
def get_case_audit_logs(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get audit trail for a specific case."""
    from app.services.audit_service import get_audit_logs
    logs = get_audit_logs(db, entity_type="case", entity_id=case_id)
    return [{"id": l.id, "action": l.action, "details": l.details, 
             "performed_by": l.user.full_name if l.user else "System",
             "created_at": str(l.created_at)} for l in logs]
