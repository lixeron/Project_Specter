"""Base class for attack vectors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class AttackVector(ABC):
    """Abstract base class for all attack vectors.

    Each vector implements content generation, delivery tracking,
    and training feedback generation.
    """

    # Whether this vector requires Pro tier
    requires_pro: bool = False

    @property
    @abstractmethod
    def vector_type(self) -> str:
        """Return the vector type identifier (email, sms, qr, fake_login, pretext)."""
        ...

    @abstractmethod
    async def generate_content(
        self,
        target_name: str,
        target_department: str,
        org_name: str,
        topic: str,
        tone: str,
        difficulty: str,
    ) -> dict[str, Any]:
        """Generate the attack content for this vector.

        Returns a dict with vector-specific content fields.
        """
        ...

    @abstractmethod
    def get_training_summary(self, content: dict[str, Any]) -> dict[str, Any]:
        """Generate a training summary for the attack content.

        Returns red flags, tactics, and educational content.
        """
        ...
