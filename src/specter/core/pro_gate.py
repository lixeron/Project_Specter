"""Pro tier gating — checks org plan before allowing access to Pro features."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from specter.models.database import Organization


async def check_pro_tier(org_id: str, db: AsyncSession) -> bool:
    """Check if an organization has Pro tier access.

    Returns True if the org is on a Pro or Enterprise plan.
    Raises HTTP 402 if the org is on the free tier.
    """
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()

    if not org or org.plan == "free":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "pro_required",
                "message": (
                    "This feature requires Specter Pro. "
                    "Upgrade your plan to access SMS phishing, "
                    "fake login pages, pretexting scenarios, "
                    "adaptive AI, and compliance reports."
                ),
                "upgrade_url": "https://github.com/lixeron/Project_Specter#pro",
            },
        )

    return True
