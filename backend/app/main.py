from fastapi import FastAPI

from app.api.assets import router as assets_router
from app.api.availability import router as availability_router
from app.api.catalog import router as catalog_router


app = FastAPI(
    title="FrameSense Backend",
    version="0.1.0",
    description="Backend services for vendor catalog sync, image pipelines, and protected business logic.",
)

app.include_router(catalog_router)
app.include_router(availability_router)
app.include_router(assets_router)


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
