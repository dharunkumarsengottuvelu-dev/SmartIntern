"""
offline_guard.py — Verifies that required Ollama models exist locally before
the FastAPI app is allowed to serve any traffic.

This runs ONCE at startup (via @app.on_event("startup")) and also on every
GET /health request so the Next.js app or a kiosk watchdog can poll it.

Design intent:
  - Does NOT attempt to pull missing models (pulling requires internet — that
    defeats the offline goal).
  - Fails loud, not silent: if a model is missing the error message tells you
    the EXACT `ollama pull` command to run.
  - Also verifies Postgres is reachable (if DATABASE_URL is set), so a single
    /health call tells you whether the full stack is ready.
"""

import asyncpg
import httpx

from core.config import settings

REQUIRED_MODELS: set[str] = {settings.LLM_MODEL, settings.EMBED_MODEL}


async def verify_local_models() -> dict:
    """
    Check that every model in REQUIRED_MODELS is present in the local Ollama
    model store. Raises RuntimeError with an actionable message if anything
    is wrong. Returns a status dict on success.
    """
    # ── 1. Ollama reachability ────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            available_names: set[str] = {
                m["name"] for m in resp.json().get("models", [])
            }
    except httpx.HTTPError as exc:
        raise RuntimeError(
            f"Cannot reach Ollama at {settings.OLLAMA_BASE_URL}. "
            f"Is the ollama container/service running?\n  Error: {exc}"
        ) from exc

    # ── 2. Model presence check ───────────────────────────────────────────────
    # Ollama model names can include a tag (e.g. "gemma4:e4b") or just a name
    # ("nomic-embed-text"). We do a prefix match so both "nomic-embed-text"
    # and "nomic-embed-text:latest" resolve correctly.
    def _model_present(required: str) -> bool:
        if required in available_names:
            return True
        # tolerate ":latest" suffix that Ollama sometimes adds/omits
        base = required.split(":")[0]
        return any(n == required or n.startswith(base + ":") for n in available_names)

    missing = {m for m in REQUIRED_MODELS if not _model_present(m)}
    if missing:
        pull_cmds = "\n".join(f"  ollama pull {m}" for m in sorted(missing))
        raise RuntimeError(
            f"Missing local Ollama models: {missing}.\n"
            f"This app runs fully offline and will NOT auto-pull models.\n"
            f"Run the following command(s) while you have internet access, "
            f"then restart the service:\n{pull_cmds}"
        )

    return {"ollama": "ok", "models": sorted(available_names)}


async def verify_database() -> dict:
    """Check that the Postgres instance is reachable."""
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=5)
        await conn.fetchval("SELECT 1")
        await conn.close()
        return {"db": "ok"}
    except Exception as exc:
        raise RuntimeError(
            f"Cannot reach Postgres at {settings.DATABASE_URL!r}.\n"
            f"  Error: {exc}"
        ) from exc


async def full_health_check() -> dict:
    """Run both checks and return a combined status dict."""
    model_status = await verify_local_models()
    db_status = await verify_database()
    return {"status": "ok", **model_status, **db_status}
