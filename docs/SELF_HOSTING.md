# Self-Hosting Specter

This guide covers deploying Specter on your own infrastructure.

## Quick Start (Docker Compose)

The fastest way to run Specter is with Docker Compose. This gives you the API server, PostgreSQL, and Redis in one command.

### Prerequisites

- Docker and Docker Compose installed
- Git

### Steps

```bash
# Clone the repository
git clone https://github.com/lixeron/Project_Specter.git
cd Project_Specter

# Create your environment file
cp .env.example .env

# Edit .env with your settings (at minimum, change SECRET_KEY)
# For PostgreSQL via Docker Compose:
#   DATABASE_URL=postgresql+asyncpg://specter:specter_dev@postgres:5432/specter

# Start everything
docker compose up -d

# Check health
curl http://localhost:8000/api/v1/health
```

The API will be available at `http://localhost:8000` with Swagger docs at `http://localhost:8000/api/docs`.

### Development Mode

For development with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This mounts your source code into the container and enables auto-reload on file changes.

## Local Development (No Docker)

If you prefer running without Docker:

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Install in dev mode
pip install -e ".[dev]"

# Copy and edit config
cp .env.example .env
# SQLite works out of the box for local dev — no database setup needed

# Start the server
specter server start --reload

# Run tests
pytest
```

## Configuration

All configuration is via environment variables (or `.env` file). See `.env.example` for the full list.

### Required Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key — **change this in production** | `change-me...` |
| `DATABASE_URL` | Database connection string | SQLite (local file) |

### Optional Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_ENV` | Environment name (development/staging/production) | `development` |
| `DEBUG` | Enable debug mode and Swagger docs | `true` |
| `BASE_URL` | Public URL for tracking links | `http://localhost:8000` |
| `LLM_PROVIDER` | AI provider (mock/openai) | `mock` |
| `OPENAI_API_KEY` | OpenAI API key (if using openai provider) | — |
| `LOG_LEVEL` | Logging level (DEBUG/INFO/WARNING/ERROR) | `INFO` |
| `LOG_FORMAT` | Log format (console/json) | `console` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |

### LLM Provider Setup

Specter works without any API key using the built-in mock provider, which returns realistic pre-built phishing templates. For AI-generated unique content:

**OpenAI:**
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

## Cloud Deployment (Azure)

Specter includes Terraform modules for deploying to Azure Container Apps.

### Prerequisites

- Azure CLI installed and authenticated (`az login`)
- Terraform >= 1.5 installed

### Steps

```bash
cd infra

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var-file=environments/dev.tfvars \
  -var="db_password=your-secure-password" \
  -var="secret_key=your-jwt-secret-key"

# Apply
terraform apply -var-file=environments/dev.tfvars \
  -var="db_password=your-secure-password" \
  -var="secret_key=your-jwt-secret-key"
```

The output will show your API URL.

### CI/CD

The repository includes GitHub Actions workflows:

- **CI** (`ci.yml`): Runs on every push — linting, type checking, tests, Docker build
- **Deploy** (`deploy.yml`): Runs on version tags — builds and pushes container to GitHub Container Registry

To trigger a deployment:

```bash
git tag v0.1.0
git push origin v0.1.0
```

This builds the container and pushes it to `ghcr.io/lixeron/project_specter:0.1.0`.

## Monitoring

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

Returns:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "healthy",
  "environment": "development"
}
```

### Metrics

```bash
curl http://localhost:8000/api/v1/metrics
```

Returns request counts, latency percentiles, status code distribution, and per-endpoint breakdowns.

### Structured Logging

In production (`LOG_FORMAT=json`), logs are JSON-formatted with correlation IDs:

```json
{
  "event": "request",
  "method": "POST",
  "path": "/api/v1/simulations/quick",
  "status": 201,
  "duration": 0.0234,
  "correlation_id": "a1b2c3d4",
  "timestamp": "2026-05-12T16:44:24.825Z"
}
```

Each request includes an `X-Correlation-ID` header for tracing requests across services.

## Security Notes

- **Change `SECRET_KEY`** in production — it's used for JWT signing
- **Use HTTPS** in production — tracking pixels and links won't work over mixed content
- **Database credentials** should be injected via environment variables, never committed
- Specter runs as a non-root user inside the container
- Credentials submitted to fake login pages are **never stored** — only a boolean event is logged
