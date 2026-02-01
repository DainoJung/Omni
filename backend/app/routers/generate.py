from fastapi import APIRouter, HTTPException

from app.schemas.generate import GenerateRequest, GenerateResponse
from app.services.generate_orchestrator import GenerateOrchestrator

router = APIRouter()


@router.post("", response_model=GenerateResponse)
async def generate(data: GenerateRequest):
    orchestrator = GenerateOrchestrator()
    try:
        result = await orchestrator.generate(
            project_id=str(data.project_id),
            products=[p.model_dump() for p in data.products],
            theme_id=data.theme,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INTERNAL_ERROR: {e}")
