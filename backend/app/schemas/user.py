"""User schemas for registration, profile, and usage"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)


class UserProfile(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    is_admin: bool
    plan: str = "free"
    credits_remaining: int = 5
    created_at: str


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)


class UsageResponse(BaseModel):
    plan: str
    credits_remaining: int
    credits_used: int
    total_projects: int
