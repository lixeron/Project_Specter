"""Authentication endpoints — register, login, refresh."""

import re

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from specter.api.deps import (
    DbSession,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from specter.models.database import Organization, User
from specter.models.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(name: str) -> str:
    """Convert org name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DbSession) -> TokenResponse:
    """Create a new organization and admin user."""
    # Check if email is already in use
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create organization
    slug = _slugify(body.org_name)
    existing_org = await db.execute(select(Organization).where(Organization.slug == slug))
    if existing_org.scalar_one_or_none():
        slug = f"{slug}-{User.__tablename__[:4]}"  # Simple dedup

    org = Organization(name=body.org_name, slug=slug)
    db.add(org)
    await db.flush()  # Get org.id

    # Create admin user
    user = User(
        org_id=org.id,
        email=body.email,
        name=body.name,
        role="admin",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()  # Get user.id

    return TokenResponse(
        access_token=create_access_token(user.id, org.id),
        refresh_token=create_refresh_token(user.id, org.id),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    """Authenticate and return tokens."""
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(user.id, user.org_id),
        refresh_token=create_refresh_token(user.id, user.org_id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: DbSession) -> TokenResponse:
    """Refresh an access token."""
    payload = decode_token(body.refresh_token, expected_type="refresh")
    user_id = payload.get("sub")
    org_id = payload.get("org")

    if not user_id or not org_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return TokenResponse(
        access_token=create_access_token(user.id, user.org_id),
        refresh_token=create_refresh_token(user.id, user.org_id),
    )
