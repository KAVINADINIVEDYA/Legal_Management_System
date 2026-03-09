"""
Mobitel Integrated Legal Management System - FastAPI Backend
Main FastAPI application entry point.
"""
# Trigger reload
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import init_db, SessionLocal
from app.middleware.audit import AuditMiddleware
from app.routers import auth, cases, agreements, documents, ai, search, dashboard, workflow, notifications, admin
from app.services.auth_service import seed_default_users

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Legal Case Handling & Agreement Approval Management System for Mobitel",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit middleware
app.add_middleware(AuditMiddleware)

# Register routers
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(agreements.router)
app.include_router(documents.router)
app.include_router(ai.router)
app.include_router(search.router)
app.include_router(dashboard.router)
app.include_router(workflow.router)
app.include_router(notifications.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    """Initialize database and seed default data on startup."""
    # Create uploads directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

    # Initialize database tables
    init_db()

    # Seed default demo users
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

    print(f"🚀 {settings.APP_NAME} started successfully!")
    print(f"📄 API Docs: http://localhost:8000/docs")
    print(f"🔑 Default admin login: admin / admin123")


@app.get("/")
def root():
    """Health check and API info."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "Legal Case Handling",
            "Agreement Approval Management",
            "AI Document Summarization",
            "Structured Data Extraction",
            "Clause-Level Intelligence",
            "Explainable Risk Scoring",
            "Semantic Search (ChromaDB)",
            "Ask Legal Chatbot (RAG)",
            "PII Detection & Masking",
            "Smart Negotiation Assistant",
            "Auto Template Generator",
            "Case Timeline Intelligence",
            "Document Completeness Validator",
            "RBAC Access Control",
            "Audit Trail",
        ]
    }


@app.get("/health")
def health():
    """Health check."""
    return {"status": "healthy"}
