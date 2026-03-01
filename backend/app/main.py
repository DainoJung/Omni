import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    projects, generate, upload, templates, auth, images,
    users, product_analysis, template_catalog, billing,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Omni API",
    version="5.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(generate.router, prefix="/api/generate", tags=["Generate"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(template_catalog.router, prefix="/api/templates", tags=["TemplateCatalog"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(images.router, prefix="/api/images", tags=["Images"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(product_analysis.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])


@app.on_event("startup")
async def startup_event():
    from app.routers.auth import seed_admin_user
    await seed_admin_user()


@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.3.0"}
