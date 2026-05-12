"""SQLAlchemy ORM models for Specter."""

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


def generate_uuid() -> str:
    return str(uuid.uuid4())


# ── Association tables ───────────────────────────────────────
from sqlalchemy import Column

target_group_members = Table(
    "target_group_members",
    Base.metadata,
    Column("target_group_id", String(36), ForeignKey("target_groups.id"), primary_key=True),
    Column("user_id", String(36), ForeignKey("users.id"), primary_key=True),
)


# ── Organization ─────────────────────────────────────────────


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="organization", cascade="all, delete")
    campaigns: Mapped[list["Campaign"]] = relationship(
        back_populates="organization", cascade="all, delete"
    )
    target_groups: Mapped[list["TargetGroup"]] = relationship(
        back_populates="organization", cascade="all, delete"
    )


# ── User ─────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_org", "org_id"),
        Index("idx_users_org_dept", "org_id", "department"),
        Index("idx_users_email_org", "email", "org_id", unique=True),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="target")
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    security_score: Mapped[int] = mapped_column(Integer, default=50)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="users")
    target_groups: Mapped[list["TargetGroup"]] = relationship(
        secondary=target_group_members, back_populates="members"
    )


# ── Target Group ─────────────────────────────────────────────


class TargetGroup(Base):
    __tablename__ = "target_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="target_groups")
    members: Mapped[list["User"]] = relationship(
        secondary=target_group_members, back_populates="target_groups"
    )


# ── Campaign ─────────────────────────────────────────────────


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (Index("idx_campaigns_org_status", "org_id", "status"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    vectors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    target_group_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("target_groups.id"), nullable=True
    )
    schedule: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="campaigns")
    creator: Mapped["User"] = relationship()
    target_group: Mapped["TargetGroup | None"] = relationship()
    simulations: Mapped[list["Simulation"]] = relationship(
        back_populates="campaign", cascade="all, delete"
    )


# ── Simulation ───────────────────────────────────────────────


class Simulation(Base):
    __tablename__ = "simulations"
    __table_args__ = (
        Index("idx_simulations_campaign", "campaign_id"),
        Index("idx_simulations_target", "target_user_id"),
        Index("idx_simulations_token", "tracking_token", unique=True),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    campaign_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("campaigns.id"), nullable=False
    )
    target_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    vector: Mapped[str] = mapped_column(String(20), nullable=False)
    difficulty_tier: Mapped[str] = mapped_column(String(20), default="intermediate")
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    red_flags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tracking_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    campaign: Mapped["Campaign"] = relationship(back_populates="simulations")
    target_user: Mapped["User"] = relationship()
    events: Mapped[list["Event"]] = relationship(
        back_populates="simulation", cascade="all, delete"
    )


# ── Event ────────────────────────────────────────────────────


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("idx_events_simulation", "simulation_id"),
        Index("idx_events_type_created", "event_type", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    simulation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("simulations.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    simulation: Mapped["Simulation"] = relationship(back_populates="events")


# ── Training Result ──────────────────────────────────────────


class TrainingResult(Base):
    __tablename__ = "training_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    simulation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("simulations.id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    red_flags_identified: Mapped[list | None] = mapped_column(JSON, nullable=True)
    red_flags_missed: Mapped[list | None] = mapped_column(JSON, nullable=True)
    feedback_content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quiz_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    simulation: Mapped["Simulation"] = relationship()
    user: Mapped["User"] = relationship()
