"""Tests for auth and health endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Health endpoint returns ok."""
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_register(client: AsyncClient) -> None:
    """Register creates org + user and returns tokens."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": "Test Corp",
            "email": "admin@testcorp.com",
            "password": "supersecure123",
            "name": "Admin User",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Duplicate email registration returns 409."""
    payload = {
        "org_name": "Test Corp",
        "email": "admin@testcorp.com",
        "password": "supersecure123",
        "name": "Admin User",
    }
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client: AsyncClient) -> None:
    """Login with valid credentials returns tokens."""
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": "Test Corp",
            "email": "admin@testcorp.com",
            "password": "supersecure123",
            "name": "Admin User",
        },
    )

    # Login
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@testcorp.com", "password": "supersecure123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient) -> None:
    """Login with wrong password returns 401."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": "Test Corp",
            "email": "admin@testcorp.com",
            "password": "supersecure123",
            "name": "Admin User",
        },
    )

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@testcorp.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_auth(client: AsyncClient) -> None:
    """Accessing campaigns without auth returns 403."""
    resp = await client.get("/api/v1/campaigns")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_campaign_crud(client: AsyncClient) -> None:
    """Full campaign CRUD flow."""
    # Register and get token
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": "Test Corp",
            "email": "admin@testcorp.com",
            "password": "supersecure123",
            "name": "Admin User",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create campaign
    resp = await client.post(
        "/api/v1/campaigns",
        json={"name": "Q1 Phishing Test", "vectors": ["email"]},
        headers=headers,
    )
    assert resp.status_code == 201
    campaign = resp.json()
    assert campaign["name"] == "Q1 Phishing Test"
    assert campaign["status"] == "draft"
    campaign_id = campaign["id"]

    # List campaigns
    resp = await client.get("/api/v1/campaigns", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    # Get campaign
    resp = await client.get(f"/api/v1/campaigns/{campaign_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Q1 Phishing Test"

    # Update campaign
    resp = await client.patch(
        f"/api/v1/campaigns/{campaign_id}",
        json={"name": "Q1 Phishing Test — Updated"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Q1 Phishing Test — Updated"

    # Delete campaign
    resp = await client.delete(f"/api/v1/campaigns/{campaign_id}", headers=headers)
    assert resp.status_code == 204

    # Verify deletion
    resp = await client.get(f"/api/v1/campaigns/{campaign_id}", headers=headers)
    assert resp.status_code == 404
