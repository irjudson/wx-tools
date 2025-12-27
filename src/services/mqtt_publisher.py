import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from urllib.parse import urlparse

import paho.mqtt.client as mqtt
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class MQTTConfig(BaseModel):
    """Configuration for MQTT publisher"""
    broker_url: str = Field(..., description="MQTT broker URL (e.g., mqtt://localhost:1883)")
    username: Optional[str] = Field(None, description="MQTT username")
    password: Optional[str] = Field(None, description="MQTT password")
    enabled: bool = Field(default=False, description="Whether MQTT publishing is enabled")


class MQTTPublisher:
    """Publishes weather readings to MQTT broker"""

    def __init__(self, config: MQTTConfig):
        """Initialize MQTT publisher

        Args:
            config: MQTT configuration
        """
        self.config = config
        self.client: Optional[mqtt.Client] = None
        self.connected = False

        if self.config.enabled:
            self._connect()

    def _connect(self):
        """Connect to MQTT broker"""
        try:
            # Parse broker URL
            parsed = urlparse(self.config.broker_url)
            host = parsed.hostname or "localhost"
            port = parsed.port or 1883

            # Create MQTT client
            self.client = mqtt.Client()
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect

            # Set credentials if provided
            if self.config.username and self.config.password:
                self.client.username_pw_set(self.config.username, self.config.password)

            # Connect to broker
            logger.info(f"Connecting to MQTT broker at {host}:{port}")
            self.client.connect(host, port, keepalive=60)
            self.client.loop_start()

        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            self.client = None
            self.connected = False

    def _on_connect(self, client, userdata, flags, rc):
        """Callback for when client connects to broker

        Args:
            client: MQTT client instance
            userdata: User data
            flags: Connection flags
            rc: Connection result code
        """
        if rc == 0:
            logger.info("Connected to MQTT broker")
            self.connected = True
        else:
            logger.error(f"Failed to connect to MQTT broker with code: {rc}")
            self.connected = False

    def _on_disconnect(self, client, userdata, rc):
        """Callback for when client disconnects from broker

        Args:
            client: MQTT client instance
            userdata: User data
            rc: Disconnection result code
        """
        logger.warning(f"Disconnected from MQTT broker with code: {rc}")
        self.connected = False

    def publish_reading(self, reading: Dict[str, Any]):
        """Publish weather reading to MQTT topics

        Publishes individual metrics to separate topics (e.g., weather/outdoor_temp)
        and full reading as JSON to weather/json topic.

        Args:
            reading: Dictionary containing weather reading data
        """
        if not self.config.enabled or not self.connected or not self.client:
            logger.debug("MQTT publishing disabled or not connected")
            return

        try:
            # Publish individual metrics
            for key, value in reading.items():
                # Skip None values and internal fields
                if value is None or key.startswith('_'):
                    continue

                # Convert datetime to string
                if isinstance(value, datetime):
                    value = value.isoformat()

                topic = f"weather/{key}"
                self.client.publish(topic, str(value), qos=1, retain=True)
                logger.debug(f"Published to {topic}: {value}")

            # Publish full JSON
            json_reading = {}
            for key, value in reading.items():
                if value is None or key.startswith('_'):
                    continue
                if isinstance(value, datetime):
                    value = value.isoformat()
                json_reading[key] = value

            json_payload = json.dumps(json_reading)
            self.client.publish("weather/json", json_payload, qos=1, retain=True)
            logger.debug(f"Published full JSON reading to weather/json")

        except Exception as e:
            logger.error(f"Failed to publish reading to MQTT: {e}")

    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            logger.info("Disconnecting from MQTT broker")
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
