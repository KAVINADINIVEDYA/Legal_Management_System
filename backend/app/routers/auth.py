"""
Authentication endpoints: login, current user, user management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse, UserUpdate, PasswordChangeRequest
from app.services.auth_service import authenticate_user, create_access_token, create_user, get_all_users, get_user_by_id, verify_password, update_user_password
from app.services.audit_service import log_action
from app.middleware.rbac import get_current_user, require_admin
from app.models.user import User
from typing import List

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    log_action(db, user.id, "login", "user", user.id)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse.model_validate(current_user)


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """List all users (admin only)."""
    users = get_all_users(db)
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse)
def create_new_user(req: UserCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Create a new user (admin only)."""
    user = create_user(db, req.username, req.password, req.full_name, req.email, req.role, req.department)
    log_action(db, admin.id, "create", "user", user.id, f"Created user: {user.username}")
    return UserResponse.model_validate(user)


@router.post("/change-password")
def change_password(req: PasswordChangeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Change current user's password."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    update_user_password(db, current_user, req.new_password)
    log_action(db, current_user.id, "update_password", "user", current_user.id)
    return {"message": "Password changed successfully"}
