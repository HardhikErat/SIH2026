from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    session_secret: str = "dev-only-change-me"
    api_cors_origins: str = "http://localhost:8081,http://localhost:19006,http://localhost:3000"

    llm_provider: str = "groq"
    groq_api_key: str = ""
    llm_model: str = "llama-3.1-8b-instant"
    llm_fallback_provider: str = "openrouter"
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"

    bhashini_api_key: str = ""
    bhashini_user_id: str = ""
    indic_whisper_url: str = ""
    asr_confidence_threshold: float = 0.6
    max_questions: int = 10

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def use_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


settings = Settings()
