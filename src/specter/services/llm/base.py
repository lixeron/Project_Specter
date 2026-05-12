"""LLM provider protocol — defines the interface for all AI providers."""

from __future__ import annotations

from typing import Any, Protocol


class LLMProvider(Protocol):
    """Abstract interface for LLM providers.

    Implementations: OpenAIProvider, AnthropicProvider, OllamaProvider, MockProvider.
    All providers must implement generate() and generate_structured().
    """

    async def generate(self, prompt: str, system: str = "", max_tokens: int = 1000) -> str:
        """Generate a text completion from the LLM."""
        ...

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1000,
    ) -> dict[str, Any]:
        """Generate a structured JSON response from the LLM."""
        ...
