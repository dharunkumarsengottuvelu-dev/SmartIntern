"""
cache.py — Two-tier cache: Redis (if REDIS_URL is set) with in-memory LRU fallback.

All caching is local-only. There is no external cache service; Redis runs in
the same Docker Compose stack.
"""

import asyncio
import hashlib
import json
import logging
from collections import OrderedDict
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── In-memory LRU (used when Redis is unavailable) ───────────────────────────

class _LRUCache:
    def __init__(self, maxsize: int = 512):
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._maxsize = maxsize
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._cache:
                return None
            self._cache.move_to_end(key)
            return self._cache[key]

    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:  # noqa: A002
        async with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            if len(self._cache) > self._maxsize:
                self._cache.popitem(last=False)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._cache.pop(key, None)


_lru = _LRUCache()
_redis_client: Any = None  # set lazily


async def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        from core.config import settings
        if not settings.REDIS_URL:
            return None
        import redis.asyncio as aioredis
        _redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=False)
        await _redis_client.ping()
        logger.info("Redis cache connected at %s", settings.REDIS_URL)
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — falling back to in-memory LRU", exc)
        _redis_client = None
        return None


def cache_key(*parts: Any) -> str:
    """Stable deterministic key from arbitrary parts."""
    raw = ":".join(str(p) for p in parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


async def cache_get(key: str) -> Optional[Any]:
    r = await _get_redis()
    if r:
        try:
            val = await r.get(key)
            return json.loads(val) if val else None
        except Exception:
            pass
    return await _lru.get(key)


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    r = await _get_redis()
    if r:
        try:
            await r.set(key, json.dumps(value), ex=ttl)
            return
        except Exception:
            pass
    await _lru.set(key, value, ttl=ttl)


async def cache_delete(key: str) -> None:
    r = await _get_redis()
    if r:
        try:
            await r.delete(key)
        except Exception:
            pass
    await _lru.delete(key)
