"""인증 라우터: JWT 기반 다중 계정 시스템"""

import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.config import settings
from app.database import get_supabase
from app.dependencies.auth import get_current_user, get_admin_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------- Schemas ----------

class LoginRequest(BaseModel):
    id: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: Optional[str] = None
    user: Optional[dict] = None


class VerifyResponse(BaseModel):
    valid: bool
    user: Optional[dict] = None


class CreateUserRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None
    is_admin: bool = False


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    is_admin: bool
    created_at: str


# ---------- Helpers ----------

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _create_jwt(user_id: str, username: str, is_admin: bool) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.AUTH_SECRET, algorithm="HS256")


# ---------- Routes ----------

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """로그인 - DB에서 유저 조회 → JWT 반환"""
    db = get_supabase()
    pw_hash = _hash_password(request.password)

    result = db.table("users").select("*").eq("username", request.id).maybe_single().execute()
    if not result.data:
        return LoginResponse(success=False, message="아이디 또는 비밀번호가 올바르지 않습니다.")

    user = result.data
    if user["password_hash"] != pw_hash:
        return LoginResponse(success=False, message="아이디 또는 비밀번호가 올바르지 않습니다.")

    token = _create_jwt(user["id"], user["username"], user["is_admin"])

    return LoginResponse(
        success=True,
        token=token,
        user={
            "id": user["id"],
            "username": user["username"],
            "display_name": user.get("display_name"),
            "is_admin": user["is_admin"],
        },
    )


@router.post("/verify", response_model=VerifyResponse)
async def verify(current_user: CurrentUser = Depends(get_current_user)):
    """Authorization 헤더의 JWT 유효성 검증"""
    return VerifyResponse(
        valid=True,
        user={
            "id": current_user.user_id,
            "username": current_user.username,
            "is_admin": current_user.is_admin,
        },
    )


@router.post("/logout")
async def logout():
    """로그아웃 - JWT는 클라이언트가 폐기"""
    return {"success": True}


# ---------- User Management (Admin only) ----------

@router.post("/users", response_model=UserResponse)
async def create_user(
    data: CreateUserRequest,
    admin: CurrentUser = Depends(get_admin_user),
):
    """관리자 전용: 새 계정 생성"""
    db = get_supabase()

    # 중복 체크
    existing = db.table("users").select("id").eq("username", data.username).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="이미 존재하는 아이디입니다.")

    insert_data = {
        "username": data.username,
        "password_hash": _hash_password(data.password),
        "display_name": data.display_name or data.username,
        "is_admin": data.is_admin,
    }
    result = db.table("users").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="계정 생성 실패")

    user = result.data[0]
    return UserResponse(
        id=user["id"],
        username=user["username"],
        display_name=user.get("display_name"),
        is_admin=user["is_admin"],
        created_at=user["created_at"],
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(admin: CurrentUser = Depends(get_admin_user)):
    """관리자 전용: 계정 목록"""
    db = get_supabase()
    result = db.table("users").select("*").order("created_at").execute()
    return [
        UserResponse(
            id=u["id"],
            username=u["username"],
            display_name=u.get("display_name"),
            is_admin=u["is_admin"],
            created_at=u["created_at"],
        )
        for u in (result.data or [])
    ]


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: CurrentUser = Depends(get_admin_user)):
    """관리자 전용: 계정 삭제"""
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="자기 자신은 삭제할 수 없습니다.")
    db = get_supabase()
    db.table("users").delete().eq("id", user_id).execute()


# ---------- Admin Seed ----------

async def seed_admin_user():
    """서버 시작 시 users 테이블이 비어있으면 기본 admin 계정 생성"""
    db = get_supabase()

    existing = db.table("users").select("id").limit(1).execute()
    if existing.data:
        logger.info("Users table already has entries, skipping seed.")
        return

    admin_data = {
        "username": "admin",
        "password_hash": _hash_password(settings.ADMIN_DEFAULT_PASSWORD),
        "display_name": "관리자",
        "is_admin": True,
    }
    result = db.table("users").insert(admin_data).execute()
    if not result.data:
        logger.error("Failed to seed admin user")
        return

    admin_id = result.data[0]["id"]
    logger.info(f"Seeded admin user: {admin_id}")

    # 기존 프로젝트에 admin user_id 할당
    db.table("projects").update({"user_id": admin_id}).is_("user_id", "null").execute()
    logger.info("Assigned existing projects to admin user.")
