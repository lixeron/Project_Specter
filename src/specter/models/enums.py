"""Shared enums for Specter models."""

from enum import StrEnum


class CampaignStatus(StrEnum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class VectorType(StrEnum):
    EMAIL = "email"
    SMS = "sms"
    QR = "qr"
    FAKE_LOGIN = "fake_login"
    PRETEXT = "pretext"


class DifficultyTier(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class DifficultyMode(StrEnum):
    ADAPTIVE = "adaptive"
    FIXED = "fixed"


class UserRole(StrEnum):
    ADMIN = "admin"
    CAMPAIGN_MANAGER = "campaign_manager"
    VIEWER = "viewer"
    TARGET = "target"


class OrgPlan(StrEnum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SimulationStatus(StrEnum):
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"


class EventType(StrEnum):
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPORTED = "reported"
    CREDENTIALS_SUBMITTED = "credentials_submitted"
    QR_SCANNED = "qr_scanned"
    TRAINING_STARTED = "training_started"
    TRAINING_COMPLETED = "training_completed"
    IGNORED = "ignored"
