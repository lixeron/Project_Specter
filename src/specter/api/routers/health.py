"""Health check endpoint."""

from fastapi import APIRouter
from sqlalchemy import text

from specter import __version__
from specter.config import get_settings
from specter.db import async_session_factory
from specter.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check API and database health."""
    settings = get_settings()

    # Test database connectivity
    db_status = "healthy"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    return HealthResponse(
        status="ok" if db_status == "healthy" else "degraded",
        version=__version__,
        database=db_status,
        environment=settings.app_env,
    )
