"""
Ask Legal Chatbot with strict context grounding.
Uses RAG (Retrieval-Augmented Generation) to answer questions with citations.
Prevents hallucination by grounding responses in retrieved context only.
"""
from sqlalchemy.orm import Session
from app.ai.llm_client import call_llm
from app.ai.semantic_search import search as vector_search


def _get_system_overview(db: Session, question: str = "") -> str:
    """Fetch structured overview of the system, including targeted results for keywords."""
    from app.models.legal_case import LegalCase
    from app.models.agreement import Agreement
    from sqlalchemy import or_
    
    case_count = db.query(LegalCase).count()
    agr_count = db.query(Agreement).count()
    
    overview = "### GLOBAL SYSTEM OVERVIEW (SQL DATA)\n"
    overview += f"- Total Legal Cases in MobiLex: {case_count}\n"
    overview += f"- Total Agreements in MobiLex: {agr_count}\n\n"
    
    # Keyword search logic
    keywords = [word for word in question.lower().split() if len(word) > 3]
    targeted_agrs = []
    targeted_cases = []
    
    if keywords:
        filters = []
        for kw in keywords:
            filters.append(Agreement.title.ilike(f"%{kw}%"))
            filters.append(Agreement.parties.ilike(f"%{kw}%"))
        
        targeted_agrs = db.query(Agreement).filter(or_(*filters)).limit(5).all()
        
        case_filters = []
        for kw in keywords:
            case_filters.append(LegalCase.title.ilike(f"%{kw}%"))
            case_filters.append(LegalCase.parties.ilike(f"%{kw}%"))
            
        targeted_cases = db.query(LegalCase).filter(or_(*case_filters)).limit(5).all()

    if targeted_cases:
        overview += "MATCHING CASES FOUND:\n"
        for c in targeted_cases:
            overview += f"- [{c.case_number}] {c.title} (Type: {c.case_type}, Status: {c.status})\n"
            if c.description: overview += f"  Summary: {c.description[:200]}...\n"
    else:
        recent_cases = db.query(LegalCase).order_by(LegalCase.updated_at.desc()).limit(3).all()
        overview += "RECENT CASES:\n"
        for c in recent_cases:
            overview += f"- [{c.case_number}] {c.title} (Type: {c.case_type}, Status: {c.status})\n"
            
    if targeted_agrs:
        overview += "\nMATCHING AGREEMENTS FOUND:\n"
        for a in targeted_agrs:
            overview += f"- [{a.agreement_number}] {a.title} (Type: {a.agreement_type}, Status: {a.status}, Parties: {a.parties})\n"
            if a.description: overview += f"  Summary: {a.description[:200]}...\n"
    else:
        recent_agrs = db.query(Agreement).order_by(Agreement.updated_at.desc()).limit(3).all()
        overview += "\nRECENT AGREEMENTS:\n"
        for a in recent_agrs:
            overview += f"- [{a.agreement_number}] {a.title} (Type: {a.agreement_type}, Status: {a.status}, Parties: {a.parties})\n"
            
    return overview, targeted_agrs, targeted_cases


async def chat_with_context(question: str, db: Session, document_text: str = None,
                             search_context: bool = True) -> dict:
    """
    Answer a legal question with Hybrid RAG (Vector Search + SQL Targeted Search).
    """
    from app.models.document import Document
    context_parts = []

    # 1. Inject SQL Overview and targeted matches
    system_overview, match_agrs, match_cases = _get_system_overview(db, question)
    context_parts.append(system_overview)

    # 2. If we found highly relevant matching entities, try to pull their document text
    # This specifically helps with "Give me a template for X company"
    if match_agrs or match_cases:
        context_parts.append("### MATCHING HISTORICAL DOCUMENT TEXT ###")
        for ent in match_agrs + match_cases:
            attr = "agreement_id" if hasattr(ent, "agreement_type") else "case_id"
            doc = db.query(Document).filter(getattr(Document, attr) == ent.id).first()
            if doc and doc.extracted_text:
                context_parts.append(f"Document for {ent.title}:\n{doc.extracted_text[:3000]}")

    # 3. Use specific document text if provided (e.g., when chatting inside a detail page)
    if document_text:
        context_parts.append(f"### CURRENT DOCUMENT CONTEXT ###\n{document_text[:4000]}")

    # 4. Search vector DB for additional relevant snippets
    search_results = []
    if search_context:
        search_results = vector_search(question, n_results=10)
        if search_results:
            context_parts.append("### RELEVANT DOCUMENT EXCERPTS (VECTOR SEARCH) ###")
            for i, result in enumerate(search_results):
                entity_info = ""
                if "case_id" in result['metadata']:
                    entity_info = f" (Case ID: {result['metadata']['case_id']})"
                elif "agreement_id" in result['metadata']:
                    entity_info = f" (Agreement ID: {result['metadata']['agreement_id']})"
                
                context_parts.append(
                    f"Ref {i+1} [{result['metadata'].get('entity_type', 'Document')}]{entity_info}: "
                    f"{result['metadata'].get('title', 'Untitled')}\n"
                    f"Excerpt: {result['text']}\n"
                )

    context = "\n\n".join(context_parts)

    system_prompt = """You are Mobitel's AI Legal Assistant (MobiLex AI). 
You use Hybrid RAG to analyze both structured Case/Agreement summaries and unstructured document text.

TASK: Help users find information about existing legal records and DRAFT new documents/templates based on historical examples.

CRITICAL RULES:
1. GROUNDING: Only answer based on the provided context (SQL Overview and Vector Excerpts).
2. TEMPLATES: If a user asks for a template for a specific company or case type (e.g. "Microsoft agreement template"), find the relevant historical document in the context and use it to draft a new skeleton/template. Use [PLACEHOLDER] tags for values that should be customized.
3. TRUTH: If the information is not in the context, say "I don't have enough information in the system records to answer that accurately."
4. NO CITATIONS: Do not include explicit citations like "[Citation: ...]" or "Ref 1". Provide direct, elegant answers.
5. BEAUTIFUL FORMATTING: Use professional, easy-to-read Markdown formatting (bullet points, bold text).
6. SCOPE: Focus on Legal Cases (Money Recovery, Land, Criminal, etc.) and Agreements (NDA, SLA, etc.)."""

    prompt = f"""### CONTEXT GROUNDING ###
{context}

### USER QUESTION ###
{question}

Based on the MobiLex system data above, provide a direct, beautiful, and comprehensive answer. 
If a template is requested, draft it using the history found in the context."""

    answer = await call_llm(prompt, system_prompt)

    return {
        "answer": answer,
        "citations": [],
        "context_sources": {
            "sql_overview": True,
            "targeted_matches": len(match_agrs) + len(match_cases),
            "vector_chunks": len(search_results)
        },
        "confidence": "high" if len(context_parts) > 1 else "medium"
    }
