import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.generation import router as generation_router

app = FastAPI(
    title="AI Content Factory API",
    description="Backend API for generating branded content packages.",
    version="0.1.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)

app.include_router(generation_router)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "AI Content Factory API",
    }
