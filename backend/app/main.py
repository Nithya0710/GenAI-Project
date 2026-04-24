"""
main.py — FastAPI application entry point.
v3: Google SSO auth + slowapi rate limiting + dark-mode-safe CORS.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.routers import documents
from app.routers import generate as generate_router
from app.routers.process import router as process_router
from app.routers.chat import router as chat_router
from app.routers.auth import router as auth_router
from app.middleware.rate_limit import limiter, rate_limit_handler

from dotenv import load_dotenv
import os

load_dotenv()

# fastapi app instance
app = FastAPI(
    title="Smart Revision Generator API",
    description="GenAI-based system for intelligent study and revision support",
    version="2.0.0",
)

# ── Rate limiting ────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

# add cors middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api", tags=["auth"])
app.include_router(documents.router,    prefix="/api", tags=["documents"])
app.include_router(generate_router.router, prefix="/api", tags=["generate"])
app.include_router(process_router,      prefix="/api", tags=["process"])
app.include_router(chat_router,         prefix="/api", tags=["chat"])


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Smart Revision Generator API is running",
        "version": "2.0.0",
        "features": ["google-sso", "rate-limiting", "rag", "chat"],
    }