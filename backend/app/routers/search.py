"""
Semantic Search endpoint. (Triggering Reload)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.ai.semantic_search import search as vector_search
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("")
async def semantic_search(
    q: str = Query(..., description="Search query"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type: case, agreement"),
    n_results: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search across all cases and agreements with SQL fallback and AI template detection.
    """
    from app.ai.chatbot import chat_with_context, _get_system_overview
    log_action(db, current_user.id, "search", details=q[:200])

    filter_metadata = None
    if entity_type:
        filter_metadata = {"entity_type": entity_type}

    # 1. Vector Search (Primary)
    results = vector_search(q, n_results=n_results, filter_metadata=filter_metadata)
    
    # 2. SQL Fallback / Augmentation (If results are few or ChromaDB is down)
    sql_overview, targeted_agrs, targeted_cases = _get_system_overview(db, q)
    
    if len(results) < 3:
        for a in targeted_agrs:
            if not any(r.get('metadata', {}).get('agreement_id') == a.id for r in results):
                results.append({
                    "text": a.description or f"Agreement: {a.title}",
                    "metadata": {"title": a.title, "entity_type": "agreement", "agreement_id": a.id},
                    "relevance": 0.95
                })
        for c in targeted_cases:
            if not any(r.get('metadata', {}).get('case_id') == c.id for r in results):
                results.append({
                    "text": c.description or f"Legal Case: {c.title}",
                    "metadata": {"title": c.title, "entity_type": "case", "case_id": c.id},
                    "relevance": 0.95
                })

    # 3. AI Intent Detection (Templates)
    ai_answer = None
    template_keywords = ["template", "draft", "generate", "give me", "skeleton"]
    if any(k in q.lower() for k in template_keywords):
        chat_res = await chat_with_context(q, db)
        ai_answer = chat_res.get("answer")

    return {
        "query": q,
        "total_results": len(results),
        "results": results,
        "ai_answer": ai_answer
    }
