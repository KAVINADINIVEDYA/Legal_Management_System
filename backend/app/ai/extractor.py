"""
Structured Data Extraction Pipeline.
Auto-extracts case fields and summary of facts from legal documents.
"""
from app.ai.llm_client import call_llm, parse_json_response


# Valid case types for the system
CASE_TYPES = [
    "money_recovery",
    "damages_recovery",
    "appeals",
    "land_cases",
    "criminal_cases",
    "other",
]

CASE_TYPE_LABELS = {
    "money_recovery": "Money Recovery Cases",
    "damages_recovery": "Damages Recovery Cases",
    "appeals": "Appeals",
    "land_cases": "Land Cases",
    "criminal_cases": "Criminal Cases",
    "other": "Other Court / Legal Matters",
}


async def extract_case_data(text: str) -> dict:
    """
    Extract structured data from a case document.
    Returns: title, case_type, parties, nature_of_case, filed_date,
             court_authority, financial_exposure, currency, summary_of_facts.
    """
    system_prompt = """You are a legal data extraction specialist for Sri Lankan legal documents. 
    Extract structured data from legal case documents. Be precise and factual. Output ONLY valid JSON."""

    prompt = f"""Extract structured data from this legal case document:

DOCUMENT:
{text[:8000]}

IMPORTANT: For case_type, you MUST pick one of these exact values:
- "money_recovery" (for debt collection, payment disputes, loan recovery)
- "damages_recovery" (for compensation claims, personal injury, property damage)
- "appeals" (for appellate cases, review of lower court decisions)
- "land_cases" (for property disputes, land ownership, boundary issues)
- "criminal_cases" (for criminal prosecutions, fraud charges, theft etc.)
- "other" (for anything that doesn't fit the above categories)

Return JSON:
{{
    "title": "a concise case title describing what this case is about",
    "case_type": "one of the exact values above",
    "parties": "names of all parties involved, e.g. 'Plaintiff A vs Defendant B'",
    "nature_of_case": "brief nature/type of the legal dispute",
    "filed_date": "YYYY-MM-DD or null if not found",
    "court_authority": "name of court or regulatory authority",
    "financial_exposure": {{
        "amount": 0,
        "currency": "LKR"
    }},
    "summary_of_facts": "A detailed 3-5 sentence summary of the key facts of this case, written in professional legal language. Include the main dispute, parties' claims, and key events.",
    "case_details": {{
        "detail_1": "value",
        "detail_2": "value"
    }}
}}

EXTRACTION RULES FOR case_details:
- If Money Recovery: Extract "claim_amount", "interest_rate".
- If Damages Recovery: Extract "damage_valuation", "compensation_claimed".
- If Appeals: Extract "original_case_reference", "appeal_deadline".
- If Land Case: Extract "land_reference_number", "survey_plan_no", "deed_no", "land_extent".
- If Criminal Case: Extract "charges" (list), "statutes_violated".
- If Inquiries: Extract "panel_members", "inquiry_date".
- If Other: Extract any significant "unique_attributes".
"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)


async def extract_agreement_data(text: str) -> dict:
    """
    Extract structured data from an agreement document.
    Returns: parties, duration, value, dates, governing law, etc.
    """
    system_prompt = """You are a contract data extraction specialist. Extract structured data from 
    agreement documents. Be precise and factual. Output ONLY valid JSON."""

    prompt = f"""Extract structured data from this agreement:

AGREEMENT:
{text[:8000]}

Return JSON:
{{
    "parties": [
        "list of party names, e.g. 'Company A', 'Vendor B'"
    ],
    "agreement_type": "NDA/SLA/vendor/lease/employment/partnership/other",
    "title": "agreement title",
    "effective_date": "YYYY-MM-DD or null",
    "expiry_date": "YYYY-MM-DD or null",
    "duration_months": 12,
    "value": 0.0,
    "currency": "LKR", 
    "description": "A brief summary of the agreement scope and purpose."
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)
