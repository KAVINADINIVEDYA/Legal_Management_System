"""
Workflow endpoints: for tracking workflow history.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.services.workflow_service import get_workflow_history

router = APIRouter(prefix="/api/workflow", tags=["Workflow"])


@router.get("/{entity_type}/{entity_id}/history")
def get_history(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow history for an entity."""
    history = get_workflow_history(db, entity_type, entity_id)
    return [{"id": h.id, "action": h.action, "from_status": h.from_status,
             "to_status": h.to_status, "performed_by": h.performed_by,
             "comments": h.comments, "created_at": str(h.created_at)} for h in history]
