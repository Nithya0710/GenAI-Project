from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents
from app.routers import generate as generate_router

app = FastAPI(
    title="Smart Revision Generator API",
    description="GenAI-based system for intelligent study and revision support",
    version="1.0.0"
)

# CORS — allows your React frontend (localhost:5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(generate_router.router, prefix="/api", tags=["generate"])

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Smart Revision Generator API is running"
    }