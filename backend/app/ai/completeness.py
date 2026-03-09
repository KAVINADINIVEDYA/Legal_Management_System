"""
Document Completeness Validator.
Checks for missing initial documents, signature pages, annexures, and scan quality.
"""
from app.ai.llm_client import call_llm, parse_json_response


async def validate_completeness(text: str, doc_type: str = "agreement", 
                                 attached_docs: list = None) -> dict:
    """
    Validate document completeness.
    Checks: missing initial doc, missing signature pages, low quality scan, missing annexures.
    """
    system_prompt = """You are a legal document quality checker. Analyze the document for
    completeness issues. Output ONLY valid JSON."""

    attached_info = ""
    if attached_docs:
        attached_info = f"\nAttached documents: {', '.join(attached_docs)}"

    prompt = f"""Analyze this {doc_type} document for completeness:

DOCUMENT TEXT:
{text[:6000]}
{attached_info}

Check for:
1. Missing essential sections (for agreements: parties, terms, signatures; for cases: complainant info, allegations, evidence list)
2. Missing signature pages or execution blocks
3. Low quality scan indicators (garbled text, missing characters, OCR artifacts)
4. Missing annexures or referenced attachments
5. Incomplete fields or placeholder text
6. Missing dates or references

Return JSON:
{{
    "is_complete": true or false,
    "completeness_score": 0-100,
    "issues": [
        {{
            "type": "missing_section/missing_signature/low_quality/missing_annexure/incomplete_field",
            "severity": "low/medium/high/critical",
            "description": "description of the issue",
            "recommendation": "how to resolve"
        }}
    ],
    "missing_sections": ["list of missing required sections"],
    "quality_assessment": "good/acceptable/poor",
    "ready_for_review": true or false,
    "summary": "brief assessment summary"
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)
