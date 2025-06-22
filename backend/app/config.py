from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # Server config
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()