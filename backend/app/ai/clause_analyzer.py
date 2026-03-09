"""
Clause-Level Intelligence Pipeline.
Extracts, categorizes, and compares clauses across documents.
"""
from app.ai.llm_client import call_llm, parse_json_response


async def extract_clauses(text: str) -> dict:
    """
    Extract clauses from a document and categorize them.
    Categories: Termination, Payment, Confidentiality, Liability, Governing Law,
                IP, SLA, Indemnity, Force Majeure, Data Protection, Dispute Resolution
    """
    system_prompt = """You are a contract clause analysis expert. Extract and categorize all
    clauses from the document. Output ONLY valid JSON."""

    prompt = f"""Extract all clauses from this agreement and categorize them:

AGREEMENT TEXT:
{text[:8000]}

Return JSON:
{{
    "clauses": [
        {{
            "category": "one of: Termination, Payment, Confidentiality, Liability, Governing Law, IP, SLA, Indemnity, Force Majeure, Data Protection, Dispute Resolution, Other",
            "clause_number": "clause reference if available",
            "title": "clause title",
            "text": "full clause text",
            "risk_assessment": "low/medium/high",
            "notes": "any concerns or observations"
        }}
    ],
    "total_clauses": 0,
    "missing_standard_clauses": ["list of standard clause types not found"],
    "overall_assessment": "brief assessment of clause coverage"
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)


async def compare_documents(text1: str, text2: str, label1: str = "Document A", label2: str = "Document B") -> dict:
    """
    Compare two documents clause by clause.
    Use cases: vendor draft vs Mobitel template, or version 1 vs version 2.
    """
    system_prompt = """You are a contract comparison expert. Compare two documents and identify
    all differences with their risk implications. Output ONLY valid JSON."""

    prompt = f"""Compare these two documents clause by clause:

=== {label1} ===
{text1[:4000]}

=== {label2} ===
{text2[:4000]}

Return JSON:
{{
    "comparison_summary": "overall summary of differences",
    "changes": [
        {{
            "clause_category": "category of the clause",
            "in_doc1": "text or 'Missing'",
            "in_doc2": "text or 'Missing'",
            "change_type": "added/removed/modified/unchanged",
            "risk_impact": "positive/negative/neutral",
            "risk_level": "low/medium/high",
            "explanation": "what this change means from a legal/business perspective"
        }}
    ],
    "added_clauses": ["clauses in doc2 not in doc1"],
    "removed_clauses": ["clauses in doc1 not in doc2"],
    "risk_summary": {{
        "overall_risk_change": "increased/decreased/unchanged",
        "key_concerns": ["list of top concerns"],
        "recommendations": ["recommended actions"]
    }}
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)
