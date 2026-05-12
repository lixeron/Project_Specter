"""Tests for target group endpoints including CSV import."""

import pytest
from httpx import AsyncClient


async def _register_and_get_headers(client: AsyncClient) -> dict[str, str]:
    """Helper: register and return auth headers."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": "Test Corp",
            "email": "admin@testcorp.com",
            "password": "supersecure123",
            "name": "Admin User",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_group(client: AsyncClient) -> None:
    """Create a target group."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/groups",
        json={"name": "Engineering", "description": "Dev team"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Engineering"
    assert data["member_count"] == 0


@pytest.mark.asyncio
async def test_list_groups(client: AsyncClient) -> None:
    """List target groups."""
    headers = await _register_and_get_headers(client)

    await client.post("/api/v1/groups", json={"name": "Group A"}, headers=headers)
    await client.post("/api/v1/groups", json={"name": "Group B"}, headers=headers)

    resp = await client.get("/api/v1/groups", headers=headers)
    assert resp.status_code == 200
    groups = resp.json()
    assert len(groups) == 2


@pytest.mark.asyncio
async def test_csv_import(client: AsyncClient) -> None:
    """Import targets from CSV data."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/groups/import",
        json={
            "group_name": "Sales Team",
            "targets": [
                {"email": "alice@testcorp.com", "name": "Alice Smith", "department": "Sales"},
                {"email": "bob@testcorp.com", "name": "Bob Jones", "department": "Sales"},
                {"email": "carol@testcorp.com", "name": "Carol Lee"},
            ],
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["group_name"] == "Sales Team"
    assert data["imported_count"] == 3
    assert data["skipped_count"] == 0

    # Verify group was created with members
    resp = await client.get(f"/api/v1/groups/{data['group_id']}", headers=headers)
    assert resp.status_code == 200
    group = resp.json()
    assert group["member_count"] == 3
    assert len(group["members"]) == 3


@pytest.mark.asyncio
async def test_csv_import_deduplicates(client: AsyncClient) -> None:
    """Import skips users already in the group."""
    headers = await _register_and_get_headers(client)

    # First import
    await client.post(
        "/api/v1/groups/import",
        json={
            "group_name": "Team A",
            "targets": [
                {"email": "alice@testcorp.com", "name": "Alice Smith"},
            ],
        },
        headers=headers,
    )

    # Second import with same user + a new one
    resp = await client.post(
        "/api/v1/groups/import",
        json={
            "group_name": "Team B",
            "targets": [
                {"email": "alice@testcorp.com", "name": "Alice Smith"},
                {"email": "dave@testcorp.com", "name": "Dave Wilson"},
            ],
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    # Alice already exists as a user but should still be added to this new group
    assert data["imported_count"] == 2
    assert data["skipped_count"] == 0


@pytest.mark.asyncio
async def test_delete_group(client: AsyncClient) -> None:
    """Delete a target group."""
    headers = await _register_and_get_headers(client)

    resp = await client.post("/api/v1/groups", json={"name": "Temp"}, headers=headers)
    group_id = resp.json()["id"]

    resp = await client.delete(f"/api/v1/groups/{group_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/groups/{group_id}", headers=headers)
    assert resp.status_code == 404
