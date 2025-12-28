import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import Configuration
from src.services.config import get_timezone, set_timezone


@pytest.fixture
def test_db():
    """Create in-memory test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_get_timezone_default(test_db):
    """Test getting timezone when not set returns UTC"""
    result = get_timezone(test_db)
    assert result == "UTC"


def test_get_timezone_set_value(test_db):
    """Test getting timezone when set"""
    # Set timezone
    config = Configuration(key="display.timezone", value="America/Chicago")
    test_db.add(config)
    test_db.commit()

    result = get_timezone(test_db)
    assert result == "America/Chicago"


def test_set_timezone_valid(test_db):
    """Test setting valid timezone"""
    set_timezone(test_db, "America/Los_Angeles")

    result = get_timezone(test_db)
    assert result == "America/Los_Angeles"


def test_set_timezone_invalid(test_db):
    """Test setting invalid timezone raises ValueError"""
    with pytest.raises(ValueError, match="Invalid timezone"):
        set_timezone(test_db, "Invalid/Timezone")
