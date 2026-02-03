"""인증 라우터: 간단한 ID/PW 로그인"""

import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()

# 간단한 토큰 저장소 (메모리 기반, 서버 재시작 시 초기화)
_tokens: dict[str, datetime] = {}
TOKEN_EXPIRY_HOURS = 24


class LoginRequest(BaseModel):
    id: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    token: str | None = None
    message: str | None = None


class VerifyRequest(BaseModel):
    token: str


class VerifyResponse(BaseModel):
    valid: bool


def _generate_token() -> str:
    """안전한 랜덤 토큰 생성"""
    return secrets.token_urlsafe(32)


def _cleanup_expired_tokens():
    """만료된 토큰 정리"""
    now = datetime.now()
    expired = [t for t, exp in _tokens.items() if exp < now]
    for t in expired:
        del _tokens[t]


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """로그인 - 성공 시 토큰 반환"""
    _cleanup_expired_tokens()

    if request.id == settings.AUTH_ID and request.password == settings.AUTH_PW:
        token = _generate_token()
        _tokens[token] = datetime.now() + timedelta(hours=TOKEN_EXPIRY_HOURS)
        return LoginResponse(success=True, token=token)

    return LoginResponse(success=False, message="아이디 또는 비밀번호가 올바르지 않습니다.")


@router.post("/verify", response_model=VerifyResponse)
async def verify(request: VerifyRequest):
    """토큰 유효성 검증"""
    _cleanup_expired_tokens()

    if request.token in _tokens:
        return VerifyResponse(valid=True)

    return VerifyResponse(valid=False)


@router.post("/logout")
async def logout(request: VerifyRequest):
    """로그아웃 - 토큰 삭제"""
    if request.token in _tokens:
        del _tokens[request.token]
    return {"success": True}
