"""Attack vector registry — factory for creating vector instances."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from specter.vectors.base import AttackVector

from specter.vectors.fake_login import FakeLoginVector
from specter.vectors.pretext import PretextVector
from specter.vectors.qr import QRCodeVector

# Registry of all available vectors
VECTOR_REGISTRY: dict[str, type[AttackVector]] = {
    "qr": QRCodeVector,
    "fake_login": FakeLoginVector,
    "pretext": PretextVector,
}

# Vectors available in the free/OSS tier
FREE_VECTORS: set[str] = {"email", "qr"}

# Vectors that require Pro tier
PRO_VECTORS: set[str] = {"sms", "fake_login", "pretext"}


def get_vector(vector_type: str) -> AttackVector:
    """Get an attack vector instance by type.

    Raises KeyError if the vector type is not registered.
    """
    if vector_type not in VECTOR_REGISTRY:
        msg = f"Unknown vector type: {vector_type}. Available: {list(VECTOR_REGISTRY.keys())}"
        raise KeyError(msg)
    return VECTOR_REGISTRY[vector_type]()


def is_pro_vector(vector_type: str) -> bool:
    """Check if a vector type requires Pro tier."""
    return vector_type in PRO_VECTORS


def list_vectors() -> list[dict[str, Any]]:
    """List all available vectors with their tier requirements."""
    all_vectors = ["email", *list(VECTOR_REGISTRY.keys())]
    return [
        {
            "type": v,
            "requires_pro": v in PRO_VECTORS,
            "tier": "pro" if v in PRO_VECTORS else "free",
        }
        for v in sorted(set(all_vectors))
    ]
