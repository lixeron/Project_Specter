"""FastAPI application factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from specter import __version__
from specter.api.middleware import RequestLoggingMiddleware
from specter.api.routers import auth, campaigns, groups, health, simulations, tracking
from specter.config import get_settings
from specter.db import init_db
from specter.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events."""
    settings = get_settings()

    # Configure structured logging
    setup_logging()

    # Auto-create tables in development (use Alembic in production)
    if not settings.is_production:
        await init_db()

    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Specter",
        description="Adversary simulation platform — social engineering testing & training",
        version=__version__,
        docs_url="/api/docs" if settings.debug else None,
        redoc_url="/api/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters — last added = first executed) ──
# 1. Add your custom middleware FIRST (so it executes internally)
    app.add_middleware(RequestLoggingMiddleware)

    # 2. Add CORS LAST (so it executes FIRST and catches the preflight)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://project-specter.vercel.app"],
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
    app.include_router(simulations.router, prefix=api_prefix)

    # Tracking routes are public — no /api/v1 prefix
    app.include_router(tracking.router)

    return app


app = create_app()
