"""
Smart Negotiation Assistant.
Suggests fallback clauses, counter-proposals, and negotiation playbooks.
"""
from app.ai.llm_client import call_llm, parse_json_response


async def get_negotiation_suggestions(clause_text: str, clause_type: str,
                                       agreement_type: str = "general") -> dict:
    """
    Suggest negotiation strategies for a specific clause.
    """
    system_prompt = """You are a senior contract negotiation expert at Mobitel. Provide practical
    negotiation strategies. Output ONLY valid JSON."""

    prompt = f"""Analyze this clause and provide negotiation suggestions:

CLAUSE TYPE: {clause_type}
AGREEMENT TYPE: {agreement_type}
CLAUSE TEXT: {clause_text}

Return JSON:
{{
    "current_assessment": "assessment of the current clause (favors vendor/balanced/favors Mobitel)",
    "risk_in_current": "specific risks in the current wording",
    "fallback_options": [
        {{
            "option": "Alternative clause wording",
            "benefit": "Why this is better for Mobitel",
            "likelihood_accepted": "high/medium/low"
        }}
    ],
    "counter_proposal": "Full counter-proposal text",
    "negotiation_points": ["key points to raise during negotiation"],
    "red_lines": ["non-negotiable items Mobitel should insist on"],
    "concession_areas": ["areas where Mobitel could concede if needed"]
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)


async def generate_playbook(agreement_type: str) -> dict:
    """Generate a negotiation playbook for a specific agreement type."""
    system_prompt = """You are a contract negotiation strategist. Create a practical 
    negotiation playbook. Output ONLY valid JSON."""

    prompt = f"""Generate a negotiation playbook for a {agreement_type} agreement 
    from Mobitel's perspective as a telecommunications company in Sri Lanka.

Return JSON:
{{
    "agreement_type": "{agreement_type}",
    "overview": "Brief overview of key negotiation considerations",
    "priority_clauses": [
        {{"clause": "clause type", "importance": "critical/high/medium", "strategy": "negotiation approach"}}
    ],
    "common_vendor_tactics": ["tactics vendors commonly use"],
    "mobitel_leverage_points": ["areas where Mobitel has leverage"],
    "escalation_triggers": ["when to escalate to senior management"],
    "timeline_recommendation": "recommended negotiation timeline"
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)
