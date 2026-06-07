import logging
from datetime import datetime
from typing import Dict, Any
from collections import defaultdict
from src.analysis.base import EnergyAnalyzer, AnalysisResult
from src.models import WeatherReading

logger = logging.getLogger(__name__)


class SolarAnalyzer(EnergyAnalyzer):
    """Solar energy potential analyzer"""

    @property
    def name(self) -> str:
        """Analyzer name"""
        return "solar"

    def get_config_schema(self) -> Dict[str, Any]:
        """Return JSON schema for configuration parameters"""
        return {
            "type": "object",
            "properties": {
                "panel_area_m2": {
                    "type": "number",
                    "description": "Solar panel area in square meters",
                    "default": 20,
                    "minimum": 0
                },
                "efficiency_pct": {
                    "type": "number",
                    "description": "Solar panel efficiency percentage (0-100)",
                    "default": 20,
                    "minimum": 0,
                    "maximum": 100
                },
                "tilt_loss_pct": {
                    "type": "number",
                    "description": "Energy loss due to tilt/orientation percentage (0-100)",
                    "default": 10,
                    "minimum": 0,
                    "maximum": 100
                },
                "electricity_cost_per_kwh": {
                    "type": "number",
                    "description": "Cost per kWh in local currency",
                    "default": 0.12,
                    "minimum": 0
                },
                "system_cost_per_m2": {
                    "type": "number",
                    "description": "Installed system cost per m² of panel area (USD)",
                    "default": 200,
                    "minimum": 0
                }
            },
            "required": []
        }

    def _calculate_kwh(
        self,
        solar_radiation: float,
        panel_area: float,
        efficiency: float,
        hours: float
    ) -> float:
        """Calculate kWh from solar radiation

        Formula: kWh = (solar_radiation_W/m² × panel_area_m² × efficiency × hours) / 1000

        Args:
            solar_radiation: Solar radiation in W/m²
            panel_area: Panel area in m²
            efficiency: Efficiency as decimal (0-1)
            hours: Time period in hours

        Returns:
            Energy in kWh
        """
        return (solar_radiation * panel_area * efficiency * hours) / 1000

    def analyze(
        self,
        start_date: datetime,
        end_date: datetime,
        config: Dict[str, Any],
        db
    ) -> AnalysisResult:
        """Run solar energy analysis

        Args:
            start_date: Analysis start date
            end_date: Analysis end date
            config: Configuration with panel_area_m2, efficiency_pct, etc.
            db: Database session

        Returns:
            AnalysisResult with solar energy calculations

        Raises:
            ValueError: If no solar radiation data found
        """
        logger.info(f"Running solar analysis from {start_date} to {end_date}")

        # Get configuration with defaults
        panel_area = config.get("panel_area_m2", 20)
        efficiency_pct = config.get("efficiency_pct", 20)
        tilt_loss_pct = config.get("tilt_loss_pct", 10)
        electricity_cost = config.get("electricity_cost_per_kwh", 0.12)
        system_cost_per_m2 = config.get("system_cost_per_m2", 200)

        # Calculate effective efficiency with tilt/orientation loss
        effective_efficiency = (efficiency_pct / 100) * (1 - (tilt_loss_pct / 100))

        # Query solar radiation data
        readings = db.query(WeatherReading).filter(
            WeatherReading.timestamp >= start_date,
            WeatherReading.timestamp <= end_date,
            WeatherReading.solar_radiation_wm2.isnot(None)
        ).order_by(WeatherReading.timestamp).all()

        if not readings:
            raise ValueError("No solar radiation data found for the specified date range")

        logger.info(f"Found {len(readings)} solar radiation readings")

        # Calculate kWh for each reading (assuming 5-minute intervals)
        hours_per_reading = 5 / 60
        total_kwh = 0.0
        daily_kwh = defaultdict(float)
        monthly_kwh = defaultdict(float)

        for reading in readings:
            if reading.solar_radiation_wm2 is not None:
                kwh = self._calculate_kwh(
                    reading.solar_radiation_wm2,
                    panel_area,
                    effective_efficiency,
                    hours_per_reading
                )
                total_kwh += kwh

                # Aggregate by day and month
                day_key = reading.timestamp.date().isoformat()
                month_key = reading.timestamp.strftime("%Y-%m")
                daily_kwh[day_key] += kwh
                monthly_kwh[month_key] += kwh

        # Round total to 2 decimal places
        total_kwh = round(total_kwh, 2)

        # Calculate daily average
        num_days = len(daily_kwh)
        daily_avg_kwh = round(total_kwh / num_days, 2) if num_days > 0 else 0.0

        # Create monthly breakdown
        monthly_breakdown = [
            {
                "month": month,
                "kwh": round(kwh, 2),
                "cost_savings": round(kwh * electricity_cost, 2)
            }
            for month, kwh in sorted(monthly_kwh.items())
        ]

        # Calculate annual estimate
        annual_estimate_kwh = round(daily_avg_kwh * 365, 2)
        annual_cost_savings = round(annual_estimate_kwh * electricity_cost, 2)

        # Calculate ROI
        system_cost = panel_area * system_cost_per_m2
        payback_years = round(system_cost / annual_cost_savings, 1) if annual_cost_savings > 0 else 0

        roi = {
            "annual_kwh": annual_estimate_kwh,
            "annual_cost_savings": annual_cost_savings,
            "estimated_system_cost": round(system_cost, 2),
            "payback_years": payback_years
        }

        # Additional data
        data = {
            "num_readings": len(readings),
            "num_days": num_days,
            "effective_efficiency_pct": round(effective_efficiency * 100, 2)
        }

        logger.info(f"Analysis complete: {total_kwh} kWh total, {daily_avg_kwh} kWh/day average")

        return AnalysisResult(
            analyzer_type=self.name,
            start_date=start_date,
            end_date=end_date,
            total_kwh=total_kwh,
            config=config,
            data=data,
            daily_avg_kwh=daily_avg_kwh,
            monthly_breakdown=monthly_breakdown,
            roi=roi
        )
