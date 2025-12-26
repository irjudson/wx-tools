-- Run this manually in your PostgreSQL after creating weather_data database
-- CREATE DATABASE weather_data;

-- Connect to weather_data database, then run:
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- This will be created by alembic, but we'll convert it to hypertable after
-- SELECT create_hypertable('weather_readings', 'timestamp', if_not_exists => TRUE);

-- Indexes for analysis queries
CREATE INDEX IF NOT EXISTS idx_solar_radiation ON weather_readings(timestamp, solar_radiation_wm2);
CREATE INDEX IF NOT EXISTS idx_wind_speed ON weather_readings(timestamp, wind_speed_mph);
