# Weather Station Data Archival System

A comprehensive weather data collection, storage, and analysis system built with FastAPI, PostgreSQL, and TimescaleDB. This system ingests data from Ambient Weather stations, stores historical data, and provides real-time monitoring and analysis capabilities.

## Features

- **Real-time Data Ingestion**: HTTP endpoint for Ambient Weather station data
- **Time-series Storage**: PostgreSQL with TimescaleDB for efficient time-series data management
- **CSV Import**: Bulk import historical weather data from CSV files
- **Weather Analysis**: Automated analysis of weather patterns and trends
- **MQTT Publishing**: Real-time data publishing via MQTT protocol
- **Web Interface**: Interactive dashboard for monitoring and data visualization
- **RESTful API**: Comprehensive API for data access and management
- **Docker Deployment**: Containerized deployment with Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Ambient Weather station with network connectivity
- Station passkey from Ambient Weather dashboard

### 1. Clone the Repository

```bash
git clone <repository-url>
cd wx-tools
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
STATION_PASSKEY=your_station_passkey_here
DATABASE_URL=postgresql://postgres:password@db:5432/weather_data
LOG_LEVEL=INFO
```

### 3. Start Services

```bash
docker-compose up -d
```

This will start:
- Weather service API (port 8000)
- TimescaleDB database (port 5432)

### 4. Initialize Database

The database will be automatically created. To run migrations:

```bash
docker-compose exec weather-service alembic upgrade head
```

### 5. Access the Application

- Web Interface: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Database Setup

### Manual Database Setup (if not using docker-compose db service)

If you prefer to use an external PostgreSQL instance:

1. Install PostgreSQL with TimescaleDB extension
2. Create the database:

```sql
CREATE DATABASE weather_data;
\c weather_data
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

3. Update `DATABASE_URL` in `.env` to point to your database
4. Run migrations:

```bash
alembic upgrade head
```

### Database Schema

The system uses the following main table:

- `weather_data`: Time-series weather observations with TimescaleDB hypertable
  - Temperature, humidity, wind, rain, pressure
  - Solar radiation and UV index
  - Timestamps and station metadata

## Weather Station Configuration

### Ambient Weather Station Setup

1. Log in to your Ambient Weather dashboard
2. Go to **My Devices** → **Device Settings**
3. Find **Custom Server** settings
4. Configure:
   - **Protocol**: HTTP
   - **Server IP/Hostname**: `your-server-ip`
   - **Port**: `8000`
   - **Path**: `/api/weather/ingest`
   - **Interval**: `60` seconds (or your preference)
5. Save settings

### Passkey Configuration

The station passkey authenticates incoming data:

1. Find your passkey in Ambient Weather dashboard
2. Add to `.env` file:
   ```
   STATION_PASSKEY=your_passkey_here
   ```
3. Restart the service:
   ```bash
   docker-compose restart weather-service
   ```

### Test Data Ingestion

Send a test weather observation:

```bash
curl -X POST "http://localhost:8000/api/weather/ingest?PASSKEY=your_passkey" \
  -H "Content-Type: application/json" \
  -d '{
    "dateutc": 1703721600000,
    "tempf": 72.5,
    "humidity": 65,
    "windspeedmph": 5.2,
    "windgustmph": 8.1,
    "winddir": 180,
    "dailyrainin": 0.0,
    "baromrelin": 30.12,
    "solarradiation": 450.0,
    "uv": 3
  }'
```

## CSV Import

Import historical weather data from CSV files:

### CSV Format

CSV files should have the following columns:
```
dateutc,tempf,humidity,windspeedmph,windgustmph,winddir,dailyrainin,baromrelin,solarradiation,uv
```

Example:
```csv
dateutc,tempf,humidity,windspeedmph,windgustmph,winddir,dailyrainin,baromrelin,solarradiation,uv
2023-12-27 12:00:00,72.5,65,5.2,8.1,180,0.0,30.12,450.0,3
2023-12-27 12:01:00,72.6,64,5.5,8.3,185,0.0,30.13,455.0,3
```

### Import via API

```bash
curl -X POST "http://localhost:8000/api/weather/import" \
  -F "file=@weather_data.csv"
```

### Import via Script

```bash
docker-compose exec weather-service python scripts/import_csv.py /data/weather_data.csv
```

## Web Interface

The web interface provides:

- **Dashboard**: Real-time weather conditions and trends
- **Data Tables**: Browse historical observations
- **Charts**: Temperature, humidity, wind, and pressure visualizations
- **Statistics**: Daily, weekly, and monthly summaries
- **CSV Import**: Upload historical data files

Access at: http://localhost:8000

## API Documentation

### Interactive API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

#### Weather Data
- `POST /api/weather/ingest` - Ingest weather station data
- `GET /api/weather/latest` - Get latest observation
- `GET /api/weather/range` - Get data for time range
- `POST /api/weather/import` - Import CSV file

#### Analysis
- `POST /api/analysis/run` - Run weather analysis
- `GET /api/analysis/results` - Get analysis results
- `GET /api/analysis/summary` - Get analysis summary

#### Health & Metrics
- `GET /health` - Service health check
- `GET /api/metrics` - Database metrics

## Development Setup

### Local Development (without Docker)

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up database:
```bash
# Install PostgreSQL with TimescaleDB
# Create database
createdb weather_data
psql -d weather_data -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Run migrations:
```bash
alembic upgrade head
```

6. Start development server:
```bash
uvicorn src.main:app --reload
```

### Running Tests

```bash
# With pytest
pytest

# With coverage
pytest --cov=src --cov-report=html
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint code
flake8 src/ tests/

# Type checking
mypy src/
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `STATION_PASSKEY` | Weather station authentication key | Required |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | INFO |
| `MQTT_BROKER` | MQTT broker hostname | None (disabled) |
| `MQTT_PORT` | MQTT broker port | 1883 |
| `MQTT_TOPIC` | MQTT topic for publishing | weather/data |

### Docker Compose Configuration

Customize `docker-compose.yml` for your environment:

- Change database password
- Adjust port mappings
- Configure volume mounts
- Add additional services (MQTT broker, etc.)

## Monitoring

### Health Checks

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

### Database Metrics

```bash
curl http://localhost:8000/api/metrics
```

Returns:
- Total observation count
- Latest observation timestamp
- Database size
- Table statistics

### Logs

View service logs:
```bash
docker-compose logs -f weather-service
```

View database logs:
```bash
docker-compose logs -f db
```

## Troubleshooting

### Database Connection Issues

1. Check database is running:
   ```bash
   docker-compose ps
   ```

2. Verify connection string in `.env`

3. Test database connection:
   ```bash
   docker-compose exec db psql -U postgres -d weather_data -c "SELECT 1;"
   ```

### Station Not Sending Data

1. Verify passkey is correct
2. Check network connectivity from station to server
3. Review service logs for incoming requests
4. Ensure firewall allows port 8000

### CSV Import Failures

1. Verify CSV format matches expected columns
2. Check date format (ISO 8601 or Unix timestamp)
3. Ensure numeric values are valid
4. Review logs for specific error messages

## Architecture

```
┌─────────────────┐
│ Weather Station │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐     ┌──────────────┐
│  FastAPI App    │────▶│ TimescaleDB  │
│  (Port 8000)    │     │ (Port 5432)  │
└────────┬────────┘     └──────────────┘
         │
         ├─▶ Web Interface
         ├─▶ REST API
         └─▶ MQTT Publishing
```

## Data Flow

1. **Ingestion**: Weather station sends observations via HTTP
2. **Validation**: FastAPI validates data against schema
3. **Storage**: PostgreSQL/TimescaleDB stores time-series data
4. **Analysis**: Background tasks analyze weather patterns
5. **Distribution**: Data available via API, web UI, and MQTT

## Performance

- **Ingestion Rate**: Up to 100 observations/second
- **Query Performance**: Optimized time-series queries via TimescaleDB
- **Data Retention**: Configurable retention policies
- **Compression**: Automatic compression for historical data

## Security

- **Authentication**: Passkey-based station authentication
- **Input Validation**: Pydantic schema validation
- **SQL Injection**: Prevented via SQLAlchemy ORM
- **HTTPS**: Configure reverse proxy (nginx/traefik) for production

## Production Deployment

### Recommended Setup

1. Use reverse proxy (nginx/traefik) for HTTPS
2. Configure database backups
3. Set up monitoring (Prometheus/Grafana)
4. Use environment-specific `.env` files
5. Enable database connection pooling
6. Configure log aggregation

### Example nginx Configuration

```nginx
server {
    listen 80;
    server_name weather.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API docs at `/docs`

## Changelog

### Version 1.0.0
- Initial release
- Weather data ingestion
- CSV import functionality
- Web interface
- REST API
- MQTT publishing
- Docker deployment
