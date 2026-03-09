"""
Agreement endpoints: CRUD, approval workflow, submission, approval/rejection.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.agreement import (
    AgreementCreate, AgreementUpdate, AgreementResponse, AgreementDetailResponse,
    ApprovalRequest, SubmitForReviewRequest, SignatureRequest, ApprovalStepResponse, AgreementVersionResponse
)
from app.services.agreement_service import (
    create_agreement, get_agreements, get_agreement_by_id, update_agreement,
    submit_for_review, approve_agreement, reject_agreement
)
from app.services.audit_service import log_action
from app.services.workflow_service import log_workflow_action
from app.middleware.rbac import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/api/agreements", tags=["Agreements"])


@router.get("", response_model=List[AgreementResponse])
def list_agreements(
    status_filter: Optional[str] = None,
    agreement_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List agreements with RBAC filtering."""
    agreements = get_agreements(db, current_user, status=status_filter,
                                agreement_type=agreement_type, skip=skip, limit=limit)
    return [AgreementResponse.model_validate(a) for a in agreements]


from fastapi import Query
from app.ai.extractor import extract_agreement_data

@router.post("/extract")
async def extract_from_file(
    document_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract structured data from an uploaded agreement document."""
    from app.services.document_service import get_document_by_id
    doc = get_document_by_id(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="No text could be extracted from this document")

    try:
        data = await extract_agreement_data(doc.extracted_text)
        if "error" in data:
            raise HTTPException(status_code=500, detail=f"AI Extraction error: {data.get('error')}")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Extraction process failed: {str(e)}")



@router.post("", response_model=AgreementResponse, status_code=status.HTTP_201_CREATED)
def create_new_agreement(
    req: AgreementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "supervisor"))
):
    """Create a new agreement and optionally submit for review immediately."""
    agreement = create_agreement(db, req.model_dump(exclude={"reviewer_ids"}), current_user.id)
    log_action(db, current_user.id, "create", "agreement", agreement.id,
               f"Created agreement: {agreement.agreement_number}")
    log_workflow_action(db, "agreement", agreement.id, "create", current_user.id, to_status="DRAFT")
    
    # If reviewer_ids provided, submit for review immediately
    if req.reviewer_ids:
        submit_for_review(db, agreement.id, req.reviewer_ids, current_user)
        log_action(db, current_user.id, "submit", "agreement", agreement.id, "Immediate submission on creation")
        log_workflow_action(db, "agreement", agreement.id, "submit_review", current_user.id, to_status="UNDER_REVIEW")
        db.refresh(agreement)
        
    return AgreementResponse.model_validate(agreement)


@router.get("/{agreement_id}", response_model=AgreementDetailResponse)
def get_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agreement detail with documents, versions, and approval steps."""
    agreement = get_agreement_by_id(db, agreement_id, current_user)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found or access denied")

    log_action(db, current_user.id, "read", "agreement", agreement.id)

    result = AgreementResponse.model_validate(agreement).model_dump()
    result["documents"] = [{"id": d.id, "filename": d.original_filename, "doc_type": d.doc_type,
                            "version": d.version, "created_at": str(d.created_at)} for d in agreement.documents]
    result["versions"] = [AgreementVersionResponse.model_validate(v).model_dump() for v in agreement.versions]
    result["approval_steps"] = [ApprovalStepResponse.model_validate(s).model_dump() for s in agreement.approval_steps]
    result["linked_cases"] = [{"id": c.id, "title": c.title, "case_number": c.case_number}
                               for c in agreement.linked_cases]
    return result


@router.put("/{agreement_id}", response_model=AgreementResponse)
def update_existing_agreement(
    agreement_id: int,
    req: AgreementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "supervisor"))
):
    """Update an agreement (DRAFT/REVISION status only)."""
    agreement = update_agreement(db, agreement_id, req.model_dump(exclude_unset=True), current_user)
    if not agreement:
        raise HTTPException(status_code=400, detail="Cannot update or not found")

    log_action(db, current_user.id, "update", "agreement", agreement.id)
    return AgreementResponse.model_validate(agreement)


@router.post("/{agreement_id}/submit")
def submit_agreement_for_review(
    agreement_id: int,
    req: SubmitForReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "supervisor"))
):
    """Submit an agreement for review."""
    agreement = submit_for_review(db, agreement_id, req.reviewer_ids, current_user, req.comments)
    if not agreement:
        raise HTTPException(status_code=400, detail="Cannot submit or not found")

    log_action(db, current_user.id, "submit", "agreement", agreement.id, req.comments)
    log_workflow_action(db, "agreement", agreement.id, "submit_review", current_user.id, to_status="UNDER_REVIEW", comments=req.comments)
    return {"message": "Agreement submitted for review", "status": agreement.status}


@router.post("/{agreement_id}/approve")
def approve_agreement_step(
    agreement_id: int,
    req: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager", "reviewer"))
):
    """Approve an agreement step (Managers only)."""
    agreement = approve_agreement(db, agreement_id, current_user.id, req.comments, user=current_user, signature_data=req.signature_data)
    if not agreement:
        raise HTTPException(status_code=400, detail="No pending approval step found")

    log_action(db, current_user.id, "approve", "agreement", agreement.id, req.comments)
    log_workflow_action(db, "agreement", agreement.id, "approve", current_user.id, to_status=agreement.status, comments=req.comments)
    return {"message": "Approval recorded", "status": agreement.status}


@router.post("/{agreement_id}/reject")
def reject_agreement_step(
    agreement_id: int,
    req: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager", "reviewer"))
):
    """Reject/Return for revision an agreement (Managers and Reviewers)."""
    agreement = reject_agreement(db, agreement_id, current_user.id, req.comments, user=current_user)
    if not agreement:
        raise HTTPException(status_code=400, detail="No pending approval step found")

    log_action(db, current_user.id, "reject", "agreement", agreement.id, req.comments)
    log_workflow_action(db, "agreement", agreement.id, "reject", current_user.id, to_status="REVISION", comments=req.comments)
    return {"message": "Agreement rejected", "status": agreement.status}


@router.post("/{agreement_id}/sign")
def sign_agreement_step(
    agreement_id: int,
    req: SignatureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Sign an agreement (Managers only)."""
    from app.services.agreement_service import sign_agreement
    agreement = sign_agreement(db, agreement_id, req.signature_data)
    if not agreement:
        raise HTTPException(status_code=400, detail="Cannot sign agreement (must be APPROVED)")

    log_action(db, current_user.id, "sign", "agreement", agreement.id)
    log_workflow_action(db, "agreement", agreement.id, "sign", current_user.id, to_status="SIGNED")
    return {"message": "Agreement signed successfully", "status": agreement.status}


@router.get("/{agreement_id}/audit")
def get_agreement_audit_logs(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get audit trail for a specific agreement."""
    from app.services.audit_service import get_audit_logs
    logs = get_audit_logs(db, entity_type="agreement", entity_id=agreement_id)
    return [{"id": l.id, "action": l.action, "details": l.details, 
             "performed_by": l.user.full_name if l.user else "System",
             "created_at": str(l.created_at)} for l in logs]
