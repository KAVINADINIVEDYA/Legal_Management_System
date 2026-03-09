"""
Workflow service: status tracking and workflow action logging.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.workflow import WorkflowAction


def log_workflow_action(db: Session, entity_type: str, entity_id: int,
                        action: str, performed_by: int,
                        from_status: str = None, to_status: str = None,
                        comments: str = None) -> WorkflowAction:
    """Log a workflow action (status change, approval, etc.)."""
    wa = WorkflowAction(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        performed_by=performed_by,
        comments=comments,
    )
    db.add(wa)
    db.commit()
    db.refresh(wa)
    return wa


def get_workflow_history(db: Session, entity_type: str, entity_id: int):
    """Get full workflow history for an entity."""
    return db.query(WorkflowAction).filter(
        WorkflowAction.entity_type == entity_type,
        WorkflowAction.entity_id == entity_id
    ).order_by(WorkflowAction.created_at.asc()).all()
