from fastapi import FastAPI

from app.api.generation import router as generation_router

app = FastAPI(
    title="AI Content Factory API",
    description="Backend API for generating branded content packages.",
    version="0.1.0",
)

app.include_router(generation_router)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "AI Content Factory API",
    }
