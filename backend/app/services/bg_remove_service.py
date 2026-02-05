"""AWS Bedrock Nova Canvas 배경 제거 서비스"""

import base64
import json
import logging
from urllib.parse import quote

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def remove_background(image_bytes: bytes, *, raise_on_error: bool = False) -> bytes:
    """Nova Canvas BACKGROUND_REMOVAL로 배경을 제거한다.

    Args:
        image_bytes: 원본 이미지 바이트
        raise_on_error: True이면 실패 시 예외를 그대로 전파한다.

    Returns:
        배경 제거된 이미지 바이트. 실패 시 원본 반환(raise_on_error=False).
    """
    try:
        input_b64 = base64.b64encode(image_bytes).decode("utf-8")

        body = {
            "taskType": "BACKGROUND_REMOVAL",
            "backgroundRemovalParams": {
                "image": input_b64,
            },
        }

        model_id = quote(settings.BEDROCK_BG_MODEL, safe="")
        url = f"https://bedrock-runtime.{settings.AWS_REGION}.amazonaws.com/model/{model_id}/invoke"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {settings.AWS_BEARER_TOKEN_BEDROCK}",
                },
            )
            if response.status_code != 200:
                logger.error(f"Bedrock 응답 {response.status_code}: {response.text}")
                response.raise_for_status()

        result = response.json()
        output_b64 = result["images"][0]
        output_bytes = base64.b64decode(output_b64)

        logger.info(f"배경 제거 완료: {len(image_bytes)} → {len(output_bytes)} bytes")
        return output_bytes

    except Exception as e:
        logger.warning(f"배경 제거 실패: {e}")
        if raise_on_error:
            raise
        return image_bytes
