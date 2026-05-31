import json
import hashlib
from typing import Optional
from loguru import logger
from app.core.config import settings


class CacheService:
    def __init__(self):
        self._client = None

    async def _get_client(self):
        if not settings.REDIS_ENABLED:
            return None
        if self._client is None:
            import redis.asyncio as aioredis
            self._client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._client

    def _make_key(self, prefix: str, data: str) -> str:
        digest = hashlib.md5(data.encode()).hexdigest()
        return f"querypilot:{prefix}:{digest}"

    async def get(self, prefix: str, data: str) -> Optional[dict]:
        client = await self._get_client()
        if not client:
            return None
        try:
            key = self._make_key(prefix, data)
            value = await client.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None

    async def set(self, prefix: str, data: str, value: dict, ttl: int = 3600):
        client = await self._get_client()
        if not client:
            return
        try:
            key = self._make_key(prefix, data)
            await client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning(f"Cache set failed: {e}")

    async def close(self):
        if self._client:
            await self._client.close()


cache_service = CacheService()
