"""JWT 인증 의존성"""

import jwt
from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, HTTPException, Header

from app.config import settings


@dataclass
class CurrentUser:
    user_id: str
    username: str
    is_admin: bool


async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    """Authorization: Bearer <token> 헤더에서 JWT를 디코딩하여 현재 사용자 반환"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization[7:]
    try:
        payload = jwt.decode(token, settings.AUTH_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    return CurrentUser(
        user_id=payload["sub"],
        username=payload["username"],
        is_admin=payload.get("is_admin", False),
    )


async def get_admin_user(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """관리자 권한 확인"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
