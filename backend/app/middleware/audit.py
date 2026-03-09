"""
Audit middleware: automatically log requests for audit trail.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to log API request metadata for audit purposes."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # Log request metrics (non-blocking, for monitoring)
        if request.url.path.startswith("/api/"):
            print(f"[AUDIT] {request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")

        return response
