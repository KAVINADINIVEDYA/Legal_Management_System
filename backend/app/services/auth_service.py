"""
Authentication service: password hashing, JWT token creation, user management.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=settings.JWT_EXPIRY_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decode a JWT access token. Returns None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate a user by username and password."""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def get_all_users(db: Session):
    """Get all users."""
    return db.query(User).all()

def create_user(db: Session, username: str, password: str, full_name: str,
                email: str, role: str = "legal_officer", department: str = "Legal") -> User:
    """Create a new user."""
    user = User(
        username=username,
        password_hash=hash_password(password),
        full_name=full_name,
        email=email,
        role=role,
        department=department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, new_password: str) -> User:
    """Update a user's password."""
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user

def seed_default_users(db: Session):
    """Create default demo users if none exist."""
    if db.query(User).count() > 0:
        return

    demo_users = [
        {"username": "admin", "password": "admin123", "full_name": "System Administrator",
         "email": "admin@mobitel.lk", "role": "admin"},
        {"username": "supervisor", "password": "super123", "full_name": "Senior Legal Counsel",
         "email": "supervisor@mobitel.lk", "role": "supervisor"},
        {"username": "officer1", "password": "officer123", "full_name": "Kamal Perera",
         "email": "kamal@mobitel.lk", "role": "legal_officer"},
        {"username": "officer2", "password": "officer123", "full_name": "Nimal Fernando",
         "email": "nimal@mobitel.lk", "role": "legal_officer"},
        {"username": "reviewer1", "password": "review123", "full_name": "Sunethra Silva",
         "email": "sunethra@mobitel.lk", "role": "reviewer"},
        {"username": "manager", "password": "manager123", "full_name": "Agreement Manager",
         "email": "manager@mobitel.lk", "role": "manager", "department": "Management"},
    ]

    for u in demo_users:
        create_user(db, **u)
    print("✅ Default demo users created")
