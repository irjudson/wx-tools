import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from src.models import Configuration

logger = logging.getLogger(__name__)


def get_config_value(db: Session, key: str, default: Optional[str] = None) -> Optional[str]:
    """Get a single configuration value from the database

    Args:
        db: Database session
        key: Configuration key
        default: Default value if key not found

    Returns:
        Configuration value or default if not found
    """
    config = db.query(Configuration).filter(Configuration.key == key).first()
    return config.value if config else default


def set_config_value(db: Session, key: str, value: str) -> None:
    """Set a single configuration value in the database

    Args:
        db: Database session
        key: Configuration key
        value: Configuration value
    """
    config = db.query(Configuration).filter(Configuration.key == key).first()

    if config:
        config.value = value
    else:
        config = Configuration(key=key, value=value)
        db.add(config)

    db.commit()
    logger.info(f"Set config {key} = {value}")


def get_mqtt_config(db: Session) -> Dict[str, Any]:
    """Get MQTT configuration from database

    Args:
        db: Database session

    Returns:
        Dictionary with MQTT configuration (broker_url, username, password, enabled)
    """
    return {
        "broker_url": get_config_value(db, "mqtt.broker_url", "mqtt://localhost:1883"),
        "username": get_config_value(db, "mqtt.username"),
        "password": get_config_value(db, "mqtt.password"),
        "enabled": get_config_value(db, "mqtt.enabled", "false") == "true"
    }


def set_mqtt_config(db: Session, config: Dict[str, Any]) -> None:
    """Set MQTT configuration in database

    Args:
        db: Database session
        config: Dictionary with MQTT configuration
    """
    if "broker_url" in config:
        set_config_value(db, "mqtt.broker_url", config["broker_url"])

    if "username" in config:
        set_config_value(db, "mqtt.username", config["username"] or "")

    if "password" in config:
        set_config_value(db, "mqtt.password", config["password"] or "")

    if "enabled" in config:
        set_config_value(db, "mqtt.enabled", "true" if config["enabled"] else "false")

    logger.info("Updated MQTT configuration")
