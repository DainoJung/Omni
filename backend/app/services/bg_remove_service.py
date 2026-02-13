"""AWS Bedrock Nova Canvas 배경 제거 서비스"""

import base64
import io
import logging
from urllib.parse import quote

import httpx
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# Bedrock Nova Canvas 이미지 크기 제한
MIN_DIMENSION = 320
MAX_DIMENSION = 4096


def _center_subject(image_bytes: bytes) -> bytes:
    """투명 배경을 트림하고 피사체를 원본 크기 캔버스 정중앙에 배치한다."""
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # 알파 채널에서 불투명 영역(피사체)의 바운딩 박스를 구한다
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        # 전체가 투명이면 원본 그대로 반환
        return image_bytes

    # 피사체 크롭
    subject = img.crop(bbox)
    sw, sh = subject.size
    cw, ch = img.size

    # 원본 캔버스 크기에 피사체를 정중앙 배치
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    offset_x = (cw - sw) // 2
    offset_y = (ch - sh) // 2
    canvas.paste(subject, (offset_x, offset_y), subject)

    output = io.BytesIO()
    canvas.save(output, format="PNG")
    logger.info(f"피사체 중앙 정렬: bbox={bbox}, subject={sw}x{sh}, canvas={cw}x{ch}")
    return output.getvalue()


def _ensure_valid_dimensions(image_bytes: bytes) -> bytes:
    """이미지 크기가 Bedrock 요구사항(320-4096px)을 충족하는지 확인하고 필요시 리사이징."""
    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size

    # 이미 유효한 크기면 원본 반환
    if MIN_DIMENSION <= width <= MAX_DIMENSION and MIN_DIMENSION <= height <= MAX_DIMENSION:
        return image_bytes

    # 리사이징 필요
    new_width, new_height = width, height

    # 너무 작은 경우: 최소 크기로 업스케일
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        scale = max(MIN_DIMENSION / width, MIN_DIMENSION / height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        logger.info(f"이미지 업스케일: {width}x{height} → {new_width}x{new_height}")

    # 너무 큰 경우: 최대 크기로 다운스케일
    if new_width > MAX_DIMENSION or new_height > MAX_DIMENSION:
        scale = min(MAX_DIMENSION / new_width, MAX_DIMENSION / new_height)
        new_width = int(new_width * scale)
        new_height = int(new_height * scale)
        logger.info(f"이미지 다운스케일: {width}x{height} → {new_width}x{new_height}")

    # 리사이징 수행
    resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # PNG로 저장 (투명도 유지)
    output = io.BytesIO()
    if resized.mode in ('RGBA', 'LA') or (resized.mode == 'P' and 'transparency' in resized.info):
        resized.save(output, format='PNG')
    else:
        resized.save(output, format='PNG')

    return output.getvalue()


async def remove_background(image_bytes: bytes, *, raise_on_error: bool = False) -> bytes:
    """Nova Canvas BACKGROUND_REMOVAL로 배경을 제거한다.

    Args:
        image_bytes: 원본 이미지 바이트
        raise_on_error: True이면 실패 시 예외를 그대로 전파한다.

    Returns:
        배경 제거된 이미지 바이트. 실패 시 원본 반환(raise_on_error=False).
    """
    try:
        # 이미지 크기 검증 및 리사이징
        processed_bytes = _ensure_valid_dimensions(image_bytes)
        input_b64 = base64.b64encode(processed_bytes).decode("utf-8")

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

        # 피사체를 정중앙에 배치
        output_bytes = _center_subject(output_bytes)

        logger.info(f"배경 제거 완료: {len(image_bytes)} → {len(output_bytes)} bytes")
        return output_bytes

    except Exception as e:
        logger.warning(f"배경 제거 실패: {e}")
        if raise_on_error:
            raise
        return image_bytes
