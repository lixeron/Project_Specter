"""FastAPI middleware — correlation IDs, request logging, metrics."""

import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from specter.logging import get_logger, set_correlation_id

logger = get_logger(__name__)


# ── Simple metrics collector ─────────────────────────────────


class MetricsCollector:
    """In-memory metrics for Prometheus endpoint."""

    def __init__(self) -> None:
        self.request_count: dict[str, int] = defaultdict(int)
        self.request_duration: dict[str, list[float]] = defaultdict(list)
        self.status_count: dict[int, int] = defaultdict(int)
        self.active_requests: int = 0

    def record(self, method: str, path: str, status: int, duration: float) -> None:
        key = f"{method} {path}"
        self.request_count[key] += 1
        self.status_count[status] += 1
        # Keep last 1000 durations per endpoint to avoid unbounded memory
        durations = self.request_duration[key]
        durations.append(duration)
        if len(durations) > 1000:
            self.request_duration[key] = durations[-1000:]

    def get_metrics(self) -> dict:
        """Return metrics summary."""
        total_requests = sum(self.request_count.values())
        all_durations = [d for durations in self.request_duration.values() for d in durations]

        avg_duration = sum(all_durations) / len(all_durations) if all_durations else 0
        p95_duration = sorted(all_durations)[int(len(all_durations) * 0.95)] if all_durations else 0

        return {
            "total_requests": total_requests,
            "active_requests": self.active_requests,
            "avg_response_time_ms": round(avg_duration * 1000, 2),
            "p95_response_time_ms": round(p95_duration * 1000, 2),
            "status_codes": dict(self.status_count),
            "endpoints": {
                k: {
                    "count": v,
                    "avg_ms": round(
                        sum(self.request_duration[k]) / len(self.request_duration[k]) * 1000,
                        2,
                    ),
                }
                for k, v in sorted(
                    self.request_count.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:20]
            },
        }


# Global metrics instance
metrics = MetricsCollector()


# ── Request logging middleware ───────────────────────────────


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Adds correlation ID, logs requests, and collects metrics."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Set correlation ID from header or generate new one
        cid = request.headers.get("X-Correlation-ID")
        cid = set_correlation_id(cid)

        # Track timing
        start = time.perf_counter()
        metrics.active_requests += 1

        try:
            response = await call_next(request)
        except Exception:
            metrics.active_requests -= 1
            duration = time.perf_counter() - start
            logger.error(
                "request_error",
                method=request.method,
                path=request.url.path,
                duration=round(duration, 4),
            )
            raise

        duration = time.perf_counter() - start
        metrics.active_requests -= 1

        # Record metrics
        metrics.record(
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )

        # Log the request
        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration=round(duration, 4),
            client=request.client.host if request.client else None,
        )

        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = cid
        return response
