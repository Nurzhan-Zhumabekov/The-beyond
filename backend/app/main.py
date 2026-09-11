from fastapi import FastAPI

app = FastAPI(
    title="AI Content Factory API",
    description="Backend API for generating branded content packages.",
    version="0.1.0",
)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "AI Content Factory API",
    }
