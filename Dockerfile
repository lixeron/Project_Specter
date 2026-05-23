# ── Stage 1: Builder ─────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app
COPY pyproject.toml .
COPY README.md .
COPY src/ ./src/


RUN pip install --no-cache-dir .

# ── Stage 2: Production ─────────────────────
FROM python:3.12-slim AS production

RUN addgroup --system specter && adduser --system --group specter

WORKDIR /app

# Copy installed packages and binaries
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source
COPY src/ ./src/
COPY alembic.ini ./

# Switch to non-root user
USER specter

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:${PORT:-8000}/api/v1/health')" || exit 1

CMD ["sh", "-c", "echo '=== RUNNING MIGRATIONS ===' && alembic upgrade head 2>&1 && echo '=== MIGRATIONS COMPLETE ===' && uvicorn specter.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]