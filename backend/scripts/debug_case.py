
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.services.case_service import create_case
from app.models.user import User

# Setup DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./legal_management.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Mock data
data = {
    "title": "Test Case",
    "case_type": "criminal_cases",
    "parties": "State vs Test",
    "court_authority": "Magistrate Court",
    "financial_exposure": 6800000.0,
    "currency": "LKR",
    "nature_of_case": "Criminal",
    "description": "Test summary",
    "filed_date": "2026-02-12",
    "document_id": 1
}

# Ensure user exists
user = db.query(User).filter(User.username == "admin").first()
if not user:
    print("Admin user not found")
    sys.exit(1)

try:
    print("Attempting to create case...")
    case = create_case(db, data, user.id)
    print(f"Case created: {case.case_number}")
except Exception as e:
    import traceback
    traceback.print_exc()
