# Specter

**Adversary simulation platform — multi-vector social engineering testing and training.**

Specter helps organizations test and train employees against social engineering attacks. It generates AI-powered phishing emails, QR code attacks, fake login pages, and pretexting scenarios, tracks user interactions, and provides interactive training when someone falls for a simulation.

Built as an open-core platform: the free tier covers email and QR attacks with a web dashboard, while the Pro tier adds SMS, credential harvesting, pretexting, adaptive AI difficulty, and compliance reports.

---

## Features

**Attack Vectors**
- Email phishing with AI-generated content (credential harvesting, BEC, spear phishing)
- QR code attacks with printable poster generation
- Fake login pages mimicking SSO portals (Pro)
- Pretexting scenarios with scoring rubrics (Pro)

**Platform**
- REST API with JWT authentication and org-level tenant isolation
- React web dashboard for campaign management and simulation
- CLI tool with Rich terminal output
- Tracking engine: link clicks, email opens, credential submissions, reports
- Interactive training pages shown when targets fall for simulations
- Security score tracking per user with adaptive difficulty

**Infrastructure**
- Docker Compose deployment (one command)
- GitHub Actions CI/CD pipeline
- Terraform modules for Azure Container Apps
- Structured JSON logging with correlation IDs
- Prometheus-compatible metrics endpoint

---

## Quick Start

### Local Development (no Docker)

```bash
# Clone
git clone https://github.com/lixeron/Project_Specter.git
cd Project_Specter

# Backend
python -m venv .venv
source .venv/bin/activate        # Linux/Mac
# .venv\Scripts\activate         # Windows
pip install -e ".[dev]"
cp .env.example .env
specter server start --reload

# Frontend (separate terminal)
cd web
npm install
npm run dev
```

Backend: `http://localhost:8000` (API docs at `/api/docs`)
Frontend: `http://localhost:3000`

### Docker Compose

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL=postgresql+asyncpg://specter:specter_dev@postgres:5432/specter
docker compose up -d
```

API at `http://localhost:8000`, dashboard at `http://localhost:3000`.

---

## CLI Usage

```bash
specter register                          # Create org + admin account
specter login                             # Authenticate
specter simulate --vector email --topic credential
specter simulate --vector qr --topic wifi
specter campaign create --name "Q1 Test"
specter campaign list
specter targets import targets.csv --group "Engineering"
specter stats
specter server health
```

---

## Architecture

```
Clients:  CLI (Click+Rich)  |  Web (React+Vite)  |  REST API
              |                     |                   |
              v                     v                   v
         FastAPI Gateway (JWT auth, rate limiting, CORS)
              |
    Core Services: Campaign Manager | Attack Engine | Training Engine
              |
    Attack Vectors: Email | QR Codes | Fake Logins | Pretexting
              |
    Infrastructure: PostgreSQL | Redis | LLM Service (OpenAI/Mock)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| Frontend | React 18, Vite, Tailwind CSS, TypeScript, Recharts |
| Auth | PyJWT, bcrypt |
| CLI | Click, Rich |
| Database | PostgreSQL (prod), SQLite (dev) |
| LLM | OpenAI GPT-4o-mini / Mock provider |
| DevOps | Docker, GitHub Actions, Terraform, structlog |
| Testing | pytest, httpx, pytest-asyncio |

---

## Project Structure

```
specter/
├── src/specter/
│   ├── api/            # FastAPI routers, middleware, dependencies
│   ├── cli/            # Click CLI commands + HTTP client
│   ├── core/           # Business logic, Pro tier gating
│   ├── db/             # SQLAlchemy engine, Alembic migrations
│   ├── models/         # ORM models, Pydantic schemas, enums
│   ├── services/       # LLM providers (OpenAI, Mock)
│   ├── vectors/        # Attack vector implementations
│   ├── config.py       # Pydantic Settings
│   └── logging.py      # Structured logging setup
├── web/                # React frontend
├── infra/              # Terraform (Azure Container Apps)
├── tests/              # pytest test suite
├── Dockerfile          # Multi-stage backend container
├── docker-compose.yml  # Full stack deployment
└── docs/               # Blueprint, self-hosting guide
```

---

## Testing

```bash
pytest                    # Run all tests
pytest -v --tb=short      # Verbose with short tracebacks
ruff check src/ tests/    # Lint
mypy src/                 # Type check
```

---

## Configuration

All settings via environment variables or `.env` file. See `.env.example` for the full list.

Key settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key | `change-me...` |
| `DATABASE_URL` | Database connection | SQLite (local) |
| `LLM_PROVIDER` | AI provider (`mock` / `openai`) | `mock` |
| `OPENAI_API_KEY` | OpenAI key (if using openai) | — |
| `BASE_URL` | Public URL for tracking links | `http://localhost:8000` |

---

## Open-Core Model

**Free (OSS):** Email phishing, QR code attacks, single tenant, web dashboard, CLI, mock LLM provider.

**Pro:** SMS phishing, fake login pages, pretexting scenarios, adaptive AI difficulty, multi-tenant RBAC, compliance reports, webhook integrations.

---

## License

Apache 2.0
