import io
import base64
import logging

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)


class ImageGenService:
    """Gemini native image generation을 사용한 이미지 생성 서비스."""

    MAX_RETRIES = 1

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.IMAGE_GEN_MODEL

    async def generate_image(self, prompt: str) -> bytes:
        """프롬프트로 이미지를 생성하고 PNG bytes를 반환한다."""

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"],
                    ),
                )

                # 응답에서 이미지 파트 추출
                for part in response.candidates[0].content.parts:
                    if part.inline_data is not None:
                        image_data = part.inline_data.data
                        if isinstance(image_data, str):
                            image_data = base64.b64decode(image_data)
                        logger.info(
                            f"이미지 생성 성공: {len(image_data)} bytes"
                        )
                        return image_data

                raise RuntimeError("응답에 이미지가 포함되지 않았습니다.")

            except Exception as e:
                logger.warning(f"이미지 생성 시도 {attempt + 1} 실패: {e}")
                if attempt < self.MAX_RETRIES:
                    continue
                raise RuntimeError(
                    f"AI_IMAGE_GENERATION_FAILED: {e}"
                )

    async def generate_banner(
        self,
        brand_name: str,
        category: str,
        style_keywords: list[str],
        width: int = 860,
        height: int = 400,
    ) -> bytes:
        """배너 이미지를 생성하고 PNG bytes를 반환한다."""
        aspect = self._describe_aspect_ratio(width, height)
        prompt = self._build_banner_prompt(brand_name, category, style_keywords, aspect)
        return await self.generate_image(prompt)

    async def generate_product_image(
        self,
        product_name: str,
        brand_name: str,
        category: str,
        style_keywords: list[str],
    ) -> bytes:
        """상품 이미지를 생성하고 PNG bytes를 반환한다."""
        prompt = self._build_product_prompt(
            product_name, brand_name, category, style_keywords
        )
        return await self.generate_image(prompt)

    def _describe_aspect_ratio(self, width: int, height: int) -> str:
        """너비/높이로부터 프롬프트용 비율 설명을 생성한다."""
        ratio = width / height
        if ratio >= 2.0:
            return "ultra-wide landscape (approximately 2:1 ratio)"
        elif ratio >= 1.5:
            return "wide landscape (approximately 16:9 ratio)"
        elif ratio >= 1.2:
            return "landscape (approximately 4:3 ratio)"
        elif ratio >= 0.8:
            return "square (1:1 ratio)"
        elif ratio >= 0.6:
            return "portrait (approximately 3:4 ratio)"
        else:
            return "tall portrait (approximately 9:16 ratio)"

    def _build_banner_prompt(
        self, brand_name: str, category: str, keywords: list[str], aspect: str = ""
    ) -> str:
        category_styles = {
            "food": "warm lighting, appetizing, clean background, premium food photography",
            "fashion": "editorial style, high fashion, clean minimal background, luxury feel",
            "beauty": "soft lighting, elegant, pastel tones, luxury cosmetics photography",
        }
        base_style = category_styles.get(
            category, "professional, clean, modern"
        )
        keyword_str = ", ".join(keywords) if keywords else ""
        aspect_instruction = f" The image must be {aspect}." if aspect else ""
        return (
            f"Create a promotional banner image for {brand_name} ({category}). "
            f"Style: {base_style}, {keyword_str}.{aspect_instruction} "
            f"The image should be photorealistic, high quality, fill the entire frame, "
            f"and contain absolutely no text, letters, or watermarks."
        )

    def _build_product_prompt(
        self,
        product_name: str,
        brand_name: str,
        category: str,
        keywords: list[str],
    ) -> str:
        category_styles = {
            "food": "studio product shot, appetizing, white background, premium food styling",
            "fashion": "product photography, clean white background, luxury fashion item",
            "beauty": "cosmetics product shot, soft lighting, elegant white background",
        }
        base_style = category_styles.get(
            category,
            "professional product photography, clean white background",
        )
        keyword_str = ", ".join(keywords) if keywords else ""
        return (
            f"Create a square (1:1 ratio) product image of {product_name} by {brand_name}. "
            f"The product must be centered in a perfect square frame. "
            f"Style: {base_style}, {keyword_str}. "
            f"The image should be photorealistic, high quality, "
            f"and contain absolutely no text, letters, or watermarks."
        )
