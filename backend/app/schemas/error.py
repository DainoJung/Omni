from pydantic import BaseModel
from typing import Optional, List


class ErrorResponse(BaseModel):
    error: str
    message: str
    detail: Optional[str] = None


class ValidationErrorDetail(BaseModel):
    field: str
    message: str


class ValidationErrorResponse(BaseModel):
    error: str = "VALIDATION_ERROR"
    message: str = "입력 데이터가 올바르지 않습니다."
    fields: List[ValidationErrorDetail] = []
