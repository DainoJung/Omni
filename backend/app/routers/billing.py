from fastapi import APIRouter, Depends

from app.database import get_supabase
from app.dependencies.auth import get_current_user, CurrentUser

router = APIRouter()

PLANS = [
    {
        "id": "free",
        "name": "Free",
        "price": 0,
        "credits": 5,
        "features": ["5 page generations", "Basic templates", "PNG export"],
    },
    {
        "id": "pro",
        "name": "Pro",
        "price": 29,
        "credits": 100,
        "features": [
            "100 page generations/month",
            "All templates",
            "PNG/JPG export",
            "Marketplace presets",
            "Priority support",
        ],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price": -1,  # Custom pricing
        "credits": -1,  # Unlimited
        "features": [
            "Unlimited generations",
            "Custom templates",
            "API access",
            "Dedicated support",
            "Custom branding",
        ],
    },
]


@router.get("/plans")
async def list_plans():
    """Available billing plans (hardcoded for MVP)."""
    return {"plans": PLANS}


@router.get("/status")
async def billing_status(current_user: CurrentUser = Depends(get_current_user)):
    """Current user billing status."""
    db = get_supabase()
    user = (
        db.table("users")
        .select("plan, credits_remaining")
        .eq("id", current_user.user_id)
        .single()
        .execute()
    )
    if not user.data:
        return {"plan": "free", "credits_remaining": 0}

    plan_info = next(
        (p for p in PLANS if p["id"] == user.data.get("plan", "free")), PLANS[0]
    )
    return {
        "plan": user.data.get("plan", "free"),
        "plan_name": plan_info["name"],
        "credits_remaining": user.data.get("credits_remaining", 0),
        "features": plan_info["features"],
    }


async def deduct_credit(user_id: str) -> bool:
    """Deduct one credit from user. Returns True if successful, False if no credits."""
    db = get_supabase()
    user = (
        db.table("users")
        .select("credits_remaining, plan")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user.data:
        return False

    # Enterprise plan has unlimited credits
    if user.data.get("plan") == "enterprise":
        return True

    remaining = user.data.get("credits_remaining", 0)
    if remaining <= 0:
        return False

    db.table("users").update({"credits_remaining": remaining - 1}).eq(
        "id", user_id
    ).execute()
    return True
