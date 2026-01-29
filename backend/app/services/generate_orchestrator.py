from datetime import datetime

from app.database import get_supabase
from app.services.gemini_service import GeminiService
from app.services.image_gen_service import ImageGenService
from app.services.storage_service import StorageService
from app.schemas.generate import GenerateResult, GeneratedImages
from app.prompts.text_generation import build_prompt


class GenerateOrchestrator:
    """AI 생성 전체 흐름을 조율한다."""

    def __init__(self):
        self.gemini = GeminiService()
        self.image = ImageGenService()
        self.storage = StorageService()
        self.db = get_supabase()

    async def generate(
        self,
        project_id: str,
        template_id: str,
        color_preset_id: str = None,
        tone_manner: dict = None,
    ) -> GenerateResult:
        project = self._get_project(project_id)
        template = self._get_template(template_id)

        # 색상 프리셋 조회
        color_preset = None
        if color_preset_id:
            color_preset = self._get_color_preset(color_preset_id)
        elif project.get("color_preset_id"):
            color_preset = self._get_color_preset(str(project["color_preset_id"]))

        # 톤앤매너 (요청 파라미터 > 프로젝트 저장값)
        effective_tone_manner = tone_manner or project.get("tone_manner")

        self._update_status(project_id, "generating")

        try:
            # 텍스트 생성
            texts, token_usage = await self._generate_texts(
                project, template, color_preset, effective_tone_manner
            )

            # 이미지 생성
            images = await self._generate_images(
                project, template, color_preset, effective_tone_manner
            )

            # 결과 저장
            generated_content = {
                "texts": texts.model_dump(),
                "images": images.model_dump(),
                "generated_at": datetime.now().isoformat(),
            }

            self.db.table("projects").update(
                {
                    "generated_content": generated_content,
                    "status": "editing",
                }
            ).eq("id", project_id).execute()

            return GenerateResult(
                project_id=project_id,
                texts=texts,
                images=images,
                generated_at=datetime.now(),
            )

        except Exception:
            self._update_status(project_id, "failed")
            raise

    def _get_project(self, project_id: str) -> dict:
        result = self.db.table("projects").select("*").eq("id", project_id).single().execute()
        return result.data

    def _get_template(self, template_id: str) -> dict:
        result = self.db.table("templates").select("*").eq("id", template_id).single().execute()
        return result.data

    def _get_color_preset(self, preset_id: str) -> dict:
        result = (
            self.db.table("color_presets")
            .select("*")
            .eq("id", preset_id)
            .single()
            .execute()
        )
        return result.data

    def _update_status(self, project_id: str, status: str) -> None:
        self.db.table("projects").update({"status": status}).eq("id", project_id).execute()

    async def _generate_texts(
        self,
        project: dict,
        template: dict,
        color_preset: dict = None,
        tone_manner: dict = None,
    ):
        period = None
        if project.get("event_period_start") and project.get("event_period_end"):
            period = f"{project['event_period_start']} ~ {project['event_period_end']}"

        prompt = build_prompt(
            template_category=template["category"],
            brand_name=project["brand_name"],
            description=project["description"],
            event_period=period,
            price_info=project.get("price_info"),
            color_preset_name=color_preset["name"] if color_preset else None,
            tone_manner=tone_manner,
        )
        return await self.gemini.generate_text(prompt)

    async def _generate_images(
        self,
        project: dict,
        template: dict,
        color_preset: dict = None,
        tone_manner: dict = None,
    ) -> GeneratedImages:
        style_map = {
            "food": ["warm", "appetizing", "premium"],
            "fashion": ["editorial", "luxury", "minimal"],
        }
        keywords = style_map.get(template["category"], ["modern", "clean"])

        # 색상 프리셋에서 스타일 키워드 추가
        if color_preset:
            keywords.append(color_preset["name"])

        # 톤앤매너 키워드 추가
        if tone_manner:
            if tone_manner.get("mood"):
                keywords.append(tone_manner["mood"])
            for kw in tone_manner.get("keywords", [])[:2]:
                keywords.append(kw)

        try:
            banner_result = await self.image.generate_banner(
                brand_name=project["brand_name"],
                category=template["category"],
                style_keywords=keywords,
                width=template["width"],
                height=400,
            )

            # Imagen API는 PIL Image 객체를 반환 → PNG bytes로 변환 후 Storage 업로드
            pil_image = banner_result["pil_image"]
            import io
            buf = io.BytesIO()
            pil_image.save(buf, format="PNG")
            image_bytes = buf.getvalue()

            banner_path = await self.storage.upload_image(
                file_bytes=image_bytes,
                project_id=str(project["id"]),
                image_type="generated",
                filename="banner.png",
            )

            return GeneratedImages(banner=banner_path, products=[])

        except Exception:
            # 이미지 생성 실패 시 텍스트만으로 진행
            return GeneratedImages(banner=None, products=[])
