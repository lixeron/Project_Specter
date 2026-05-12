"""Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from specter.models.enums import (
    CampaignStatus,
    DifficultyMode,
    DifficultyTier,
    OrgPlan,
    UserRole,
    VectorType,
)

# ── Auth ─────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Organization ─────────────────────────────────────────────


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: OrgPlan
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User ─────────────────────────────────────────────────────


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    department: str | None = None
    security_score: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: UserRole = UserRole.TARGET
    department: str | None = None


class UserUpdateRequest(BaseModel):
    name: str | None = None
    role: UserRole | None = None
    department: str | None = None


# ── Target Group ─────────────────────────────────────────────


class TargetGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class TargetGroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TargetGroupResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    member_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class TargetGroupDetailResponse(TargetGroupResponse):
    members: list[UserResponse] = []


class MembersAddRequest(BaseModel):
    user_ids: list[str]


class MembersRemoveRequest(BaseModel):
    user_ids: list[str]


class CsvTargetRow(BaseModel):
    email: EmailStr
    name: str
    department: str | None = None
    role: str | None = None


class CsvImportRequest(BaseModel):
    group_name: str = Field(..., min_length=1, max_length=255)
    targets: list[CsvTargetRow]


class CsvImportResponse(BaseModel):
    group_name: str
    group_id: str
    imported_count: int
    skipped_count: int


# ── Campaign ─────────────────────────────────────────────────


class CampaignSettings(BaseModel):
    difficulty_mode: DifficultyMode = DifficultyMode.ADAPTIVE
    fixed_tier: DifficultyTier | None = None
    send_window_start: str | None = None  # e.g. "09:00"
    send_window_end: str | None = None  # e.g. "17:00"


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    vectors: list[VectorType] = [VectorType.EMAIL]
    target_group_id: str | None = None
    settings: CampaignSettings = CampaignSettings()


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    vectors: list[VectorType] | None = None
    target_group_id: str | None = None
    settings: CampaignSettings | None = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: CampaignStatus
    vectors: list[str] | None = None
    target_group_id: str | None = None
    settings: dict | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignListResponse(BaseModel):
    campaigns: list[CampaignResponse]
    total: int
    page: int
    page_size: int


# ── Simulation ───────────────────────────────────────────────


class SimulationResponse(BaseModel):
    id: str
    campaign_id: str
    target_user_id: str
    vector: VectorType
    difficulty_tier: DifficultyTier
    status: str
    delivered_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class QuickSimulateRequest(BaseModel):
    vector: VectorType = VectorType.EMAIL
    topic: str = "general"
    tone: str = "urgent"
    target_email: str | None = None


# ── Analytics ────────────────────────────────────────────────


class OrgOverviewResponse(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_simulations: int
    overall_click_rate: float
    overall_report_rate: float
    avg_security_score: float
    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL


# ── Health ───────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    environment: str
