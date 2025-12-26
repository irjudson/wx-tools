from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str
    station_passkey: str
    log_level: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
