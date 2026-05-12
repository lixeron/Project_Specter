"""FastAPI application factory."""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from specter import __version__
from specter.config import get_settings
from specter.db import init_db

from specter.api.routers import auth, campaigns, groups, health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events."""
    settings = get_settings()

    # Auto-create tables in development (use Alembic in production)
    if not settings.is_production:
        await init_db()

    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Specter",
        description="Adversary Simulation Platform — multi-vector social engineering testing & training",
        version=__version__,
        docs_url="/api/docs" if settings.debug else None,
        redoc_url="/api/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.debug else [settings.base_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────
    api_prefix = "/api/v1"
    app.include_router(health.router, prefix=api_prefix)
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(campaigns.router, prefix=api_prefix)
    app.include_router(groups.router, prefix=api_prefix)

    # Phase 2+ routers (uncomment as implemented):
    # app.include_router(simulations.router, prefix=api_prefix)
    # app.include_router(tracking.router)  # No prefix — /t/{token}
    # app.include_router(analytics.router, prefix=api_prefix)
    # app.include_router(training.router, prefix=api_prefix)
    # app.include_router(admin.router, prefix=api_prefix)
    # app.include_router(reports.router, prefix=api_prefix)

    return app


app = create_app()
