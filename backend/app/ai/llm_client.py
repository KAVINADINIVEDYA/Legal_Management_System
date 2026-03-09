"""
LLM Client: Groq API (primary) with Ollama local fallback.
Provides a unified interface for all AI features.
"""
import json
from typing import Optional
from app.config import settings


async def call_llm(prompt: str, system_prompt: str = "", temperature: float = 0.3,
                   max_tokens: int = 4000, json_mode: bool = False) -> str:
    """
    Call the LLM (Groq primary, Ollama fallback).
    Returns the text response from the model.
    """
    # Try Groq first (cloud-based)
    if not settings.USE_LOCAL_LLM and settings.GROQ_API_KEY:
        try:
            return await _call_groq(prompt, system_prompt, temperature, max_tokens, json_mode)
        except Exception as e:
            import traceback
            print(f"[LLM] Groq failed: {type(e).__name__}: {e}")
            traceback.print_exc()
            print("[LLM] Falling back to Ollama...")

    # Fallback to Ollama (local)
    try:
        return await _call_ollama(prompt, system_prompt, temperature, max_tokens, json_mode)
    except Exception as e:
        print(f"[LLM] Ollama failed: {e}")
        return f"[AI Error: Both Groq and Ollama are unavailable. {str(e)}]"


async def _call_groq(prompt: str, system_prompt: str, temperature: float,
                     max_tokens: int, json_mode: bool) -> str:
    """Call Groq Cloud LLM API."""
    from groq import AsyncGroq
    import httpx

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    kwargs = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    # Use HTTPX client with verify=False to bypass corporate SSL proxies
    # Properly close the client after use with async context manager
    async with httpx.AsyncClient(verify=False, timeout=120.0) as http_client:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY, http_client=http_client)
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content


async def _call_ollama(prompt: str, system_prompt: str, temperature: float,
                       max_tokens: int, json_mode: bool) -> str:
    """Call local Ollama LLM."""
    import httpx

    url = f"{settings.OLLAMA_BASE_URL}/api/generate"

    full_prompt = ""
    if system_prompt:
        full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"
    else:
        full_prompt = prompt

    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        }
    }

    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")


def parse_json_response(text: str) -> dict:
    """Safely parse JSON from LLM response, handling markdown code blocks."""
    # Strip markdown code blocks if present
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON in the text
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                # Try to extract the substring and parse it
                json_str = cleaned[start:end]
                # Filter out obvious non-JSON junk if it's too small or weird
                if len(json_str) > 2:
                    return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # If all parsing fails, return the raw text as an error detail
        return {"error": "Failed to parse AI response as JSON", "raw": text}
