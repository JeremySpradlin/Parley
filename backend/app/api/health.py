from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "0.1.0"

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow()
    )