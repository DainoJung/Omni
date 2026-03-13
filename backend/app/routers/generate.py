from fastapi import APIRouter, HTTPException, Depends

from app.database import get_supabase
from app.schemas.generate import GenerateRequest, GenerateResponse, GenerateV2Request, GenerateV2Response
from app.services.generate_orchestrator import GenerateOrchestrator
from app.dependencies.auth import get_current_user, CurrentUser
from app.routers.billing import deduct_credit

router = APIRouter()


@router.post("", response_model=GenerateResponse)
async def generate(data: GenerateRequest, current_user: CurrentUser = Depends(get_current_user)):
    orchestrator = GenerateOrchestrator()
    try:
        # 크레딧 차감
        has_credit = await deduct_credit(current_user.user_id)
        if not has_credit:
            raise HTTPException(status_code=402, detail="크레딧이 부족합니다. 플랜을 업그레이드해주세요.")

        # background_config는 요청에서 또는 DB에서 로드
        background_config = data.background.model_dump() if data.background else None
        include_wine = data.include_wine or False

        # DB에서 프로젝트 데이터 로드 (image_url 등 Pydantic에 없는 필드 보존)
        db = get_supabase()
        proj = db.table("projects").select("background_config, restaurants, input_data").eq("id", str(data.project_id)).eq("user_id", current_user.user_id).single().execute()

        # restaurants/wines는 항상 DB에서 로드 (image_url 필드가 Pydantic에서 누락되므로)
        restaurants = None
        wines = None
        concept = None
        if proj.data:
            if not background_config and proj.data.get("background_config"):
                background_config = proj.data["background_config"]
            if proj.data.get("restaurants"):
                restaurants = proj.data["restaurants"]
            input_data = proj.data.get("input_data") or {}
            if input_data.get("wines"):
                wines = input_data["wines"]
            if not include_wine and input_data.get("include_wine"):
                include_wine = input_data["include_wine"]
            if input_data.get("concept"):
                concept = input_data["concept"]

        result = await orchestrator.generate(
            project_id=str(data.project_id),
            products=[p.model_dump() for p in data.products],
            page_type_id=data.page_type,
            background_config=background_config,
            restaurants=restaurants,
            include_wine=include_wine,
            wines=wines,
            concept=concept,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INTERNAL_ERROR: {e}")


@router.post("/v2", response_model=GenerateV2Response)
async def generate_v2(data: GenerateV2Request, current_user: CurrentUser = Depends(get_current_user)):
    """v2 글로벌 생성 파이프라인: 분석 기반 템플릿 매칭 → 다국어 콘텐츠 생성"""
    orchestrator = GenerateOrchestrator()
    try:
        # 프로젝트 소유권 확인
        db = get_supabase()
        proj = db.table("projects").select("id").eq("id", str(data.project_id)).eq("user_id", current_user.user_id).maybe_single().execute()
        if not proj.data:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        # TODO: 과금 시스템 연동 후 크레딧 차감 활성화
        # has_credit = await deduct_credit(current_user.user_id)
        # if not has_credit:
        #     raise HTTPException(status_code=402, detail="크레딧이 부족합니다. 플랜을 업그레이드해주세요.")

        result = await orchestrator.generate_v2(
            project_id=str(data.project_id),
            template_style=data.template_style,
            language=data.language,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INTERNAL_ERROR: {e}")
