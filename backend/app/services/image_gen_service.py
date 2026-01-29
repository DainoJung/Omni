from google import genai
from google.genai import types

from app.config import settings


class ImageGenService:
    MAX_RETRIES = 1

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.IMAGEN_MODEL

    async def generate_banner(
        self,
        brand_name: str,
        category: str,
        style_keywords: list[str],
        width: int = 860,
        height: int = 400,
    ) -> dict:
        """배너 이미지를 생성하고 결과를 반환한다."""

        prompt = self._build_prompt(brand_name, category, style_keywords)
        aspect_ratio = self._pick_aspect_ratio(width, height)

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_images(
                    model=self.model,
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        output_mime_type="image/png",
                        aspect_ratio=aspect_ratio,
                    ),
                )

                if not response.generated_images:
                    raise RuntimeError("이미지 생성 결과가 비어 있습니다.")

                image = response.generated_images[0].image
                return {
                    "image_bytes": image._pil_image.tobytes() if hasattr(image, "_pil_image") else None,
                    "pil_image": image,
                    "status": "success",
                }

            except Exception as e:
                if attempt < self.MAX_RETRIES:
                    continue
                raise RuntimeError(
                    f"AI_IMAGE_GENERATION_FAILED: Imagen API 호출 실패 - {e}"
                )

        return {}  # unreachable

    def _pick_aspect_ratio(self, width: int, height: int) -> str:
        """Imagen이 지원하는 aspect ratio 중 가장 가까운 값을 선택한다."""
        ratio = width / height
        options = {
            "1:1": 1.0,
            "3:4": 0.75,
            "4:3": 1.333,
            "9:16": 0.5625,
            "16:9": 1.778,
        }
        closest = min(options, key=lambda k: abs(options[k] - ratio))
        return closest

    def _build_prompt(
        self, brand_name: str, category: str, keywords: list[str]
    ) -> str:
        category_styles = {
            "food": "warm lighting, appetizing, clean background, premium food photography, no text",
            "fashion": "editorial style, high fashion, clean minimal background, luxury feel, no text",
        }
        base_style = category_styles.get(category, "professional, clean, modern, no text")
        keyword_str = ", ".join(keywords) if keywords else ""
        return f"{brand_name} {category} promotion banner, {base_style}, {keyword_str}"
