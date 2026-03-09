"""
Case Timeline Intelligence.
Auto-generates timeline, detects missed deadlines, generates next actions, flags high exposure.
"""
from app.ai.llm_client import call_llm, parse_json_response


async def generate_timeline(case_text: str, case_data: dict = None) -> dict:
    """
    Generate an intelligent timeline for a legal case.
    """
    system_prompt = """You are a legal case management expert. Analyze case information
    and generate a comprehensive timeline. Output ONLY valid JSON."""

    case_info = ""
    if case_data:
        case_info = f"""
Case Number: {case_data.get('case_number', 'N/A')}
Type: {case_data.get('case_type', 'N/A')}
Status: {case_data.get('status', 'N/A')}
Filed Date: {case_data.get('filed_date', 'N/A')}
Financial Exposure: {case_data.get('financial_exposure', 'N/A')}
"""

    prompt = f"""Analyze this case and generate a comprehensive timeline:

{case_info}
CASE DOCUMENT:
{case_text[:6000]}

Return JSON:
{{
    "timeline_events": [
        {{
            "date": "YYYY-MM-DD or estimated",
            "event": "description of event",
            "type": "filing/hearing/deadline/milestone/action",
            "status": "completed/upcoming/overdue/estimated",
            "importance": "low/medium/high/critical"
        }}
    ],
    "missed_deadlines": [
        {{"deadline": "description", "original_date": "date", "impact": "description of impact"}}
    ],
    "next_actions": [
        {{"action": "description", "due_date": "estimated date", "priority": "immediate/high/medium/low", "assigned_to": "role"}}
    ],
    "exposure_flags": [
        {{"flag": "description", "severity": "low/medium/high/critical", "financial_impact": "estimated"}}
    ],
    "case_age_days": 0,
    "estimated_resolution": "estimated timeframe for resolution"
}}"""

    result = await call_llm(prompt, system_prompt, json_mode=True)
    return parse_json_response(result)
