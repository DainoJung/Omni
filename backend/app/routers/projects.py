import logging
import httpx
from fastapi import APIRouter, HTTPException
from uuid import UUID

logger = logging.getLogger(__name__)

from app.database import get_supabase
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    SectionDataUpdateRequest,
    ImageRegenerateRequest,
)
from app.services.template_ai_service import generate_section_image
from app.services.storage_service import StorageService

router = APIRouter()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate):
    db = get_supabase()
    insert_data = {
        "products": [p.model_dump() for p in data.products],
        "theme_id": data.page_type,
    }
    if data.selected_sections:
        insert_data["selected_sections"] = data.selected_sections
    if data.background:
        insert_data["background_config"] = data.background.model_dump()
    if data.restaurants:
        insert_data["restaurants"] = [r.model_dump() for r in data.restaurants]
    # input_data 저장 (concept, 와인 등)
    input_data = {}
    if data.concept:
        input_data["concept"] = data.concept
    if data.include_wine:
        input_data["include_wine"] = data.include_wine
    if data.wines:
        input_data["wines"] = [w.model_dump() for w in data.wines]
    if input_data:
        insert_data["input_data"] = input_data
    result = db.table("projects").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="프로젝트 생성 실패")

    return result.data[0]


@router.get("", response_model=ProjectListResponse)
async def list_projects():
    db = get_supabase()
    result = db.table("projects").select("*").order("created_at", desc=True).execute()
    return {"items": result.data, "total": len(result.data)}


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID):
    db = get_supabase()
    result = db.table("projects").select("*").eq("id", str(project_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return result.data


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, data: ProjectUpdate):
    db = get_supabase()
    update_data = data.model_dump(exclude_none=True)
    result = (
        db.table("projects")
        .update(update_data)
        .eq("id", str(project_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return result.data[0]


@router.put("/{project_id}/sections/{section_id}/data", response_model=ProjectResponse)
async def update_section_data(project_id: UUID, section_id: str, data: SectionDataUpdateRequest):
    """특정 섹션의 데이터(placeholder 값)를 수정한다."""
    logger.info(f"[update_section_data] project={project_id}, section={section_id}, data_keys={list(data.data.keys())}")
    db = get_supabase()

    # 현재 rendered_sections 가져오기
    project = db.table("projects").select("rendered_sections").eq("id", str(project_id)).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

    sections = project.data.get("rendered_sections") or []

    # 해당 섹션 찾아서 데이터 교체
    updated = False
    for section in sections:
        if section.get("section_id") == section_id:
            section["data"] = data.data
            if data.style_overrides is not None:
                section["style_overrides"] = data.style_overrides
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="SECTION_NOT_FOUND")

    result = (
        db.table("projects")
        .update({"rendered_sections": sections})
        .eq("id", str(project_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="섹션 데이터 업데이트 실패")
    return result.data[0]


@router.post("/{project_id}/sections/{section_id}/regenerate-image", response_model=ProjectResponse)
async def regenerate_section_image(project_id: UUID, section_id: str, body: ImageRegenerateRequest):
    """특정 섹션의 이미지를 수정된 프롬프트로 재생성한다."""
    db = get_supabase()
    storage = StorageService()

    project = db.table("projects").select("*").eq("id", str(project_id)).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

    sections = project.data.get("rendered_sections") or []
    generated_data = project.data.get("generated_data") or {}
    products = project.data.get("products") or []
    product_names = [p["name"] for p in products]

    # 해당 섹션 찾기
    target_section = None
    target_idx = -1
    for i, section in enumerate(sections):
        if section.get("section_id") == section_id:
            target_section = section
            target_idx = i
            break

    if target_section is None:
        raise HTTPException(status_code=404, detail="SECTION_NOT_FOUND")

    sec_type = target_section["section_type"]

    # 이미지 크기 매핑
    image_size_map = {
        "hero_banner": (860, 1400),
        "description": (860, 860),
        "feature_point": (860, 957),
        "fit_hero": (860, 625),
        "fit_event_info": (860, 1220),
        "fit_product_trio": (860, 1133),
        "vip_special_hero": (860, 500),
        "vip_private_hero": (860, 480),
        "gourmet_hero": (860, 780),
        "gourmet_restaurant": (860, 480),
        "shinsegae_hero": (860, 500),
    }

    if sec_type not in image_size_map:
        raise HTTPException(status_code=400, detail="이미지가 없는 섹션 타입입니다.")

    w, h = image_size_map[sec_type]

    # 기존 이미지를 다운로드하여 reference_image로 전달 (이미지 편집 모드)
    existing_image_url = None
    for key, value in target_section["data"].items():
        if key.endswith("_image") and isinstance(value, str) and value.startswith("http"):
            existing_image_url = value
            break

    reference_image = None
    reference_mime_type = None
    if existing_image_url:
        try:
            async with httpx.AsyncClient(timeout=15.0) as http_client:
                resp = await http_client.get(existing_image_url)
                resp.raise_for_status()
                reference_image = resp.content
                content_type = resp.headers.get("content-type", "image/png")
                reference_mime_type = content_type.split(";")[0].strip()
                logger.info(f"기존 이미지 다운로드 완료: {len(reference_image)} bytes")
        except Exception as e:
            logger.warning(f"기존 이미지 다운로드 실패, 새로 생성합니다: {e}")

    # 이미지 재생성 (reference_image가 있으면 편집 모드, 없으면 새로 생성)
    image_bytes, prompt_used = await generate_section_image(
        product_names=product_names,
        section_type=sec_type,
        width=w,
        height=h,
        custom_prompt=body.prompt,
        reference_image=reference_image,
        reference_mime_type=reference_mime_type,
    )

    # 업로드
    filename = f"{sec_type}_regen_{section_id[:8]}.png"
    path = await storage.upload_image(
        file_bytes=image_bytes,
        project_id=str(project_id),
        image_type="generated",
        filename=filename,
    )
    new_url = storage.get_public_url(path)

    # 섹션 data에서 이미지 URL 키 찾아서 교체
    for key, value in target_section["data"].items():
        if key.endswith("_image") and isinstance(value, str) and value.startswith("http"):
            target_section["data"][key] = new_url
            break

    sections[target_idx] = target_section

    # image_prompts 업데이트
    image_prompts = generated_data.get("image_prompts") or {}
    # section_id에서 prompt key 결정: section_type 또는 section_type__index
    # 기존 키에서 매칭 시도
    prompt_key = None
    for k in image_prompts:
        if k == sec_type or k.startswith(f"{sec_type}__"):
            # section_id 기반으로 매칭 — order 기반으로 찾기
            prompt_key = k
            break
    if prompt_key is None:
        prompt_key = sec_type
    image_prompts[prompt_key] = prompt_used
    generated_data["image_prompts"] = image_prompts

    result = (
        db.table("projects")
        .update({
            "rendered_sections": sections,
            "generated_data": generated_data,
        })
        .eq("id", str(project_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="이미지 재생성 업데이트 실패")
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: UUID):
    db = get_supabase()
    db.table("projects").delete().eq("id", str(project_id)).execute()
