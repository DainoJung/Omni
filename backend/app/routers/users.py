"""User profile and usage router"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_supabase
from app.dependencies.auth import get_current_user, CurrentUser
from app.schemas.user import UserProfile, UserProfileUpdate, UsageResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: CurrentUser = Depends(get_current_user)):
    """현재 사용자 프로필 조회"""
    db = get_supabase()
    result = db.table("users").select("*").eq("id", current_user.user_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data
    return UserProfile(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        display_name=user.get("display_name"),
        is_admin=user.get("is_admin", False),
        plan=user.get("plan", "free"),
        credits_remaining=user.get("credits_remaining", 5),
        created_at=user["created_at"],
    )


@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    data: UserProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """현재 사용자 프로필 수정"""
    db = get_supabase()

    update_data = {}
    if data.display_name is not None:
        update_data["display_name"] = data.display_name
    if data.email is not None:
        # Check email uniqueness
        existing = (
            db.table("users")
            .select("id")
            .eq("email", data.email)
            .neq("id", current_user.user_id)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Email already in use")
        update_data["email"] = data.email

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("users")
        .update(update_data)
        .eq("id", current_user.user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Update failed")

    user = result.data[0]
    return UserProfile(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        display_name=user.get("display_name"),
        is_admin=user.get("is_admin", False),
        plan=user.get("plan", "free"),
        credits_remaining=user.get("credits_remaining", 5),
        created_at=user["created_at"],
    )


@router.get("/me/usage", response_model=UsageResponse)
async def get_my_usage(current_user: CurrentUser = Depends(get_current_user)):
    """현재 사용자 사용량 조회"""
    db = get_supabase()

    user_result = db.table("users").select("plan, credits_remaining").eq("id", current_user.user_id).maybe_single().execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    project_result = db.table("projects").select("id", count="exact").eq("user_id", current_user.user_id).execute()

    user = user_result.data
    plan = user.get("plan", "free")
    credits_remaining = user.get("credits_remaining", 5)

    # Calculate credits used based on plan defaults
    plan_credits = {"free": 5, "pro": 100, "enterprise": 9999}
    total_credits = plan_credits.get(plan, 5)
    credits_used = max(0, total_credits - credits_remaining)

    return UsageResponse(
        plan=plan,
        credits_remaining=credits_remaining,
        credits_used=credits_used,
        total_projects=project_result.count or 0,
    )
