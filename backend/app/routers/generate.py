from fastapi import APIRouter, HTTPException

from app.schemas.generate import LayoutGenerateRequest, LayoutGenerateResponse
from app.services.generate_orchestrator import GenerateOrchestrator

router = APIRouter()


@router.post("/layout", response_model=LayoutGenerateResponse)
async def generate_layout(data: LayoutGenerateRequest):
    orchestrator = GenerateOrchestrator()
    try:
        result = await orchestrator.generate_layout(
            project_id=str(data.project_id),
            products=[p.model_dump() for p in data.products],
            brand_name=data.brand_name,
            category=data.category,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INTERNAL_ERROR: {e}")
