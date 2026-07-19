"""
retry.py — Exponential backoff decorator for local service calls.

Only used for calls to local Ollama and local Postgres — never for external
APIs (there should be none in this codebase). The intent is to handle the
natural startup race where the ollama container is ready a few seconds after
the ai-service container.
"""

import asyncio
import functools
import logging
from typing import Callable, TypeVar

from tenacity import (
    AsyncRetrying,
    RetryError,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
import httpx

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable)


def local_retry(
    max_attempts: int = 3,
    min_wait: float = 1.0,
    max_wait: float = 8.0,
    reraise: bool = True,
) -> Callable[[F], F]:
    """
    Decorator: retry an async function on httpx.HTTPError or asyncio.TimeoutError.
    Suitable for local Ollama and Postgres calls where a transient startup
    delay is expected but a permanent failure should still propagate.
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                async for attempt in AsyncRetrying(
                    stop=stop_after_attempt(max_attempts),
                    wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
                    retry=retry_if_exception_type((httpx.HTTPError, asyncio.TimeoutError, OSError)),
                    reraise=reraise,
                ):
                    with attempt:
                        return await func(*args, **kwargs)
            except RetryError as exc:
                logger.error(
                    "local_retry exhausted after %d attempts for %s: %s",
                    max_attempts, func.__name__, exc
                )
                raise
        return wrapper  # type: ignore[return-value]
    return decorator
