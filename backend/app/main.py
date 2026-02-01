from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import projects, generate, upload, templates, themes

app = FastAPI(
    title="PDP Maker API",
    version="5.2.0",
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

app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(generate.router, prefix="/api/generate", tags=["Generate"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(themes.router, prefix="/api/themes", tags=["Themes"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.2.0"}
