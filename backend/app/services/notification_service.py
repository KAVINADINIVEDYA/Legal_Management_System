from sqlalchemy.orm import Session
from app.models.notification import Notification
from typing import List

def create_notification(db: Session, user_id: int, type: str, message: str, entity_type: str = None, entity_id: int = None):
    notification = Notification(
        user_id=user_id,
        type=type,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def get_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[Notification]:
    return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

def mark_read(db: Session, notification_id: int, user_id: int):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if notification:
        notification.is_read = True
        db.commit()
        return True
    return False

def mark_all_read(db: Session, user_id: int):
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return True

def get_unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()
