# Specter — Technical Blueprint

**Adversary Simulation Platform**
*Open-core security awareness training with adaptive AI*

**Author:** Ethan (lixeron)
**Date:** March 2026
**Status:** Draft v1.0
**Repository:** `github.com/lixeron/specter`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Target Users](#4-target-users)
5. [System Architecture](#5-system-architecture)
6. [Attack Vectors](#6-attack-vectors)
7. [Adaptive AI Engine](#7-adaptive-ai-engine)
8. [Data Models](#8-data-models)
9. [API Design](#9-api-design)
10. [CLI Design](#10-cli-design)
11. [Web Dashboard](#11-web-dashboard)
12. [Training & Feedback Engine](#12-training--feedback-engine)
13. [Analytics & Compliance](#13-analytics--compliance)
14. [Open-Core Model](#14-open-core-model)
15. [Infrastructure & DevOps](#15-infrastructure--devops)
16. [Security Considerations](#16-security-considerations)
17. [Tech Stack](#17-tech-stack)
18. [Project Structure](#18-project-structure)
19. [Phased Roadmap](#19-phased-roadmap)
20. [Success Metrics](#20-success-metrics)
21. [Risks & Mitigations](#21-risks--mitigations)
22. [Future Considerations](#22-future-considerations)

---

## 1. Executive Summary

Specter is an open-core adversary simulation platform that helps organizations test and train their employees against social engineering attacks. Unlike simple phishing simulators, Specter covers multiple attack vectors (email, SMS, QR codes, fake login pages, pretexting scenarios), uses AI to generate realistic and adaptive attacks, provides interactive training when users fall for simulations, and generates the compliance reports that organizations need for audits and insurance.

The platform ships as a self-hostable Docker deployment with a CLI and web dashboard. The free open-source tier covers email and QR code attacks with basic analytics. The paid Pro tier adds all attack vectors, the adaptive AI difficulty engine, multi-tenant support, SAML/SSO, automated compliance reports, and a managed cloud option.

Specter is designed to sit in the gap between enterprise tools like KnowBe4 ($15-25/user/year, overkill for small orgs) and open-source scripts that only send a fake email. The goal is a genuinely useful product that also demonstrates production-grade DevOps, cloud infrastructure, and cybersecurity knowledge.

---

## 2. Problem Statement

Social engineering remains the #1 initial attack vector in data breaches. Organizations need to train employees to recognize these attacks, but current options are polarized:

**Enterprise tools (KnowBe4, Proofpoint, Cofense):**
- Expensive ($15-25/user/year minimum)
- Require sales calls and annual contracts
- Overkill for teams under 100 people
- Email-only in most tiers
- Closed source — can't self-host or audit

**Open-source alternatives (GoPhish, King Phisher):**
- Email phishing only — no SMS, QR, credential harvesting
- No AI-generated content (static templates)
- No adaptive difficulty
- No training/feedback engine
- No compliance reporting
- Often abandoned or minimally maintained

**The gap:** There is no affordable, self-hostable, multi-vector adversary simulation platform with AI-powered content generation, adaptive difficulty, interactive training, and compliance reporting. Specter fills this gap.

---

## 3. Product Vision

Specter is the tool that a security-conscious team lead deploys in 5 minutes with `docker compose up`, uses to run realistic multi-vector social engineering campaigns against their team, watches employees improve over time through adaptive training, and exports a compliance report to hand to an auditor — all without a sales call, an annual contract, or sending employee vulnerability data to someone else's cloud.

**Core principles:**
- **Self-hostable first.** Security teams shouldn't have to trust a third party with data about which employees are vulnerable to attacks. Everything runs on your infrastructure.
- **Multi-vector.** Real attackers don't just send emails. Specter simulates the full spectrum: email, SMS, QR codes, fake login pages, and pretexting scenarios.
- **AI-adaptive.** Static templates get stale. Specter uses LLMs to generate unique, contextually relevant attacks and adjusts difficulty based on each user's performance history.
- **Training, not gotchas.** The point isn't to embarrass people who click — it's to teach them. Every failed simulation triggers an interactive breakdown of the red flags they missed.
- **DevOps-native.** Docker, CI/CD, IaC, health checks, structured logging. The deployment story is as polished as the product.

---

## 4. Target Users

### Primary: Small-to-medium security teams (10-500 employees)
- IT managers at companies too small for KnowBe4
- Startup CTOs who need security awareness training
- MSPs (Managed Service Providers) running campaigns for clients

### Secondary: University IT departments
- Campus security teams running awareness campaigns for staff/students
- Cybersecurity programs using Specter as a teaching tool
- Student security orgs running simulations for members

### Tertiary: Individual security professionals
- Penetration testers using Specter for social engineering engagements
- Security consultants demonstrating risk to clients
- Cybersecurity students building portfolio demonstrations

### Open-source community
- Self-hosters who want to run their own security training
- Contributors who extend Specter with new attack vectors or integrations

---

## 5. System Architecture

### High-level overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ CLI          │  │ Web          │  │ Public REST API    │ │
│  │ (Click+Rich) │  │ (React+Vite) │  │ (webhooks, integs) │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          └────────┬────────┴────────────────────┘
                   │ HTTPS / REST
          ┌────────▼──────────────────────────────┐
          │         FASTAPI GATEWAY               │
          │  Auth (JWT) · Rate Limiting · CORS    │
          │  OpenAPI docs · Request validation     │
          └────────┬──────────────────────────────┘
                   │
   ┌───────────────┼───────────────────────────────┐
   │               │     CORE SERVICES             │
   │  ┌────────────▼───────────┐                   │
   │  │ Campaign Manager       │                   │
   │  │ Create, schedule, run  │                   │
   │  └────────────┬───────────┘                   │
   │               │ dispatches                    │
   │  ┌────────────▼───────────┐                   │
   │  │ Attack Engine          │──────┐            │
   │  │ Orchestrates vectors   │      │            │
   │  └────────────────────────┘      │            │
   │                                  │            │
   │  ┌────────────────────────┐  ┌───▼──────────┐ │
   │  │ Training Engine        │  │ Analytics    │ │
   │  │ AI feedback + learning │  │ Risk scores  │ │
   │  └────────────────────────┘  └──────────────┘ │
   └───────────────────────────────────────────────┘
                   │
   ┌───────────────┼───────────────────────────────┐
   │               │     ATTACK VECTORS            │
   │  ┌─────┐ ┌───┴──┐ ┌──────┐ ┌───────┐ ┌────┐ │
   │  │Email│ │ SMS  │ │QR    │ │Fake   │ │Pre-│ │
   │  │     │ │      │ │Codes │ │Logins │ │text│ │
   │  └──┬──┘ └──┬───┘ └──┬───┘ └──┬────┘ └─┬──┘ │
   └─────┼───────┼────────┼────────┼─────────┼────┘
         │       │        │        │         │
   ┌─────▼───────▼────────▼────────▼─────────▼────┐
   │              INFRASTRUCTURE                   │
   │  ┌──────────┐ ┌──────┐ ┌───────┐ ┌────────┐  │
   │  │PostgreSQL│ │Redis │ │LLM    │ │Delivery│  │
   │  │          │ │Queue │ │Service│ │SMTP    │  │
   │  │          │ │      │ │       │ │Twilio  │  │
   │  └──────────┘ └──────┘ └───────┘ └────────┘  │
   └───────────────────────────────────────────────┘
```

### Component responsibilities

**FastAPI Gateway:** Single entry point for all clients. Handles JWT authentication, org-level tenant isolation, rate limiting, request validation via Pydantic, and auto-generated OpenAPI documentation. All business logic lives in core services — the gateway is a thin routing layer.

**Campaign Manager:** CRUD for campaigns, scheduling (immediate or cron-based via Celery Beat), target group management, and campaign state machine (draft → scheduled → running → completed → archived).

**Attack Engine:** Receives dispatched campaign tasks from the Celery queue. For each target in a campaign, it selects the configured attack vector, calls the LLM service to generate the attack content, and dispatches delivery through the appropriate channel. Handles retry logic, delivery confirmation, and event tracking (opened, clicked, reported, ignored).

**Training Engine:** Triggered when a user interacts with a simulated attack (clicks a link, submits credentials, scans a QR code). Generates an AI-powered interactive breakdown of the attack: what red flags were present, what social engineering tactics were used, what the user should check next time. Tracks training completion and knowledge retention.

**Analytics Service:** Aggregates event data into per-user, per-department, and per-org metrics. Computes risk scores based on a weighted formula (click rate, report rate, improvement velocity, time-to-report). Generates exportable compliance reports mapped to SOC 2 and ISO 27001 control requirements.

**LLM Service:** Abstraction layer over LLM providers. Implements a provider interface with concrete implementations for OpenAI, Anthropic, and Ollama (local). Handles prompt construction from scenario templates, response parsing, token budget management, and fallback between providers. The adaptive difficulty engine lives here — it adjusts prompt parameters based on the target user's historical performance.

**Delivery Service:** Handles the actual sending of simulated attacks. SMTP for email (with tracking pixel injection and link wrapping), Twilio for SMS, QR code generation (via `qrcode` library), and static site serving for fake login pages. All delivery includes unique tracking tokens for attribution.

---

## 6. Attack Vectors

### 6.1 Email phishing (OSS)

The foundational vector. Specter generates realistic phishing emails using LLM-powered content generation and sends them via SMTP.

**Attack subtypes:**
- **Credential harvesting:** "Your password expires in 24 hours, click here to reset" — links to a Specter-hosted fake login page
- **Business email compromise (BEC):** Impersonates an executive requesting a wire transfer or sensitive data
- **Malware delivery:** Fake invoice/document attachment notification (no actual malware — tracks the click)
- **Spear phishing:** Uses target-specific context (department, role, recent events) for higher realism

**Tracking events:**
- Email delivered (SMTP confirmation)
- Email opened (tracking pixel loaded)
- Link clicked (redirect through Specter tracking endpoint)
- Credentials submitted (if linked to fake login page)
- Email reported (via report button integration or forwarding to designated address)
- Email ignored (no interaction after campaign window)

**Technical implementation:**
- SMTP delivery via configurable relay (Gmail SMTP, SendGrid, Mailgun, or self-hosted)
- Tracking pixel: 1x1 transparent GIF served from Specter with unique token in URL
- Link wrapping: all URLs in generated emails are replaced with `https://{specter_host}/t/{token}` which logs the click and redirects to the training page
- SPF/DKIM considerations documented for self-hosters

### 6.2 SMS phishing / smishing (Pro)

Text message-based social engineering. Increasingly common in real-world attacks, especially targeting MFA codes and account verification.

**Attack subtypes:**
- **MFA intercept:** "Your verification code is 847291. If you didn't request this, click here to secure your account"
- **Package delivery:** "Your package couldn't be delivered. Reschedule: [link]"
- **IT support:** "Unusual login detected on your account. Verify your identity: [link]"

**Technical implementation:**
- Delivery via Twilio API (programmable SMS)
- Link shortening with unique tracking tokens
- Delivery confirmation and read receipts where available
- Rate limiting to comply with carrier regulations
- Opt-out handling (STOP keyword)

### 6.3 QR code attacks / quishing (OSS)

QR codes that link to tracked phishing URLs. These are exploding in frequency because they bypass email link scanning — the URL is encoded in an image, not text.

**Attack subtypes:**
- **Embedded in email:** QR code in an email body ("Scan to verify your identity")
- **Physical placement:** Generate printable posters/flyers for physical security testing ("Scan for free WiFi", "Scan to RSVP")
- **Document embedding:** QR codes placed in PDF attachments

**Technical implementation:**
- QR code generation via `qrcode` Python library
- Encoded URL points to Specter tracking endpoint
- Exportable as PNG, SVG, or embedded in PDF templates
- Printable poster templates with customizable branding
- Scan tracking via the same link-click infrastructure as email

### 6.4 Fake login pages / credential harvesting (Pro)

Specter-hosted pages that mimic real login portals. When a user submits credentials, Specter logs the attempt (without storing the actual password) and redirects to the training page.

**Attack subtypes:**
- **Generic SSO:** Mimics Google, Microsoft, Okta login screens
- **Custom branded:** Templates that match the target org's actual login page styling
- **MFA phishing:** Fake MFA prompt after initial "login" to test MFA fatigue

**Implementation details:**
- Pre-built templates for common SSO providers (HTML/CSS only — no JavaScript credential exfiltration)
- Template customization API for org-specific branding
- Credential handling: Specter hashes the submitted password immediately, stores only a boolean "credentials were submitted" flag plus a truncated hash for deduplication. **Actual passwords are never stored or logged.**
- Auto-redirect to training page after submission
- HTTPS required (Let's Encrypt via Caddy or Traefik)
- Configurable landing page domains

### 6.5 Pretexting scenarios (Pro)

AI-generated social engineering scripts for tabletop exercises and awareness training. These aren't delivered automatically — they're generated for security teams to use in live exercises.

**Scenario types:**
- **Phone pretexting:** Scripts for simulated vishing (voice phishing) calls — "Hi, this is IT support, we need to verify your credentials due to a security incident"
- **Physical access:** Scenarios for testing physical security — tailgating, impersonation, fake vendor visits
- **Chat/messaging:** Scripts for Slack/Teams-based social engineering attempts

**Technical implementation:**
- LLM-generated scripts with configurable parameters (target role, pretext, objective)
- Scoring rubric generated alongside each scenario (what should the target do? what red flags are present?)
- Exportable as PDF for use in tabletop exercises
- Post-exercise recording of outcomes for analytics

---

## 7. Adaptive AI Engine

The adaptive AI engine is Specter's primary differentiator. Instead of sending the same difficulty of attack to every user, the engine personalizes attack sophistication based on each individual's performance history.

### Difficulty model

Each user has a **security awareness score** (0-100) that starts at 50 and adjusts based on their interactions:

```
Score adjustments:
  +10  Reported a simulated attack
  +5   Ignored a simulated attack (recognized but didn't report)
  +3   Reported within 5 minutes (fast detection bonus)
  -15  Clicked a malicious link
  -25  Submitted credentials on a fake login page
  -5   Opened a phishing email but didn't click (partial awareness)
  +2   Completed training module after failure
```

### Difficulty tiers

The score maps to attack difficulty tiers that control LLM prompt parameters:

| Score range | Tier | Attack characteristics |
|-------------|------|----------------------|
| 0-25 | Beginner | Obvious red flags: misspelled domain, generic greeting, broken grammar, suspicious sender address. Multiple red flags per email. |
| 26-50 | Intermediate | Fewer red flags: correct grammar, plausible sender, but urgency tactics, slightly off domain, or unusual request. |
| 51-75 | Advanced | Subtle: correct domain spoofing, uses target's name and department, references real internal processes, single subtle red flag. |
| 76-100 | Expert | Near-realistic: personalized context from org data, mimics actual communication patterns, BEC-style with legitimate-looking thread history. |

### LLM prompt construction

The engine builds prompts from composable template fragments:

```
[system] You are generating a simulated phishing email for security 
awareness training. The email should be {difficulty_tier} difficulty.

[context]
- Target name: {target.name}
- Target department: {target.department}
- Target role: {target.role}
- Organization: {org.name}
- Attack vector: {vector_type}
- Attack subtype: {subtype}
- Difficulty: {tier_description}
- Red flags to include: {tier_red_flags}

[constraints]
- The email must contain exactly {tier_red_flag_count} identifiable red flags
- Include a trackable link placeholder: {{TRACKING_URL}}
- {tier_specific_constraints}

[output format]
Return JSON:
{
  "subject": "...",
  "sender_name": "...",
  "sender_email": "...",
  "body_html": "...",
  "body_text": "...",
  "red_flags": ["description of each red flag"],
  "social_engineering_tactics": ["tactic names used"]
}
```

### Provider abstraction

```python
# Abstract interface — swap providers without changing business logic
class LLMProvider(Protocol):
    async def generate(self, prompt: str, max_tokens: int) -> str: ...
    async def generate_structured(self, prompt: str, schema: type[T]) -> T: ...

class OpenAIProvider(LLMProvider): ...
class AnthropicProvider(LLMProvider): ...
class OllamaProvider(LLMProvider): ...   # Local, free, good for dev/testing
class MockProvider(LLMProvider): ...     # Deterministic, for unit tests
```

---

## 8. Data Models

### Core entities

```
Organization
├── id: UUID (PK)
├── name: str
├── slug: str (unique, URL-safe)
├── plan: enum (free, pro, enterprise)
├── settings: JSON (smtp config, branding, etc.)
├── created_at: datetime
└── updated_at: datetime

User
├── id: UUID (PK)
├── org_id: UUID (FK → Organization)
├── email: str
├── name: str
├── role: enum (admin, campaign_manager, viewer, target)
├── department: str (nullable)
├── security_score: int (default 50)
├── password_hash: str (for dashboard users, not targets)
├── created_at: datetime
└── updated_at: datetime

Campaign
├── id: UUID (PK)
├── org_id: UUID (FK → Organization)
├── created_by: UUID (FK → User)
├── name: str
├── description: str
├── status: enum (draft, scheduled, running, paused, completed, archived)
├── vectors: list[enum] (email, sms, qr, fake_login, pretext)
├── target_group_id: UUID (FK → TargetGroup)
├── schedule: JSON (nullable — immediate if null, cron config if scheduled)
├── settings: JSON (difficulty_mode: adaptive|fixed, fixed_tier, send_window, etc.)
├── started_at: datetime (nullable)
├── completed_at: datetime (nullable)
├── created_at: datetime
└── updated_at: datetime

TargetGroup
├── id: UUID (PK)
├── org_id: UUID (FK → Organization)
├── name: str
├── description: str
└── members: M2M → User (via target_group_members join table)

Simulation
├── id: UUID (PK)
├── campaign_id: UUID (FK → Campaign)
├── target_user_id: UUID (FK → User)
├── vector: enum (email, sms, qr, fake_login, pretext)
├── difficulty_tier: enum (beginner, intermediate, advanced, expert)
├── content: JSON (generated email/sms/scenario content)
├── red_flags: list[str] (expected red flags in this simulation)
├── tracking_token: str (unique, URL-safe)
├── delivered_at: datetime (nullable)
├── status: enum (pending, delivered, failed)
├── created_at: datetime
└── updated_at: datetime

Event
├── id: UUID (PK)
├── simulation_id: UUID (FK → Simulation)
├── event_type: enum (delivered, opened, clicked, reported, 
│                      credentials_submitted, qr_scanned, 
│                      training_started, training_completed, ignored)
├── metadata: JSON (IP, user-agent, timestamp details)
├── created_at: datetime
└── ip_address: str (nullable, for geolocation anomaly detection)

TrainingResult
├── id: UUID (PK)
├── simulation_id: UUID (FK → Simulation)
├── user_id: UUID (FK → User)
├── red_flags_identified: list[str] (which flags the user identified in post-training)
├── red_flags_missed: list[str]
├── feedback_content: JSON (AI-generated training content shown)
├── time_spent_seconds: int
├── quiz_score: float (nullable, 0.0-1.0)
├── completed_at: datetime
└── created_at: datetime

ComplianceReport
├── id: UUID (PK)
├── org_id: UUID (FK → Organization)
├── report_type: enum (soc2, iso27001, summary, custom)
├── date_range_start: date
├── date_range_end: date
├── data: JSON (aggregated metrics snapshot)
├── generated_at: datetime
└── file_path: str (path to generated PDF)
```

### Indexes

```sql
-- High-frequency query paths
CREATE INDEX idx_simulations_campaign ON simulations(campaign_id);
CREATE INDEX idx_simulations_target ON simulations(target_user_id);
CREATE INDEX idx_simulations_token ON simulations(tracking_token);  -- Unique, used for every tracking hit
CREATE INDEX idx_events_simulation ON events(simulation_id);
CREATE INDEX idx_events_type_created ON events(event_type, created_at);  -- Analytics aggregations
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_org_dept ON users(org_id, department);  -- Department-level analytics
CREATE INDEX idx_campaigns_org_status ON campaigns(org_id, status);
```

---

## 9. API Design

All endpoints are prefixed with `/api/v1`. Authentication is via JWT Bearer token. Org-level isolation is enforced at the middleware layer — users can only access resources belonging to their organization.

### Authentication

```
POST   /api/v1/auth/register          Create org + admin user
POST   /api/v1/auth/login             Get JWT access + refresh tokens
POST   /api/v1/auth/refresh           Refresh access token
POST   /api/v1/auth/logout            Revoke refresh token
```

### Campaigns

```
GET    /api/v1/campaigns              List campaigns (paginated, filterable by status)
POST   /api/v1/campaigns              Create campaign (draft)
GET    /api/v1/campaigns/{id}         Get campaign details
PATCH  /api/v1/campaigns/{id}         Update campaign (draft only)
DELETE /api/v1/campaigns/{id}         Delete campaign (draft only)
POST   /api/v1/campaigns/{id}/launch  Launch campaign (draft → running)
POST   /api/v1/campaigns/{id}/pause   Pause running campaign
POST   /api/v1/campaigns/{id}/resume  Resume paused campaign
```

### Target groups

```
GET    /api/v1/groups                 List target groups
POST   /api/v1/groups                 Create target group
GET    /api/v1/groups/{id}            Get group with members
PATCH  /api/v1/groups/{id}            Update group
DELETE /api/v1/groups/{id}            Delete group
POST   /api/v1/groups/{id}/members    Add members (bulk)
DELETE /api/v1/groups/{id}/members    Remove members (bulk)
POST   /api/v1/groups/import          Import members from CSV
```

### Simulations

```
GET    /api/v1/simulations            List simulations (filterable by campaign, user, status)
GET    /api/v1/simulations/{id}       Get simulation details + events
POST   /api/v1/simulate               Quick-run: generate + display a single simulation (CLI/testing)
```

### Tracking (public, no auth)

```
GET    /t/{token}                     Track link click → redirect to training
GET    /t/{token}/px                  Tracking pixel (1x1 GIF)
GET    /t/{token}/qr                  QR code scan tracking
POST   /t/{token}/submit              Fake login form submission
POST   /t/{token}/report              User reports the simulation
```

### Analytics

```
GET    /api/v1/analytics/overview     Org-level dashboard metrics
GET    /api/v1/analytics/campaigns/{id}  Campaign-specific metrics
GET    /api/v1/analytics/users/{id}   Per-user performance history
GET    /api/v1/analytics/departments  Department comparison
GET    /api/v1/analytics/trends       Time-series data (click rate, report rate over time)
GET    /api/v1/analytics/risk-scores  Org risk score breakdown
```

### Compliance reports (Pro)

```
GET    /api/v1/reports                List generated reports
POST   /api/v1/reports/generate       Generate compliance report (async, returns job ID)
GET    /api/v1/reports/{id}           Get report metadata
GET    /api/v1/reports/{id}/download  Download report PDF
```

### Training

```
GET    /api/v1/training/{token}       Get training content for a simulation
POST   /api/v1/training/{token}/complete   Mark training as completed + submit quiz
```

### Admin

```
GET    /api/v1/admin/users            List org users
POST   /api/v1/admin/users            Create user / invite
PATCH  /api/v1/admin/users/{id}       Update user role/department
DELETE /api/v1/admin/users/{id}       Deactivate user
GET    /api/v1/admin/settings         Get org settings
PATCH  /api/v1/admin/settings         Update org settings (SMTP, branding, etc.)
GET    /api/v1/health                 Health check (public, no auth)
GET    /api/v1/metrics                Prometheus metrics endpoint
```

---

## 10. CLI Design

The CLI is built with Click + Rich and communicates with the Specter API. It targets two personas: security team operators running campaigns, and developers self-hosting Specter.

### Command structure

```bash
specter                              # Show help + version
specter init                         # First-time setup wizard (API URL, auth)
specter login                        # Authenticate and store token
specter logout                       # Clear stored credentials

# Campaign management
specter campaign list                # List all campaigns (table view)
specter campaign create              # Interactive campaign builder
specter campaign show <id>           # Campaign details + live stats
specter campaign launch <id>         # Launch a draft campaign
specter campaign pause <id>          # Pause a running campaign
specter campaign delete <id>         # Delete a draft campaign

# Quick simulation (dev/testing)
specter simulate                     # Interactive: pick vector, topic, tone, target
specter simulate --vector email --topic finance --tone urgent
specter simulate --vector qr --output poster.png

# Target management
specter targets list                 # List target groups
specter targets import <csv>         # Import targets from CSV
specter targets add <group> <email>  # Add single target

# Analytics
specter stats                        # Org overview (Rich dashboard in terminal)
specter stats campaign <id>          # Campaign-specific stats
specter stats user <email>           # User performance history
specter report generate              # Generate compliance report

# Server management (self-hosters)
specter server start                 # Start local dev server
specter server health                # Check API health
specter server migrate               # Run database migrations
```

### CLI output style

All output uses Rich for formatting: tables with box borders, colored status badges, progress bars for campaign progress, and sparkline-style charts for trend data. The aesthetic matches the terminal theme from the portfolio site — Gruvbox-inspired colors, clean monospace layout.

```
$ specter stats

╭─────────────────────────────────────────────────╮
│  Specter — Org Overview                         │
├─────────────────────────────────────────────────┤
│  Active campaigns:  3                           │
│  Total simulations: 847                         │
│  Overall click rate: 23.4% ████▌░░░░░░          │
│  Report rate:        61.2% ████████████▎░░░░░░  │
│  Avg security score: 67 / 100                   │
│  Risk level:         MODERATE                   │
╰─────────────────────────────────────────────────╯
```

---

## 11. Web Dashboard

The web dashboard is a React + Vite + Tailwind SPA that consumes the Specter API. It provides the visual campaign management, analytics, and reporting interface.

### Page structure

```
/                         → Dashboard overview (key metrics, active campaigns, recent events)
/campaigns                → Campaign list (filterable, sortable)
/campaigns/new            → Campaign builder (multi-step form)
/campaigns/:id            → Campaign detail (live progress, per-target status)
/campaigns/:id/results    → Campaign results + analytics
/targets                  → Target group management
/targets/:id              → Group detail + member list
/analytics                → Org-wide analytics dashboard
/analytics/departments    → Department comparison view
/analytics/users/:id      → Individual user performance
/reports                  → Compliance report generation + history
/settings                 → Org settings (SMTP, branding, integrations)
/settings/team            → User/role management
```

### Campaign builder flow

The campaign builder is a multi-step form:

1. **Basics:** Campaign name, description
2. **Vectors:** Select attack vectors (email, SMS, QR, etc.) and configure per-vector settings
3. **Targets:** Select target group(s) or import new targets
4. **Difficulty:** Choose adaptive (AI adjusts per-user) or fixed tier
5. **Schedule:** Launch immediately or set a schedule with send windows
6. **Review:** Summary of all settings, estimated send count, launch button

### Analytics dashboard components

- **Risk score gauge:** Org-wide security score (0-100) with color coding
- **Click rate trend:** Line chart showing click rate over time (by week/month)
- **Report rate trend:** Line chart showing reporting rate improvement
- **Department heatmap:** Grid showing risk levels per department
- **Vector effectiveness:** Bar chart comparing click rates across attack vectors
- **Top improvers / at-risk:** Tables showing biggest score changes
- **Campaign comparison:** Side-by-side metrics for past campaigns

---

## 12. Training & Feedback Engine

When a user interacts with a simulated attack (clicks a link, submits credentials, scans a QR code), they're redirected to Specter's training page instead of a malicious destination. The training engine provides an AI-powered interactive breakdown of the attack.

### Training page flow

1. **Reveal:** "This was a simulated phishing attack from your security team."
2. **The email/SMS they received:** Displayed with red flag annotations highlighted inline
3. **Red flag breakdown:** Each red flag explained with a visual callout:
   - Suspicious sender domain (hovmeil.com vs hotmail.com)
   - Urgency language ("immediate action required")
   - Generic greeting ("Dear user" instead of name)
   - Suspicious link URL (hover preview showing the real destination)
   - Authority impersonation (fake executive name)
   - Unusual request (wire transfer, credential reset)
4. **Tactic explanation:** What social engineering principles were used (authority, urgency, scarcity, social proof) with brief definitions
5. **Quick quiz:** 3-5 multiple choice questions testing recognition of the red flags
6. **Score + next steps:** Updated security awareness score, link to optional deeper training resources

### AI-generated feedback

The training content is partially AI-generated using the same LLM service:

```python
# Prompt for generating training feedback
"""
A user fell for the following simulated phishing email:
{simulation_content}

The red flags in this email were:
{red_flags}

Generate a training explanation that:
1. Is encouraging, not shaming
2. Explains each red flag in plain language
3. Gives a concrete "what to check next time" tip for each flag
4. Keeps total length under 500 words

Output as JSON with fields: intro, red_flag_explanations[], general_tips[]
"""
```

---

## 13. Analytics & Compliance

### Risk scoring algorithm

Each user has a continuously updated security awareness score. The org-level risk score is a weighted aggregate:

```python
def calculate_org_risk_score(org_id: UUID) -> float:
    users = get_org_users(org_id)
    
    weights = {
        "click_rate": 0.35,          # What % of simulations result in clicks
        "report_rate": 0.25,         # What % are correctly reported
        "credential_submit_rate": 0.20,  # Worst outcome — highest weight per-incident
        "improvement_velocity": 0.10, # Are scores trending up or down
        "training_completion": 0.10,  # Do people complete assigned training
    }
    
    # Each component is normalized to 0-100
    # Higher score = more secure (less risk)
    components = {
        "click_rate": 100 - (org_click_rate * 100),
        "report_rate": org_report_rate * 100,
        "credential_submit_rate": 100 - (org_cred_rate * 100),
        "improvement_velocity": normalize_velocity(score_deltas),
        "training_completion": org_training_rate * 100,
    }
    
    return sum(weights[k] * components[k] for k in weights)
```

### Compliance report mapping

Specter generates reports that map directly to common compliance framework controls:

**SOC 2 (Trust Service Criteria):**
- CC6.1: Security awareness training evidence
- CC6.2: Logical and physical access controls testing
- CC7.2: System monitoring (simulation tracking as evidence of testing)

**ISO 27001:**
- A.7.2.2: Information security awareness, education, and training
- A.12.2.1: Controls against malware (phishing simulations as testing evidence)

**Report contents:**
- Executive summary with org risk score and trend
- Campaign history with aggregate metrics
- Department-level breakdown
- Individual high-risk user flags (anonymizable for external auditors)
- Improvement trends over reporting period
- Recommendations based on data patterns

---

## 14. Open-Core Model

### Free (OSS) tier

Available to all users, self-hosted, Apache 2.0 licensed:
- Email phishing simulation
- QR code attack simulation
- Single-tenant (one organization)
- LLM integration (bring your own API key, or use Ollama locally)
- Basic web dashboard
- CLI tool
- CSV/JSON export
- Docker Compose deployment
- Community support (GitHub Issues + Discussions)

### Pro tier

Paid license, available as self-hosted or managed cloud:
- Everything in OSS, plus:
- SMS phishing (Twilio integration)
- Fake login page generator
- Pretexting scenario generator
- Adaptive AI difficulty engine
- Multi-tenant with RBAC (admin, campaign manager, viewer)
- SAML/SSO integration
- Automated compliance reports (SOC 2, ISO 27001)
- Webhook integrations (Slack, Teams, SIEM)
- Priority email support
- Managed cloud hosting option

### Pricing (target)

- **OSS:** Free forever
- **Pro (self-hosted):** $5/user/month (billed annually)
- **Pro (cloud):** $8/user/month (billed annually)
- **Enterprise:** Custom pricing (SAML, dedicated instance, SLA)

### Licensing strategy

The OSS components live in the main `specter` repository under Apache 2.0. Pro features are in a separate `specter-pro` repository or behind a license key check. The API is designed so Pro features return a `402 Payment Required` with an upgrade prompt when accessed on the free tier — this serves as built-in marketing.

---

## 15. Infrastructure & DevOps

### Docker setup

```yaml
# docker-compose.yml (simplified)
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    command: celery -A specter.worker worker -l info
    env_file: .env
    depends_on:
      - postgres
      - redis

  scheduler:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    command: celery -A specter.worker beat -l info
    env_file: .env
    depends_on:
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: specter
      POSTGRES_USER: specter
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U specter"]
      interval: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3000:80"

volumes:
  pgdata:
```

### Multi-stage Dockerfile

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir build && pip install --no-cache-dir .

# Stage 2: Production
FROM python:3.12-slim AS production
RUN addgroup --system specter && adduser --system --group specter
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY src/ ./src/
USER specter
EXPOSE 8000
CMD ["uvicorn", "specter.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### CI/CD pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install ruff
      - run: ruff check src/ tests/
      - run: ruff format --check src/ tests/

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install .[dev]
      - run: mypy src/

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: specter_test
          POSTGRES_USER: specter
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install .[dev]
      - run: pytest tests/ -v --cov=specter --cov-report=xml
      - uses: codecov/codecov-action@v4

  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          push: false
          tags: specter:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Deploy workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ghcr.io/lixeron/specter:${{ github.ref_name }}
            ghcr.io/lixeron/specter:latest
```

### Terraform (Azure Container Apps)

```hcl
# infra/main.tf — deploys Specter to Azure Container Apps
resource "azurerm_resource_group" "specter" {
  name     = "rg-specter-${var.environment}"
  location = var.location
}

resource "azurerm_container_app_environment" "specter" {
  name                = "cae-specter-${var.environment}"
  location            = azurerm_resource_group.specter.location
  resource_group_name = azurerm_resource_group.specter.name
}

resource "azurerm_container_app" "api" {
  name                         = "specter-api"
  container_app_environment_id = azurerm_container_app_environment.specter.id
  resource_group_name          = azurerm_resource_group.specter.name
  revision_mode                = "Single"

  template {
    container {
      name   = "specter-api"
      image  = "ghcr.io/lixeron/specter:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env { name = "DATABASE_URL"  secret_name = "db-url" }
      env { name = "REDIS_URL"    secret_name = "redis-url" }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8000
  }
}
```

### Observability

- **Structured logging:** JSON-formatted logs with correlation IDs per request, using `structlog`
- **Metrics:** Prometheus endpoint at `/api/v1/metrics` exposing request latency, campaign counts, simulation delivery rates, error rates
- **Health checks:** `/api/v1/health` returns service status, database connectivity, Redis connectivity, and worker queue depth

---

## 16. Security Considerations

Specter simulates attacks, which means it must be held to a higher security standard than typical applications. A compromised Specter instance could be weaponized.

### Authentication & authorization
- JWT tokens with short expiry (15 min access, 7 day refresh)
- Org-level tenant isolation enforced at middleware layer (every DB query scoped to org_id)
- RBAC: admin (full access), campaign_manager (create/run campaigns), viewer (read-only analytics), target (training pages only)
- API rate limiting per-user and per-org

### Data handling
- Credentials submitted to fake login pages are **never stored in plaintext** — only a boolean flag and truncated hash for dedup
- Tracking tokens are cryptographically random (secrets.token_urlsafe)
- PII (names, emails) encrypted at rest in database (application-level encryption for sensitive columns)
- All logs are scrubbed of PII before export

### Deployment security
- Non-root container user
- Read-only filesystem in production containers
- Network policies: only the API container is internet-facing
- Secrets injected via environment variables, never committed to repo
- HTTPS enforced for all tracking endpoints (mixed-content tracking pixels break in browsers)

### Abuse prevention
- Campaign sending rate limits (prevent using Specter as a spam tool)
- Mandatory "this is a simulation" disclosure in all training pages
- Admin approval required for campaigns targeting external email addresses
- Audit log of all campaign launches and admin actions

---

## 17. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | Python 3.12+ | Primary language, async support, LLM library ecosystem |
| **API framework** | FastAPI | Async, auto OpenAPI docs, Pydantic integration, modern |
| **ORM** | SQLAlchemy 2.0 + Alembic | Mature, async support, migration management |
| **Database** | PostgreSQL 16 (SQLite for local dev) | Production-grade, JSON columns, full-text search |
| **Task queue** | Celery + Redis | Async campaign delivery, scheduled jobs |
| **Cache** | Redis | Session store, rate limiting, task broker |
| **CLI** | Click + Rich | Composable commands, beautiful terminal output |
| **Web frontend** | React 18 + Vite + Tailwind | Fast dev, modern tooling, utility-first CSS |
| **Charts** | Recharts | React-native, composable, good defaults |
| **LLM integration** | OpenAI / Anthropic / Ollama | Provider abstraction, local option for free tier |
| **Email delivery** | SMTP (stdlib) / SendGrid | Configurable, self-hosted or SaaS |
| **SMS delivery** | Twilio | Industry standard, good Python SDK |
| **QR generation** | qrcode (Python) | Lightweight, SVG + PNG output |
| **Auth** | PyJWT + passlib | Lightweight, no heavy auth framework dependency |
| **Validation** | Pydantic v2 | Request/response schemas, settings management |
| **Linting** | Ruff | Fast, replaces flake8 + isort + black |
| **Type checking** | mypy (strict mode) | Catch bugs before runtime |
| **Testing** | pytest + httpx + factory_boy | Async test client, fixture factories |
| **Container** | Docker + Docker Compose | Standard deployment, local dev parity |
| **CI/CD** | GitHub Actions | Native to GitHub, free for public repos |
| **IaC** | Terraform | Azure Container Apps or AWS ECS deployment |
| **Monitoring** | structlog + Prometheus | Structured JSON logs, metrics endpoint |

---

## 18. Project Structure

```
specter/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, typecheck, test, build on every push
│       └── deploy.yml                # Build + push container on tag
├── docs/
│   ├── BLUEPRINT.md                  # This document
│   ├── CONTRIBUTING.md               # How to contribute
│   ├── API.md                        # API reference (auto-generated from OpenAPI)
│   └── SELF_HOSTING.md               # Self-hosting guide
├── infra/
│   ├── main.tf                       # Terraform root module
│   ├── variables.tf                  # Input variables
│   ├── outputs.tf                    # Output values
│   └── environments/
│       ├── dev.tfvars
│       ├── staging.tfvars
│       └── prod.tfvars
├── src/
│   └── specter/
│       ├── __init__.py               # Version + package metadata
│       ├── api/
│       │   ├── __init__.py
│       │   ├── main.py               # FastAPI app factory
│       │   ├── deps.py               # Dependency injection (db session, current user, etc.)
│       │   ├── middleware.py          # Auth, rate limiting, tenant isolation, correlation ID
│       │   └── routers/
│       │       ├── auth.py
│       │       ├── campaigns.py
│       │       ├── groups.py
│       │       ├── simulations.py
│       │       ├── tracking.py       # Public tracking endpoints (no auth)
│       │       ├── analytics.py
│       │       ├── reports.py
│       │       ├── training.py
│       │       └── admin.py
│       ├── core/
│       │   ├── __init__.py
│       │   ├── campaign.py           # Campaign state machine + orchestration
│       │   ├── engine.py             # Attack engine — dispatches vectors
│       │   ├── scoring.py            # Risk score calculation
│       │   └── training.py           # Training content generation
│       ├── vectors/
│       │   ├── __init__.py
│       │   ├── base.py              # Abstract AttackVector interface
│       │   ├── email.py             # Email phishing implementation
│       │   ├── sms.py               # SMS phishing implementation
│       │   ├── qr.py                # QR code attack implementation
│       │   ├── fake_login.py        # Credential harvesting pages
│       │   └── pretext.py           # Pretexting scenario generator
│       ├── services/
│       │   ├── __init__.py
│       │   ├── llm/
│       │   │   ├── __init__.py
│       │   │   ├── base.py          # LLMProvider protocol
│       │   │   ├── openai.py
│       │   │   ├── anthropic.py
│       │   │   ├── ollama.py
│       │   │   ├── mock.py          # Deterministic, for testing
│       │   │   └── adaptive.py      # Difficulty engine
│       │   ├── delivery/
│       │   │   ├── __init__.py
│       │   │   ├── smtp.py
│       │   │   ├── twilio_sms.py
│       │   │   └── webhook.py
│       │   └── reports/
│       │       ├── __init__.py
│       │       └── generator.py     # Compliance report generation
│       ├── models/
│       │   ├── __init__.py
│       │   ├── database.py          # SQLAlchemy models (all entities)
│       │   ├── schemas.py           # Pydantic request/response schemas
│       │   └── enums.py             # Shared enums (CampaignStatus, VectorType, etc.)
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py           # Async engine + session factory
│       │   └── migrations/          # Alembic migrations
│       │       ├── env.py
│       │       └── versions/
│       ├── cli/
│       │   ├── __init__.py
│       │   ├── main.py              # Click group + subcommands
│       │   ├── campaign.py          # Campaign commands
│       │   ├── targets.py           # Target management commands
│       │   ├── stats.py             # Analytics display commands
│       │   └── server.py            # Server management commands
│       ├── worker.py                # Celery app + task definitions
│       └── config.py                # Pydantic Settings (env-based config)
├── web/                              # React frontend (separate build)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/                     # API client (generated from OpenAPI)
│   │   └── App.tsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   ├── conftest.py                  # Shared fixtures (test db, client, factories)
│   ├── factories.py                 # factory_boy factories for all models
│   ├── test_api/
│   │   ├── test_auth.py
│   │   ├── test_campaigns.py
│   │   ├── test_tracking.py
│   │   └── test_analytics.py
│   ├── test_core/
│   │   ├── test_engine.py
│   │   ├── test_scoring.py
│   │   └── test_training.py
│   ├── test_vectors/
│   │   ├── test_email.py
│   │   ├── test_qr.py
│   │   └── test_fake_login.py
│   └── test_services/
│       ├── test_llm.py
│       └── test_delivery.py
├── templates/                        # Fake login page templates
│   ├── generic_sso.html
│   ├── google_login.html
│   └── microsoft_login.html
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml           # Dev overrides (hot reload, debug)
├── pyproject.toml                   # Project metadata, deps, tool config
├── alembic.ini
├── .env.example                     # Template for environment variables
├── .gitignore
├── LICENSE                          # Apache 2.0
└── README.md
```

---

## 19. Phased Roadmap

### Phase 1 — Foundation (Weeks 1-3)

**Goal:** Working API skeleton, database, auth, CLI, and Docker setup. No AI, no delivery — just the plumbing.

**Deliverables:**
- [ ] Repository setup: pyproject.toml, ruff config, mypy config, .gitignore
- [ ] Pydantic models (schemas.py) for all request/response types
- [ ] SQLAlchemy models (database.py) for all entities
- [ ] Alembic migration setup + initial migration
- [ ] FastAPI app with route stubs returning mock data
- [ ] JWT auth (register, login, refresh, org isolation middleware)
- [ ] Campaign CRUD endpoints (create, list, get, update, delete)
- [ ] Target group CRUD + CSV import
- [ ] Click CLI: `specter campaign list`, `specter campaign create`
- [ ] Docker setup: Dockerfile (multi-stage), docker-compose.yml
- [ ] Health check endpoint
- [ ] Basic pytest setup with async test client
- [ ] GitHub Actions CI (ruff + mypy + pytest)

**Exit criteria:** `specter campaign create` → `specter campaign list` works end-to-end through the API. `docker compose up` starts the full stack. CI passes on every push.

### Phase 2 — Email vector + LLM integration (Weeks 3-5)

**Goal:** A complete email phishing simulation that generates, delivers, tracks, and provides feedback.

**Deliverables:**
- [ ] LLM provider interface + OpenAI implementation + Mock provider
- [ ] Prompt engineering system with scenario templates
- [ ] Email vector implementation (content generation → SMTP delivery)
- [ ] Tracking endpoints: pixel, link click, report
- [ ] Event logging for all tracking interactions
- [ ] Training page: static HTML showing red flag breakdown
- [ ] Basic AI-generated feedback (red flag explanations)
- [ ] Campaign launch flow: draft → running (dispatches to Celery worker)
- [ ] Celery worker + Redis broker setup in Docker Compose
- [ ] `specter simulate --vector email` quick-run command
- [ ] Integration tests for full simulation lifecycle

**Exit criteria:** Create a campaign, add targets, launch it, receive a real phishing email, click the link, see the training page with AI-generated feedback. Events are logged and queryable.

### Phase 3 — DevOps pipeline (Weeks 5-7)

**Goal:** Production-grade deployment story. This is the phase that demonstrates DevOps maturity.

**Deliverables:**
- [ ] Multi-stage Dockerfile optimized for size (< 200MB)
- [ ] docker-compose.dev.yml with hot reload + debug config
- [ ] GitHub Actions CI: ruff, mypy, pytest with coverage, container build
- [ ] GitHub Actions CD: build + push to GHCR on tag
- [ ] Terraform module for Azure Container Apps
- [ ] terraform.tfvars for dev/staging/prod environments
- [ ] Structured logging with correlation IDs (structlog)
- [ ] Prometheus metrics endpoint
- [ ] Health check with dependency status (DB, Redis, worker)
- [ ] .env.example with documented variables
- [ ] SELF_HOSTING.md documentation
- [ ] Alembic auto-migration on startup

**Exit criteria:** Tag a release → container auto-builds and pushes to GHCR. `terraform apply` deploys to Azure. Structured logs and metrics are accessible. Documentation is complete enough for someone else to deploy.

### Phase 4 — Additional attack vectors (Weeks 7-10)

**Goal:** QR codes (OSS) and SMS + fake logins + pretexting (Pro).

**Deliverables:**
- [ ] QR code vector: generation, tracking, poster template export
- [ ] SMS vector: Twilio integration, delivery, tracking
- [ ] Fake login page vector: template system, credential tracking (no storage), redirect to training
- [ ] Pretexting vector: scenario generation, scoring rubric, PDF export
- [ ] Attack vector plugin interface (make it easy to add new vectors)
- [ ] Pro tier feature gating (402 responses for Pro features on free tier)
- [ ] CLI commands for all new vectors
- [ ] Tests for each vector

**Exit criteria:** A single campaign can use multiple vectors simultaneously. QR code campaigns generate downloadable posters. Fake login pages capture and safely discard credentials.

### Phase 5 — Web dashboard + analytics (Weeks 10-14)

**Goal:** Full React dashboard with campaign management and analytics.

**Deliverables:**
- [ ] React + Vite + Tailwind project setup
- [ ] API client auto-generated from OpenAPI spec
- [ ] Auth flow (login, token refresh, logout)
- [ ] Dashboard overview page (key metrics, active campaigns)
- [ ] Campaign list + detail pages
- [ ] Campaign builder (multi-step form)
- [ ] Target group management
- [ ] Analytics dashboard with charts (Recharts)
- [ ] Department comparison view
- [ ] Per-user performance view
- [ ] Adaptive AI difficulty engine (score-based tier selection)
- [ ] Real-time campaign progress (polling or SSE)
- [ ] Web Dockerfile + Nginx config
- [ ] Docker Compose updated with web service

**Exit criteria:** Full campaign lifecycle manageable through the web UI. Analytics dashboard shows meaningful data from past campaigns. Adaptive difficulty adjusts per-user.

### Phase 6 — Multi-tenant + monetization (Weeks 14-18)

**Goal:** Production-ready for multiple organizations with billing.

**Deliverables:**
- [ ] Multi-tenant data isolation (org_id scoping verified with tests)
- [ ] RBAC enforcement (admin, campaign_manager, viewer, target)
- [ ] SAML/SSO integration (python-saml2)
- [ ] Compliance report generation (PDF export)
- [ ] Webhook integrations (Slack, Teams, generic)
- [ ] Stripe billing integration for Pro tier
- [ ] License key validation for self-hosted Pro
- [ ] Rate limiting per-org
- [ ] Audit logging
- [ ] CONTRIBUTING.md + contributor setup guide
- [ ] Public documentation site
- [ ] Landing page

**Exit criteria:** Two separate organizations can use the same Specter instance without seeing each other's data. Pro features are gated behind billing. Compliance reports generate clean PDFs.

---

## 20. Success Metrics

### Technical metrics
- API response time p95 < 200ms
- Campaign delivery rate > 99% (simulations sent / simulations scheduled)
- CI pipeline execution time < 5 minutes
- Test coverage > 80%
- Zero critical security vulnerabilities (run `bandit` + `safety` in CI)
- Container image size < 200MB

### Product metrics (post-launch)
- GitHub stars (target: 500 in first 6 months)
- Docker pulls (target: 1000 in first 6 months)
- Self-hosted deployments (tracked via opt-in telemetry)
- Pro tier conversions
- Community contributions (PRs, issues, discussions)

### Portfolio metrics
- Demonstrates: Python, FastAPI, SQLAlchemy, Docker, CI/CD, Terraform, cloud deployment, LLM integration, security awareness
- Talking points for interviews: architecture decisions, scaling considerations, open-core business model, security considerations for a security tool

---

## 21. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LLM API costs spiral during campaigns | High | Medium | Token budget per campaign, local Ollama as default for OSS, caching of similar prompts |
| Specter used as actual spam/phishing tool | Critical | Medium | Rate limiting, mandatory disclosure on training pages, audit logging, abuse reporting |
| Scope creep delays shipping | High | High | Phase 1-3 are the minimum viable portfolio piece. Ship those first, iterate publicly. |
| Email deliverability issues (spam filters) | Medium | High | SPF/DKIM documentation, recommend dedicated sending domain, provide deliverability testing tools |
| Competitor launches similar OSS tool | Medium | Low | Ship fast, build community, differentiate on adaptive AI + multi-vector |
| LLM generates inappropriate content | Medium | Medium | Output filtering, content safety prompts, human review option for first N campaigns |

---

## 22. Future Considerations

Features explicitly deferred from v1 to keep scope manageable:

- **Slack/Teams bot integration:** Direct message phishing simulations within chat platforms
- **Browser extension:** Real-time phishing detection training while browsing
- **Mobile app:** Push notification-based simulations
- **API marketplace:** Community-contributed attack templates and scenarios
- **Gamification:** Leaderboards, badges, streaks for security awareness
- **SCORM export:** Training modules compatible with existing LMS platforms
- **Red team mode:** Full adversary emulation beyond social engineering (network, physical)
- **AI-powered defense:** Use the same LLM to analyze incoming real emails for phishing indicators (flip the product — from offense to defense)

---

*This document is a living blueprint. Update it as architectural decisions are made and scope evolves.*