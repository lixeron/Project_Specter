"""OpenAI LLM provider — generates phishing content via GPT models."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from specter.config import get_settings

logger = logging.getLogger(__name__)

PHISHING_SYSTEM_PROMPT = """You are a security awareness training system that generates
simulated phishing emails for employee training purposes. Your job is to create realistic
but identifiable phishing attempts that help employees learn to recognize social engineering.

IMPORTANT: These emails are ONLY used in authorized security awareness training programs.
They are never sent to unsuspecting individuals outside of an organization's own training program.

Always respond with valid JSON only — no markdown, no code fences, no preamble."""

PHISHING_USER_PROMPT = """Generate a simulated phishing email for security awareness training.

Target details:
- Name: {target_name}
- Department: {target_department}
- Organization: {org_name}

Attack parameters:
- Topic/scenario: {topic}
- Tone: {tone}
- Difficulty: {difficulty}
- Difficulty description: {difficulty_desc}

Requirements:
- The email must contain identifiable red flags appropriate to the difficulty level
- Include a trackable link placeholder: {{{{TRACKING_URL}}}}
- Make it realistic enough to be educational but include the red flags listed below

Difficulty guide:
- beginner: Multiple obvious red flags (bad grammar, suspicious sender, generic greeting)
- intermediate: Fewer red flags (plausible sender, urgency tactics, slightly off domain)
- advanced: Subtle (uses target's name/dept, references real processes, one subtle red flag)
- expert: Near-realistic (personalized context, mimics real communication patterns)

Respond ONLY with this exact JSON structure:
{{
  "subject": "email subject line",
  "sender_name": "display name of sender",
  "sender_email": "sender@example.com",
  "body_html": "full HTML email body with {{{{TRACKING_URL}}}} placeholder for links",
  "body_text": "plain text version of email body",
  "red_flags": ["description of each red flag in the email"],
  "social_engineering_tactics": ["tactic names used, e.g. urgency, authority, fear"]
}}"""

DIFFICULTY_DESCRIPTIONS = {
    "beginner": (
        "Multiple obvious red flags: misspelled domain, generic greeting, "
        "broken grammar, suspicious sender address. Include 3-4 red flags."
    ),
    "intermediate": (
        "Fewer red flags: correct grammar, plausible sender, but urgency tactics, "
        "slightly off domain, or unusual request. Include 2-3 red flags."
    ),
    "advanced": (
        "Subtle: correct domain spoofing, uses target's name and department, "
        "references real internal processes, single subtle red flag."
    ),
    "expert": (
        "Near-realistic: personalized context from org data, mimics actual "
        "communication patterns, BEC-style with legitimate-looking thread history."
    ),
}


class OpenAIProvider:
    """OpenAI-powered LLM provider for generating phishing content."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.base_url = "https://api.openai.com/v1"
        self.model = "gpt-4o-mini"  # Cost-effective, good enough for phishing generation

    async def generate(self, prompt: str, system: str = "", max_tokens: int = 1000) -> str:
        """Generate a text completion from OpenAI."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.8,
                },
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1000,
    ) -> dict[str, Any]:
        """Generate a structured JSON response from OpenAI."""
        raw = await self.generate(prompt, system=system, max_tokens=max_tokens)

        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response as JSON: %s", raw[:200])
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
        """Generate a phishing email using OpenAI."""
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
