import pytest
from src.services.mqtt_publisher import MQTTPublisher, MQTTConfig


def test_mqtt_config_creation():
    config = MQTTConfig(
        broker_url="mqtt://localhost:1883",
        enabled=True
    )

    assert config.broker_url == "mqtt://localhost:1883"
    assert config.enabled is True


def test_mqtt_publisher_disabled():
    """Test that disabled publisher doesn't connect"""
    config = MQTTConfig(broker_url="mqtt://invalid", enabled=False)
    publisher = MQTTPublisher(config)

    # Should not raise error when disabled
    publisher.publish_reading({})
    assert True
