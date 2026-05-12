"""Tests for simulation and tracking endpoints."""

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
async def test_quick_simulate(client: AsyncClient) -> None:
    """Quick simulate generates a phishing email."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "general", "tone": "urgent"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()

    # Check email content
    assert "email" in data
    assert "subject" in data["email"]
    assert "body_text" in data["email"]
    assert data["email"]["subject"]  # Not empty

    # Check red flags
    assert "red_flags" in data
    assert len(data["red_flags"]) > 0

    # Check tracking info
    assert "tracking_token" in data
    assert "tracking_url" in data
    assert "simulation_id" in data


@pytest.mark.asyncio
async def test_quick_simulate_credential_topic(client: AsyncClient) -> None:
    """Quick simulate with credential topic uses credential template."""
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "credential", "tone": "urgent"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert (
        "password" in data["email"]["subject"].lower()
        or "password" in data["email"]["body_text"].lower()
    )


@pytest.mark.asyncio
async def test_tracking_click(client: AsyncClient) -> None:
    """Clicking a tracking link logs the event and shows training page."""
    headers = await _register_and_get_headers(client)

    # Generate a simulation first
    sim_resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "general", "tone": "urgent"},
        headers=headers,
    )
    token = sim_resp.json()["tracking_token"]

    # Click the tracking link
    resp = await client.get(f"/t/{token}")
    assert resp.status_code == 200
    assert "simulated phishing attack" in resp.text.lower()
    assert "Red Flags" in resp.text or "red flag" in resp.text.lower()


@pytest.mark.asyncio
async def test_tracking_pixel(client: AsyncClient) -> None:
    """Tracking pixel returns a 1x1 GIF."""
    headers = await _register_and_get_headers(client)

    sim_resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "general", "tone": "urgent"},
        headers=headers,
    )
    token = sim_resp.json()["tracking_token"]

    resp = await client.get(f"/t/{token}/px")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/gif"


@pytest.mark.asyncio
async def test_tracking_report(client: AsyncClient) -> None:
    """Reporting a simulation returns success."""
    headers = await _register_and_get_headers(client)

    sim_resp = await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "general", "tone": "urgent"},
        headers=headers,
    )
    token = sim_resp.json()["tracking_token"]

    resp = await client.post(f"/t/{token}/report")
    assert resp.status_code == 200
    assert resp.json()["status"] == "reported"


@pytest.mark.asyncio
async def test_tracking_invalid_token(client: AsyncClient) -> None:
    """Invalid tracking token returns 404."""
    resp = await client.get("/t/nonexistent-token-12345")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_simulations(client: AsyncClient) -> None:
    """List simulations returns created simulations."""
    headers = await _register_and_get_headers(client)

    # Create a simulation
    await client.post(
        "/api/v1/simulations/quick",
        json={"vector": "email", "topic": "general", "tone": "urgent"},
        headers=headers,
    )

    # List simulations
    resp = await client.get("/api/v1/simulations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["vector"] == "email"
