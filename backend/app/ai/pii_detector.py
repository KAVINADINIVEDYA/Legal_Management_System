"""
PII Detection and Masking Pipeline.
Detects NIC, passport, bank accounts and masks them in outputs.
"""
import re
from typing import List, Tuple


# PII patterns for Sri Lankan context
PII_PATTERNS = {
    "nic": {
        "pattern": r'\b\d{9}[vVxX]\b|\b\d{12}\b',
        "label": "National ID Card",
        "mask": "***NIC***"
    },
    "passport": {
        "pattern": r'\b[A-Z]\d{7}\b',
        "label": "Passport Number",
        "mask": "***PASSPORT***"
    },
    "bank_account": {
        "pattern": r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b',
        "label": "Bank Account",
        "mask": "***BANK***"
    },
    "phone": {
        "pattern": r'\b(?:\+94|0)\d{9,10}\b',
        "label": "Phone Number",
        "mask": "***PHONE***"
    },
    "email": {
        "pattern": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "label": "Email Address",
        "mask": "***EMAIL***"
    },
    "credit_card": {
        "pattern": r'\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))\d{12}\b',
        "label": "Credit Card Number",
        "mask": "***CARD***"
    }
}


def detect_pii(text: str) -> List[dict]:
    """
    Detect PII in text and return list of findings.
    Returns: [{type, label, match, start, end}]
    """
    findings = []
    for pii_type, config in PII_PATTERNS.items():
        matches = re.finditer(config["pattern"], text)
        for match in matches:
            findings.append({
                "type": pii_type,
                "label": config["label"],
                "match": match.group(),
                "start": match.start(),
                "end": match.end(),
            })
    return findings


def mask_pii(text: str) -> Tuple[str, List[dict]]:
    """
    Detect and mask PII in text.
    Returns: (masked_text, list_of_findings)
    """
    findings = detect_pii(text)
    masked = text

    # Sort by position descending so replacements don't shift indices
    for finding in sorted(findings, key=lambda x: x["start"], reverse=True):
        mask = PII_PATTERNS[finding["type"]]["mask"]
        masked = masked[:finding["start"]] + mask + masked[finding["end"]:]

    return masked, findings


def should_block_external_send(text: str) -> bool:
    """Check if text contains PII that should not be sent to external LLM."""
    from app.config import settings
    if not settings.BLOCK_PII_TO_EXTERNAL_LLM:
        return False

    findings = detect_pii(text)
    # Block if sensitive PII found (NIC, passport, bank account, credit card)
    sensitive_types = {"nic", "passport", "bank_account", "credit_card"}
    return any(f["type"] in sensitive_types for f in findings)
