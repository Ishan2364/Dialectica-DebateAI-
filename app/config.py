import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    LOG_DIR: str = "logs"
    MAX_ROUNDS: int = 8
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    LOG_LEVEL: str = "INFO"  # <--- This line MUST be here

    class Config:
        env_file = ".env"
        extra = "ignore"     # <--- This handles any other surprise variables

settings = Settings()
os.makedirs(settings.LOG_DIR, exist_ok=True)