import logging
from datetime import datetime
from typing import Dict, Any
from collections import defaultdict
from src.analysis.base import EnergyAnalyzer, AnalysisResult
from src.models import WeatherReading

logger = logging.getLogger(__name__)

# Turbine power curves: wind_speed_mph -> power_kW
TURBINE_POWER_CURVES = {
    "generic_5kw": {
        "cut_in_mph": 6.7,      # ~3 m/s
        "rated_mph": 31.0,      # ~14 m/s (max power)
        "cut_out_mph": 55.9,    # ~25 m/s (shutdown)
        "rated_power_kw": 5.0,
        "power_curve": {
            # mph: kW
            0: 0.0,
            6.7: 0.0,    # cut-in
            9.0: 0.5,
            11.2: 1.0,
            13.4: 1.8,
            15.7: 2.8,
            17.9: 3.5,
            20.1: 4.2,
            22.4: 4.6,
            24.6: 4.9,
            26.8: 5.0,
            31.0: 5.0,   # rated
            55.9: 5.0,   # cut-out
            56.0: 0.0,   # shutdown
            100.0: 0.0
        }
    }
}


class WindAnalyzer(EnergyAnalyzer):
    """Wind energy potential analyzer"""

    @property
    def name(self) -> str:
        """Analyzer name"""
        return "wind"

    def get_config_schema(self) -> Dict[str, Any]:
        """Return JSON schema for configuration parameters"""
        return {
            "type": "object",
            "properties": {
                "turbine_model": {
                    "type": "string",
                    "description": "Wind turbine model",
                    "default": "generic_5kw",
                    "enum": list(TURBINE_POWER_CURVES.keys())
                },
                "hub_height_m": {
                    "type": "number",
                    "description": "Turbine hub height in meters",
                    "default": 10,
                    "minimum": 1
                },
                "measurement_height_m": {
                    "type": "number",
                    "description": "Height of weather station anemometer in meters",
                    "default": 2,
                    "minimum": 0.1
                },
                "electricity_cost_per_kwh": {
                    "type": "number",
                    "description": "Cost per kWh in local currency",
                    "default": 0.12,
                    "minimum": 0
                }
            },
            "required": []
        }

    def _adjust_wind_speed_for_height(
        self,
        wind_speed_mph: float,
        measurement_height: float,
        hub_height: float
    ) -> float:
        """Adjust wind speed from measurement height to hub height using power law

        Formula: v2 = v1 × (h2/h1)^α where α ≈ 0.14 (power law exponent)

        Args:
            wind_speed_mph: Wind speed at measurement height (mph)
            measurement_height: Height of anemometer (meters)
            hub_height: Height of turbine hub (meters)

        Returns:
            Adjusted wind speed at hub height (mph)
        """
        alpha = 0.14  # power law exponent for wind shear
        height_ratio = hub_height / measurement_height
        adjusted_speed = wind_speed_mph * (height_ratio ** alpha)
        return adjusted_speed

    def _get_turbine_power(
        self,
        wind_speed_mph: float,
        turbine_model: str
    ) -> float:
        """Get turbine power output for given wind speed using power curve

        Uses linear interpolation between power curve points

        Args:
            wind_speed_mph: Wind speed at hub height (mph)
            turbine_model: Turbine model identifier

        Returns:
            Power output in kW
        """
        if turbine_model not in TURBINE_POWER_CURVES:
            raise ValueError(f"Unknown turbine model: {turbine_model}")

        curve = TURBINE_POWER_CURVES[turbine_model]
        power_curve = curve["power_curve"]

        # Get sorted wind speeds from power curve
        speeds = sorted(power_curve.keys())

        # Find surrounding points for interpolation
        if wind_speed_mph <= speeds[0]:
            return power_curve[speeds[0]]
        if wind_speed_mph >= speeds[-1]:
            return power_curve[speeds[-1]]

        # Linear interpolation
        for i in range(len(speeds) - 1):
            if speeds[i] <= wind_speed_mph <= speeds[i + 1]:
                # Interpolate between speeds[i] and speeds[i+1]
                x0, x1 = speeds[i], speeds[i + 1]
                y0, y1 = power_curve[x0], power_curve[x1]

                # Linear interpolation formula
                power = y0 + (y1 - y0) * (wind_speed_mph - x0) / (x1 - x0)
                return power

        return 0.0

    def analyze(
        self,
        start_date: datetime,
        end_date: datetime,
        config: Dict[str, Any],
        db
    ) -> AnalysisResult:
        """Run wind energy analysis

        Args:
            start_date: Analysis start date
            end_date: Analysis end date
            config: Configuration with turbine_model, hub_height_m, etc.
            db: Database session

        Returns:
            AnalysisResult with wind energy calculations

        Raises:
            ValueError: If no wind speed data found
        """
        logger.info(f"Running wind analysis from {start_date} to {end_date}")

        # Get configuration with defaults
        turbine_model = config.get("turbine_model", "generic_5kw")
        hub_height = config.get("hub_height_m", 10)
        measurement_height = config.get("measurement_height_m", 2)
        electricity_cost = config.get("electricity_cost_per_kwh", 0.12)

        # Query wind speed data
        readings = db.query(WeatherReading).filter(
            WeatherReading.timestamp >= start_date,
            WeatherReading.timestamp <= end_date,
            WeatherReading.wind_speed_mph.isnot(None)
        ).order_by(WeatherReading.timestamp).all()

        if not readings:
            raise ValueError("No wind speed data found for the specified date range")

        logger.info(f"Found {len(readings)} wind speed readings")

        # Calculate kWh for each reading (assuming 5-minute intervals)
        hours_per_reading = 5 / 60
        total_kwh = 0.0
        daily_kwh = defaultdict(float)
        monthly_kwh = defaultdict(float)

        # Track wind speed distribution and operational stats
        wind_speed_distribution = defaultdict(int)
        total_power_kw = 0.0
        operational_hours = 0.0

        turbine_curve = TURBINE_POWER_CURVES[turbine_model]
        cut_in_speed = turbine_curve["cut_in_mph"]

        for reading in readings:
            if reading.wind_speed_mph is not None:
                # Adjust wind speed to hub height
                adjusted_speed = self._adjust_wind_speed_for_height(
                    reading.wind_speed_mph,
                    measurement_height,
                    hub_height
                )

                # Get power output from turbine power curve
                power_kw = self._get_turbine_power(adjusted_speed, turbine_model)

                # Calculate kWh for this interval
                kwh = power_kw * hours_per_reading
                total_kwh += kwh
                total_power_kw += power_kw

                # Track operational hours (when turbine is generating)
                if adjusted_speed >= cut_in_speed:
                    operational_hours += hours_per_reading

                # Aggregate by day and month
                day_key = reading.timestamp.date().isoformat()
                month_key = reading.timestamp.strftime("%Y-%m")
                daily_kwh[day_key] += kwh
                monthly_kwh[month_key] += kwh

                # Track wind speed distribution (in 2 mph bins)
                speed_bin = int(adjusted_speed / 2) * 2
                wind_speed_distribution[speed_bin] += 1

        # Round total to 2 decimal places
        total_kwh = round(total_kwh, 2)

        # Calculate daily average
        num_days = len(daily_kwh)
        daily_avg_kwh = round(total_kwh / num_days, 2) if num_days > 0 else 0.0

        # Calculate capacity factor
        # Capacity factor = (actual energy / theoretical max energy) × 100
        rated_power_kw = turbine_curve["rated_power_kw"]
        total_hours = len(readings) * hours_per_reading
        max_possible_kwh = rated_power_kw * total_hours
        capacity_factor = round((total_kwh / max_possible_kwh * 100), 2) if max_possible_kwh > 0 else 0.0

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
        # Typical small wind turbine costs: $3,000-$8,000/kW installed
        # Using $5,000/kW as mid-range estimate
        cost_per_kw = 5000
        system_cost = rated_power_kw * cost_per_kw
        payback_years = round(system_cost / annual_cost_savings, 1) if annual_cost_savings > 0 else 0

        roi = {
            "annual_kwh": annual_estimate_kwh,
            "annual_cost_savings": annual_cost_savings,
            "estimated_system_cost": round(system_cost, 2),
            "payback_years": payback_years
        }

        # Additional data
        avg_power_kw = round(total_power_kw / len(readings), 2) if len(readings) > 0 else 0.0

        # Format wind speed distribution
        speed_distribution = [
            {
                "speed_range_mph": f"{speed}-{speed+2}",
                "count": count,
                "percentage": round(count / len(readings) * 100, 1)
            }
            for speed, count in sorted(wind_speed_distribution.items())
        ]

        data = {
            "num_readings": len(readings),
            "num_days": num_days,
            "turbine_model": turbine_model,
            "hub_height_m": hub_height,
            "measurement_height_m": measurement_height,
            "rated_power_kw": rated_power_kw,
            "capacity_factor_pct": capacity_factor,
            "operational_hours": round(operational_hours, 2),
            "avg_power_kw": avg_power_kw,
            "wind_speed_distribution": speed_distribution
        }

        logger.info(f"Analysis complete: {total_kwh} kWh total, {daily_avg_kwh} kWh/day average, {capacity_factor}% capacity factor")

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
