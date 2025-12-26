from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.models import WeatherReading


def get_latest_reading(db: Session) -> Optional[WeatherReading]:
    """Get the most recent weather reading"""
    return db.query(WeatherReading).order_by(
        WeatherReading.timestamp.desc()
    ).first()


def get_readings(
    db: Session,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: Optional[int] = 1000,
    offset: Optional[int] = 0
) -> List[WeatherReading]:
    """Query weather readings with optional filters

    Returns readings ordered by timestamp descending (newest first).
    """
    query = db.query(WeatherReading)

    if start:
        query = query.filter(WeatherReading.timestamp >= start)
    if end:
        query = query.filter(WeatherReading.timestamp <= end)

    return query.order_by(WeatherReading.timestamp.desc()).offset(offset).limit(limit).all()


def get_database_stats(db: Session) -> dict:
    """Get database statistics"""
    total = db.query(func.count(WeatherReading.timestamp)).scalar()
    first = db.query(func.min(WeatherReading.timestamp)).scalar()
    last = db.query(func.max(WeatherReading.timestamp)).scalar()

    coverage_days = 0
    if first and last:
        coverage_days = (last - first).days

    return {
        "total_readings": total or 0,
        "first_reading": first.isoformat() if first else None,
        "last_reading": last.isoformat() if last else None,
        "coverage_days": coverage_days
    }
