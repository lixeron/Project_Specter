"""Google Gemini LLM provider — generates phishing content via Gemini Flash."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from specter.config import get_settings
from specter.services.llm.openai import (
    DIFFICULTY_DESCRIPTIONS,
    PHISHING_SYSTEM_PROMPT,
    PHISHING_USER_PROMPT,
)

logger = logging.getLogger(__name__)


class GeminiProvider:
    """Gemini-powered LLM provider for generating phishing content.

    Uses Gemini 2.0 Flash — free tier: 15 RPM, 1500 RPD, 1M TPM.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.gemini_api_key
        self.model = "gemini-2.0-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate(self, prompt: str, system: str = "", max_tokens: int = 1000) -> str:
        """Generate a text completion from Gemini."""
        contents = [{"role": "user", "parts": [{"text": prompt}]}]

        body: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.8,
            },
        }

        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent",
                params={"key": self.api_key},
                headers={"Content-Type": "application/json"},
                json=body,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data["candidates"][0]["content"]["parts"][0]["text"])

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1000,
    ) -> dict[str, Any]:
        """Generate a structured JSON response from Gemini."""
        raw = await self.generate(prompt, system=system, max_tokens=max_tokens)

        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            result: dict[str, Any] = json.loads(cleaned)
            return result
        except json.JSONDecodeError:
            logger.error("Failed to parse Gemini response as JSON: %s", raw[:200])
            raise

    async def generate_phishing_email(
        self,
        target_name: str = "User",
        target_department: str = "General",
        org_name: str = "Organization",
        topic: str = "general",
        tone: str = "urgent",
        difficulty: str = "intermediate",
    ) -> dict[str, Any]:
        """Generate a phishing email using Gemini."""
        difficulty_desc = DIFFICULTY_DESCRIPTIONS.get(
            difficulty, DIFFICULTY_DESCRIPTIONS["intermediate"]
        )

        prompt = PHISHING_USER_PROMPT.format(
            target_name=target_name,
            target_department=target_department,
            org_name=org_name,
            topic=topic,
            tone=tone,
            difficulty=difficulty,
            difficulty_desc=difficulty_desc,
        )

        return await self.generate_structured(
            prompt=prompt,
            system=PHISHING_SYSTEM_PROMPT,
            max_tokens=1500,
        )