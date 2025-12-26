from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import logging
from src.config import get_settings

# Configure logging
settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Weather Station Service",
    description="Local weather data archival and analysis service",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "not_checked",
        "mqtt": "not_configured"
    }


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve main dashboard page"""
    return "<html><body><h1>Weather Station Service</h1></body></html>"
