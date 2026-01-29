from fastapi import APIRouter, HTTPException

from app.schemas.generate import GenerateRequest, GenerateResult
from app.services.generate_orchestrator import GenerateOrchestrator

router = APIRouter()


@router.post("", response_model=GenerateResult)
async def generate(data: GenerateRequest):
    orchestrator = GenerateOrchestrator()
    try:
        result = await orchestrator.generate(
            project_id=str(data.project_id),
            template_id=str(data.template_id),
            color_preset_id=str(data.color_preset_id) if data.color_preset_id else None,
            tone_manner=data.tone_manner,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INTERNAL_ERROR: {e}")
