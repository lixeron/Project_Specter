"""LLM service — provider factory and high-level generation API."""

from __future__ import annotations

from typing import Any

from specter.config import get_settings
from specter.services.llm.gemini import GeminiProvider
from specter.services.llm.mock import MockProvider
from specter.services.llm.openai import OpenAIProvider


def get_llm_provider() -> Any:
    """Create an LLM provider based on the current configuration.

    Returns MockProvider if no API key is configured, or the configured provider.
    """
    settings = get_settings()
    provider_name = settings.llm_provider.lower()

    if provider_name == "gemini" and settings.gemini_api_key:
        return GeminiProvider()

    if provider_name == "openai" and settings.openai_api_key:
        return OpenAIProvider()

    # Default to mock for development / free tier
    return MockProvider()


async def generate_phishing_email(
    target_name: str = "User",
    target_department: str = "General",
    org_name: str = "Organization",
    topic: str = "general",
    tone: str = "urgent",
    difficulty: str = "intermediate",
) -> dict[str, Any]:
    """High-level API for generating a phishing email.

    Uses whichever LLM provider is configured.
    """
    provider = get_llm_provider()
    result: dict[str, Any] = await provider.generate_phishing_email(
        target_name=target_name,
        target_department=target_department,
        org_name=org_name,
        topic=topic,
        tone=tone,
        difficulty=difficulty,
    )
    return result