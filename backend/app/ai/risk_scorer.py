"""
Explainable Risk Scoring Engine.
Generates a risk score (0-100) with categorized red flags and required actions.
"""
from app.ai.llm_client import call_llm, parse_json_response


async def calculate_risk_score(text: str, document_type: str = "agreement") -> dict:
    """
    Calculate an explainable risk score for a document.
    Returns score 0-100 with categorized breakdown.

    Risk categories:
    - Legal Risk (25%): unclear clauses, missing governing law, or weak case merits/evidence
    - Financial Risk (25%): high value, no liability cap, or potential for high damages
    - Operational Risk (20%): poor SLA, vague deliverables, or procedural delays/filing issues
    - Compliance Risk (15%): data protection gaps, or violation of statutory regulations
    - Security Risk (15%): data handling, IP protection, or confidentiality breaches
    """
    system_prompt = """You are a legal risk assessment expert at Mobitel. Analyze the document
    and provide an explainable risk score. Be thorough and specific. Output ONLY valid JSON."""

    prompt = f"""Analyze this {document_type} for risk and generate a detailed risk assessment:

DOCUMENT:
{text[:8000]}

Score each risk category from 0-100, then calculate the weighted overall score.
Weights: Legal=25%, Financial=25%, Operational=20%, Compliance=15%, Security=15%

Return JSON:
{{
    "overall_score": 0,
    "risk_level": "low/medium/high/critical",
    "categories": {{
        "legal": {{
            "score": 0,
            "weight": 25,
            "flags": [
                {{"issue": "description", "severity": "low/medium/high", "clause_ref": "if any"}}
            ]
        }},
        "financial": {{
            "score": 0,
            "weight": 25,
            "flags": []
        }},
        "operational": {{
            "score": 0,
            "weight": 20,
            "flags": []
        }},
        "compliance": {{
            "score": 0,
            "weight": 15,
            "flags": []
        }},
        "security": {{
            "score": 0,
            "weight": 15,
            "flags": []
        }}
    }},
    "red_flags": [
        {{"flag": "description", "category": "legal/financial/operational/compliance/security", "severity": "high"}}
    ],
    "required_actions": [
        {{"action": "description", "priority": "immediate/high/medium/low", "category": "category"}}
    ],
    "explanation": "Overall risk explanation in 2-3 sentences"
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)
