import json
import re
from typing import Tuple, List, Optional

from google import genai
from google.genai import types

from app.config import settings
from app.schemas.generate import GeneratedTexts
from app.schemas.tone_manner import ToneMannerOption
from app.prompts.text_generation import SYSTEM_PROMPT

MAX_RETRIES = 2


def parse_gemini_response(raw_text: str) -> Tuple[GeneratedTexts, List[str]]:
    """Gemini 응답에서 JSON을 추출하고 검증한다."""

    # JSON 블록 추출
    json_match = re.search(r"```json\s*(.*?)\s*```", raw_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not json_match:
            raise ValueError("AI_RESPONSE_PARSE_ERROR: JSON을 찾을 수 없습니다.")
        json_str = json_match.group(0)

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI_RESPONSE_PARSE_ERROR: JSON 파싱 실패 - {e}")

    required_fields = [
        "main_copy",
        "sub_copy",
        "body_texts",
        "product_descriptions",
        "cta_text",
        "hashtags",
    ]
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise ValueError(f"AI_RESPONSE_PARSE_ERROR: 필수 필드 누락 - {missing}")

    warnings: List[str] = []
    if len(data["main_copy"]) > 20:
        warnings.append(f"main_copy가 {len(data['main_copy'])}자로 권장(15자) 초과")
    if len(data["sub_copy"]) > 40:
        warnings.append(f"sub_copy가 {len(data['sub_copy'])}자로 권장(30자) 초과")

    return GeneratedTexts(**data), warnings


class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_MODEL
        self.max_tokens = settings.GEMINI_MAX_TOKENS

    async def generate_text(self, prompt: str) -> Tuple[GeneratedTexts, dict]:
        """텍스트를 생성하고 (결과, 토큰 사용량)을 반환한다."""

        last_error = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        max_output_tokens=self.max_tokens,
                        temperature=0.7,
                        response_mime_type="application/json",
                    ),
                )

                raw = response.text
                result, warnings = parse_gemini_response(raw)

                token_usage = {
                    "input": getattr(response.usage_metadata, "prompt_token_count", 0) if response.usage_metadata else 0,
                    "output": getattr(response.usage_metadata, "candidates_token_count", 0) if response.usage_metadata else 0,
                }

                return result, token_usage

            except ValueError as e:
                last_error = e
                if attempt < MAX_RETRIES:
                    continue
                raise

            except Exception as e:
                raise RuntimeError(
                    f"AI_TEXT_GENERATION_FAILED: Gemini API 호출 실패 - {e}"
                )

        raise last_error  # type: ignore

    async def recommend_tone_manner(
        self,
        brand_name: str,
        category: Optional[str] = None,
        product_name: Optional[str] = None,
        color_preset_name: Optional[str] = None,
    ) -> List[ToneMannerOption]:
        """브랜드 정보를 기반으로 톤앤매너 3건을 추천한다."""

        color_context = f"\n컬러 테마: {color_preset_name}" if color_preset_name else ""
        product_context = f"\n상품명: {product_name}" if product_name else ""

        prompt = f"""마케팅 전문가로서 다음 브랜드에 적합한 톤앤매너를 3가지 추천하세요.

브랜드: {brand_name}
카테고리: {category or '미정'}{product_context}{color_context}

각 톤앤매너에 대해 다음 JSON 형식으로 응답하세요:

{{
  "recommendations": [
    {{
      "style": "스타일 이름 (4-6자, 예: 세련된 모던)",
      "mood": "분위기 키워드 (예: 고급스럽고 차분한)",
      "description": "이 톤앤매너의 특징 설명 (30자 이내)",
      "keywords": ["키워드1", "키워드2", "키워드3"]
    }}
  ]
}}

정확히 3개의 추천을 포함하세요."""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=1024,
                    temperature=0.8,
                    response_mime_type="application/json",
                ),
            )

            raw = response.text
            json_match = re.search(r"```json\s*(.*?)\s*```", raw, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r"\{.*\}", raw, re.DOTALL)
                if not json_match:
                    raise ValueError("톤앤매너 추천 JSON을 찾을 수 없습니다.")
                json_str = json_match.group(0)

            data = json.loads(json_str)
            recommendations = data.get("recommendations", [])

            return [ToneMannerOption(**r) for r in recommendations[:3]]

        except Exception as e:
            raise RuntimeError(f"AI_TONE_MANNER_FAILED: 톤앤매너 추천 실패 - {e}")
