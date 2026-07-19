"""
main.py — FastAPI AI service entry point for SmartIntern (fully offline).

Startup sequence:
1. offline_guard.verify_local_models() — confirms gemma4:e4b and nomic-embed-text
   are present in the local Ollama store. Refuses to start if either is missing.
2. offline_guard.verify_database() — confirms Postgres is reachable.

If either check fails, the process exits with a clear error message including
the exact command needed to fix the problem. It does NOT silently degrade to
a cloud fallback — that would defeat the offline guarantee.

IMPORTANT: No route in this app may call an external hostname at request time.
All LLM calls go through services/ollama_client.py → OLLAMA_BASE_URL (local).
All DB calls go through asyncpg → DATABASE_URL (local Postgres).
"""

import logging
import sys

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.offline_guard import full_health_check, verify_local_models

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SmartIntern AI Service",
    description="Fully offline AI microservice — Ollama + pgvector + local Postgres only",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://nextjs:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Startup check ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_check() -> None:
    logger.info("=== SmartIntern AI Service starting (OFFLINE_MODE=%s) ===", settings.OFFLINE_MODE)
    try:
        status = await full_health_check()
        logger.info("offline_guard passed: %s", status)
    except RuntimeError as exc:
        logger.critical(
            "\n\n" + "=" * 70 + "\n"
            "STARTUP FAILED — OFFLINE READINESS CHECK DID NOT PASS\n"
            + "=" * 70 + "\n"
            "%s\n"
            + "=" * 70 + "\n",
            exc,
        )
        sys.exit(1)


@app.on_event("shutdown")
async def shutdown() -> None:
    from services.ollama_client import close as close_ollama
    await close_ollama()
    logger.info("AI service shut down cleanly")


# ── Routers ───────────────────────────────────────────────────────────────────
from routers import resume, internship, recommend, chat, feedback, evaluate  # noqa: E402

app.include_router(resume.router)
app.include_router(internship.router)
app.include_router(recommend.router)
app.include_router(chat.router)
app.include_router(feedback.router)
app.include_router(evaluate.router)


# ── Health endpoint ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """
    Full offline readiness check — verifies Ollama models and Postgres.
    Called by Next.js app and kiosk watchdog on startup.
    """
    try:
        status = await full_health_check()
        return JSONResponse(content={"status": "ok", **status})
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": str(exc)},
        )


# ── MCQ generate (top-level, mirrors the path the Next.js route calls) ────────
@app.post("/generate-mcq")
async def generate_mcq(body: dict):
    """Proxy to /feedback/mcq/generate — kept at top level for Next.js compatibility."""
    from services.mcq_generator import generate_mcqs
    from fastapi import HTTPException
    skills = body.get("skills", [])
    count = min(int(body.get("count", 20)), 30)
    if not skills:
        raise HTTPException(status_code=400, detail="skills array is required")
    questions = await generate_mcqs(skills=skills, count=count)
    return {"questions": questions, "total": len(questions)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
