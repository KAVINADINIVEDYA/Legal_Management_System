"""
Auto Template Generator.
Generates agreement skeletons based on type, governing law, vendor, duration, value, etc.
"""
from app.ai.llm_client import call_llm


async def generate_template(agreement_type: str, governing_law: str = "Sri Lankan Law",
                            vendor: str = "", duration_months: int = 12,
                            value: float = 0, data_sensitivity: str = "medium") -> dict:
    """
    Generate an agreement template/skeleton based on parameters.
    """
    system_prompt = """You are a senior legal drafting specialist at Mobitel. Generate professional 
    agreement templates that comply with the specified governing law."""

    prompt = f"""Generate a complete agreement template with the following parameters:

Agreement Type: {agreement_type}
Governing Law: {governing_law}
Vendor/Counterparty: {vendor or 'TBD'}
Duration: {duration_months} months
Value: {value}
Data Sensitivity: {data_sensitivity}

Generate a complete, professional agreement template that includes all standard legal clauses.
Use [PLACEHOLDER] for values that need to be filled in.
Make it specific to Mobitel as a telecommunications company in Sri Lanka."""

    template_text = await call_llm(prompt, system_prompt, temperature=0.4, max_tokens=6000)

    return {
        "template": template_text,
        "agreement_type": agreement_type,
        "governing_law": governing_law,
        "parameters": {
            "vendor": vendor,
            "duration_months": duration_months,
            "value": value,
            "data_sensitivity": data_sensitivity,
        }
    }


async def generate_renewal_template(existing_text: str, agreement_type: str = "General") -> dict:
    """
    Generate a renewal agreement template based on an existing agreement.
    """
    system_prompt = """You are a senior legal drafting specialist at Mobitel. Your task is to generate 
    a professional RENEWAL agreement draft. Ensure continuity of terms while updating relevant dates."""

    # Handle cases where existing_text might be very short or minimal
    context_desc = "minimal context"
    if len(existing_text.strip()) > 100:
        context_desc = "the following existing agreement text"
        
    prompt = f"""Based on {context_desc}, generate a professional RENEWAL agreement template.

EXISTING AGREEMENT TYPE: {agreement_type}
CONTEXT / EXISTING TEXT:
{existing_text[:6000]}

Generate a draft for a NEW agreement (Renewal) that:
1. Clearly states it is a renewal of a previous agreement.
2. Updates the TERM to a new period (use [NEW TERM] as placeholder).
3. Keeps core obligations but explicitly allows for updated pricing/values.
4. Uses [PLACEHOLDER] for specific dates, names, and amounts.
5. If the context is limited, generate a standard Mobitel renewal skeleton for a {agreement_type} agreement.

Format it as a professional legal document in Markdown."""

    template_text = await call_llm(prompt, system_prompt, temperature=0.5, max_tokens=6000)
    return {"template": template_text, "type": "renewal"}


async def generate_case_template(case_details: str, case_type: str = "General") -> dict:
    """
    Generate a legal filing or response template based on case details.
    """
    system_prompt = """You are a senior litigation specialist at Mobitel. Your task is to generate 
    a legal filing template (e.g., Plaint, Answer, Motion) based on provided case facts and type."""

    prompt = f"""Based on the following case details, generate a professional legal filing template.

CASE TYPE: {case_type}
CASE FACTS/DETAILS:
{case_details[:5000]}

Generate a structured legal filing that includes:
1. Court Name and Case Number placeholders.
2. Caption (Parties).
3. Jurisdiction and Venue statements.
4. Statement of Facts (aligned with provided details).
5. Causes of Action or Grounds for Defense.
6. Prayer for Relief / Request to the Court.
7. Verification and Signature block.

Use [PLACEHOLDER] for missing information. Focus on Sri Lankan legal procedures where applicable."""

    template_text = await call_llm(prompt, system_prompt, temperature=0.5, max_tokens=6000)
    return {"template": template_text, "type": "case_filing"}
