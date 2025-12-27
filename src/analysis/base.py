from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, List
from pydantic import BaseModel


class AnalysisResult(BaseModel):
    """Base result structure for all analyzers"""
    analyzer_type: str
    start_date: datetime
    end_date: datetime
    total_kwh: float
    config: Dict[str, Any]
    data: Dict[str, Any]
    daily_avg_kwh: float = 0.0
    monthly_breakdown: List[Dict[str, Any]] = []
    roi: Dict[str, Any] = {}


class EnergyAnalyzer(ABC):
    """Base class for energy analysis modules"""

    @abstractmethod
    def analyze(
        self,
        start_date: datetime,
        end_date: datetime,
        config: Dict[str, Any],
        db
    ) -> AnalysisResult:
        """Run analysis and return results"""
        pass

    @abstractmethod
    def get_config_schema(self) -> Dict[str, Any]:
        """Return JSON schema for configuration parameters"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Analyzer name"""
        pass
