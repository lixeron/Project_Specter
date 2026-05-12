"""Initial migration — create all tables.

Revision ID: 001_initial
Revises: None
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Organizations ────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column("plan", sa.String(20), server_default="free"),
        sa.Column("settings", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── Users ────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(30), server_default="target"),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("security_score", sa.Integer, server_default="50"),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_users_org", "users", ["org_id"])
    op.create_index("idx_users_org_dept", "users", ["org_id", "department"])
    op.create_index("idx_users_email_org", "users", ["email", "org_id"], unique=True)

    # ── Target Groups ────────────────────────────
    op.create_table(
        "target_groups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── Target Group Members (join table) ────────
    op.create_table(
        "target_group_members",
        sa.Column(
            "target_group_id",
            sa.String(36),
            sa.ForeignKey("target_groups.id"),
            primary_key=True,
        ),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
    )

    # ── Campaigns ────────────────────────────────
    op.create_table(
        "campaigns",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("vectors", sa.JSON, nullable=True),
        sa.Column(
            "target_group_id", sa.String(36), sa.ForeignKey("target_groups.id"), nullable=True
        ),
        sa.Column("schedule", sa.JSON, nullable=True),
        sa.Column("settings", sa.JSON, nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_campaigns_org_status", "campaigns", ["org_id", "status"])

    # ── Simulations ──────────────────────────────
    op.create_table(
        "simulations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("campaign_id", sa.String(36), sa.ForeignKey("campaigns.id"), nullable=False),
        sa.Column("target_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vector", sa.String(20), nullable=False),
        sa.Column("difficulty_tier", sa.String(20), server_default="intermediate"),
        sa.Column("content", sa.JSON, nullable=True),
        sa.Column("red_flags", sa.JSON, nullable=True),
        sa.Column("tracking_token", sa.String(64), unique=True, nullable=False),
        sa.Column("delivered_at", sa.DateTime, nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_simulations_campaign", "simulations", ["campaign_id"])
    op.create_index("idx_simulations_target", "simulations", ["target_user_id"])
    op.create_index("idx_simulations_token", "simulations", ["tracking_token"], unique=True)

    # ── Events ───────────────────────────────────
    op.create_table(
        "events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("simulation_id", sa.String(36), sa.ForeignKey("simulations.id"), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_events_simulation", "events", ["simulation_id"])
    op.create_index("idx_events_type_created", "events", ["event_type", "created_at"])

    # ── Training Results ─────────────────────────
    op.create_table(
        "training_results",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("simulation_id", sa.String(36), sa.ForeignKey("simulations.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("red_flags_identified", sa.JSON, nullable=True),
        sa.Column("red_flags_missed", sa.JSON, nullable=True),
        sa.Column("feedback_content", sa.JSON, nullable=True),
        sa.Column("time_spent_seconds", sa.Integer, nullable=True),
        sa.Column("quiz_score", sa.Float, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("training_results")
    op.drop_table("events")
    op.drop_table("simulations")
    op.drop_table("campaigns")
    op.drop_table("target_group_members")
    op.drop_table("target_groups")
    op.drop_table("users")
    op.drop_table("organizations")
