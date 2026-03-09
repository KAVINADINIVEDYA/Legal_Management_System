"""
Document Summarization Pipeline.
Generates structured Case Briefs and Agreement Key Terms summaries.
"""
from app.ai.llm_client import call_llm, parse_json_response


async def summarize_case_document(text: str) -> dict:
    """
    Summarize a case initial document + attachments into a structured Case Brief.
    Returns: {summary, key_facts, parties, dates, legal_issues, recommended_actions}
    """
    system_prompt = """You are a senior legal analyst at Mobitel. Generate a structured Case Brief 
    from the provided legal document. Be thorough but concise. Output ONLY valid JSON."""

    prompt = f"""Analyze this legal document and generate a structured Case Brief as JSON:

DOCUMENT TEXT:
{text[:8000]}

Return JSON with these fields:
{{
    "summary": "2-3 paragraph executive summary of the case",
    "key_facts": ["list of key factual findings"],
    "parties": ["list of all parties mentioned"],
    "dates": {{"filed_date": "", "incident_date": "", "other_dates": []}},
    "legal_issues": ["list of legal issues identified"],
    "financial_exposure": "estimated financial exposure or 'Not specified'",
    "nature_of_case": "classification: civil/criminal/commercial/regulatory/labor/IP",
    "recommended_actions": ["list of recommended next steps for the supervisor"],
    "risk_level": "low/medium/high/critical"
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)


async def summarize_agreement(text: str) -> dict:
    """
    Summarize an agreement into Key Terms, Risks, and Missing Clauses.
    Returns: {summary, key_terms, risks, missing_clauses, recommendations}
    """
    system_prompt = """You are a senior contract analyst at Mobitel. Summarize the agreement document
    focusing on key terms, potential risks, and missing standard clauses. Output ONLY valid JSON."""

    prompt = f"""Analyze this agreement and generate a Key Terms Summary as JSON:

AGREEMENT TEXT:
{text[:8000]}

Return JSON with these fields:
{{
    "summary": "Executive summary of the agreement in 2-3 paragraphs",
    "key_terms": [
        {{"term": "Term name", "value": "Term value/description"}},
    ],
    "obligations": {{
        "mobitel": ["Mobitel's key obligations"],
        "counterparty": ["Counterparty's key obligations"]
    }},
    "financial_terms": {{
        "total_value": "",
        "payment_schedule": "",
        "penalties": ""
    }},
    "risks": [
        {{"risk": "Description", "severity": "low/medium/high", "category": "legal/financial/operational/compliance/security"}}
    ],
    "missing_clauses": ["List of standard clauses that are missing"],
    "recommendations": ["Recommended actions before signing"]
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)


async def generate_quick_summary(text: str) -> str:
    """Generate a quick plain-text summary of any document."""
    system_prompt = "You are a legal document analyst. Provide a concise summary."
    prompt = f"Summarize this document in 3-5 sentences:\n\n{text[:5000]}"
    return await call_llm(prompt, system_prompt)
