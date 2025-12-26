"""initial schema

Revision ID: 207fb80d9a5d
Revises: 
Create Date: 2025-12-26 11:38:09.077984

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '207fb80d9a5d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create weather_readings table
    op.create_table(
        'weather_readings',
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('outdoor_temp_f', sa.Float(), nullable=True),
        sa.Column('feels_like_f', sa.Float(), nullable=True),
        sa.Column('dew_point_f', sa.Float(), nullable=True),
        sa.Column('wind_speed_mph', sa.Float(), nullable=True),
        sa.Column('wind_gust_mph', sa.Float(), nullable=True),
        sa.Column('max_daily_gust_mph', sa.Float(), nullable=True),
        sa.Column('wind_direction_deg', sa.Integer(), nullable=True),
        sa.Column('rain_rate_in_hr', sa.Float(), nullable=True),
        sa.Column('event_rain_in', sa.Float(), nullable=True),
        sa.Column('daily_rain_in', sa.Float(), nullable=True),
        sa.Column('weekly_rain_in', sa.Float(), nullable=True),
        sa.Column('monthly_rain_in', sa.Float(), nullable=True),
        sa.Column('yearly_rain_in', sa.Float(), nullable=True),
        sa.Column('total_rain_in', sa.Float(), nullable=True),
        sa.Column('relative_pressure_inhg', sa.Float(), nullable=True),
        sa.Column('absolute_pressure_inhg', sa.Float(), nullable=True),
        sa.Column('humidity_pct', sa.Integer(), nullable=True),
        sa.Column('uv_index', sa.Float(), nullable=True),
        sa.Column('solar_radiation_wm2', sa.Float(), nullable=True),
        sa.Column('indoor_temp_f', sa.Float(), nullable=True),
        sa.Column('indoor_humidity_pct', sa.Integer(), nullable=True),
        sa.Column('indoor_feels_like_f', sa.Float(), nullable=True),
        sa.Column('indoor_dew_point_f', sa.Float(), nullable=True),
        sa.Column('sensor1_temp_f', sa.Float(), nullable=True),
        sa.Column('sensor1_humidity_pct', sa.Integer(), nullable=True),
        sa.Column('sensor1_feels_like_f', sa.Float(), nullable=True),
        sa.Column('sensor1_dew_point_f', sa.Float(), nullable=True),
        sa.Column('outdoor_battery', sa.Integer(), nullable=True),
        sa.Column('sensor1_battery', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('timestamp')
    )

    # Create configuration table
    op.create_table(
        'configuration',
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('value', sa.String(length=1024), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )


def downgrade() -> None:
    op.drop_table('configuration')
    op.drop_table('weather_readings')
