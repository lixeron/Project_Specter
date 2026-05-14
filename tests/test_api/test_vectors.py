"""Tests for multi-vector simulations and Pro tier gating."""

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
async def test_list_vectors(client: AsyncClient) -> None:
    """Vector listing endpoint returns all vectors with tier info."""
    headers = await _register_and_get_headers(client)

    resp = await client.get("/api/v1/simulations/vectors", headers=headers)
    assert resp.status_code == 200
    vectors = resp.json()
    assert len(vectors) >= 4

    types = {v["type"] for v in vectors}
    assert "email" in types
    assert "qr" in types
    assert "fake_login" in types
    assert "pretext" in types

    # Check tier labels
    for v in vectors:
        if v["type"] in ("fake_login", "pretext", "sms"):
            assert v["requires_pro"] is True
        elif v["type"] in ("email", "qr"):
            assert v["requires_pro"] is False


@pytest.mark.asyncio
async def test_qr_simulation(client: AsyncClient) -> None:
    """QR code simulation generates QR image and poster."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "qr", "topic": "wifi", "tone": ""},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()

    assert data["vector"] == "qr"
    assert "qr_image_base64" in data["content"]
    assert "poster_html" in data["content"]
    assert len(data["red_flags"]) > 0
    assert data["content"]["pretext"] == "Free Company WiFi"


@pytest.mark.asyncio
async def test_qr_poster_endpoint(client: AsyncClient) -> None:
    """QR poster endpoint returns printable HTML."""
    headers = await _register_and_get_headers(client)

    sim_resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "qr", "topic": "survey", "tone": ""},
        headers=headers,
    )
    sim_id = sim_resp.json()["simulation_id"]

    resp = await client.get(
        f"/api/v1/simulations/quick/{sim_id}/poster",
        headers=headers,
    )
    assert resp.status_code == 200
    assert "Employee Survey" in resp.text


@pytest.mark.asyncio
async def test_pro_gate_blocks_free_tier(client: AsyncClient) -> None:
    """Pro vectors return 402 for free tier orgs."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "fake_login", "topic": "microsoft", "tone": ""},
        headers=headers,
    )
    assert resp.status_code == 402
    data = resp.json()
    assert data["detail"]["error"] == "pro_required"


@pytest.mark.asyncio
async def test_pro_gate_blocks_pretext(client: AsyncClient) -> None:
    """Pretext vector returns 402 for free tier orgs."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "pretext", "topic": "it_support", "tone": ""},
        headers=headers,
    )
    assert resp.status_code == 402


@pytest.mark.asyncio
async def test_email_simulation_still_works(client: AsyncClient) -> None:
    """Email simulation still works after multi-vector changes."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "credential", "tone": "urgent"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["vector"] == "email"
    assert "subject" in data["content"]
