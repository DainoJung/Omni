from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import projects, templates, generate, upload, colors, tone_manner

app = FastAPI(
    title="POP Maker API",
    version="0.1.0",
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
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(generate.router, prefix="/api/generate", tags=["Generate"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(colors.router, prefix="/api/colors", tags=["Colors"])
app.include_router(tone_manner.router, prefix="/api/tone-manner", tags=["ToneManner"])


@app.get("/health")
async def health():
    return {"status": "ok"}
