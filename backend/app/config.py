"""
Application configuration loaded from environment variables.
Uses pydantic-settings for type-safe config management.
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Mobitel Legal Management System"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./legal_management.db"

    # Groq LLM (Primary)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Ollama (Fallback)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    USE_LOCAL_LLM: bool = False

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    # Document Storage
    UPLOAD_DIR: str = "./uploads" #

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # PII Protection
    ENABLE_PII_MASKING: bool = True
    BLOCK_PII_TO_EXTERNAL_LLM: bool = True

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Singleton settings instance
settings = Settings()
