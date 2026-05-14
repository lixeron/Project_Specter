"""Simulation endpoints — quick simulate, list, and vector-specific generation."""

import secrets
from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from specter.api.deps import CurrentUser, DbSession
from specter.core.pro_gate import check_pro_tier
from specter.models.database import Campaign, Organization, Simulation
from specter.models.schemas import QuickSimulateRequest, SimulationResponse
from specter.services.llm import generate_phishing_email
from specter.vectors import is_pro_vector, list_vectors
from specter.vectors.fake_login import generate_login_page_html
from specter.vectors.qr import QRCodeVector, generate_poster_html, generate_qr_image

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.get("/vectors")
async def available_vectors() -> list[dict[str, Any]]:
    """List all available attack vectors and their tier requirements."""
    return list_vectors()


@router.post("/quick", status_code=status.HTTP_201_CREATED)
async def quick_simulate(
    body: QuickSimulateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, Any]:
    """Generate a single simulation for testing — no campaign needed.

    Supports all vector types. Pro vectors require an upgraded org plan.
    """
    vector_type = body.vector.value

    # Check Pro tier if needed
    if is_pro_vector(vector_type):
        await check_pro_tier(current_user.org_id, db)

    # Get org info
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = result.scalar_one_or_none()
    org_name = org.name if org else "Organization"

    # Create tracking token
    tracking_token = secrets.token_urlsafe(32)

    from specter.config import get_settings

    settings = get_settings()
    tracking_url = f"{settings.base_url}/t/{tracking_token}"

    # Generate content based on vector type
    if vector_type == "qr":
        content = await _generate_qr_content(
            current_user.name,
            current_user.department or "General",
            org_name,
            body.topic,
            tracking_url,
        )
    elif vector_type == "fake_login":
        content = _generate_fake_login_content(org_name, body.topic, tracking_token)
    elif vector_type == "pretext":
        content = await _generate_pretext_content(
            current_user.name,
            current_user.department or "General",
            org_name,
            body.topic,
        )
    else:
        # Default: email vector
        content = await _generate_email_content(
            current_user.name,
            current_user.department or "General",
            org_name,
            body.topic,
            body.tone,
            tracking_url,
        )

    # Save simulation
    quick_campaign = Campaign(
        org_id=current_user.org_id,
        created_by=current_user.id,
        name=f"Quick Sim — {vector_type}/{body.topic}",
        status="completed",
        vectors=[vector_type],
    )
    db.add(quick_campaign)
    await db.flush()

    simulation = Simulation(
        campaign_id=quick_campaign.id,
        target_user_id=current_user.id,
        vector=vector_type,
        difficulty_tier="intermediate",
        content=content,
        red_flags=content.get("red_flags", []),
        tracking_token=tracking_token,
        status="delivered",
    )
    db.add(simulation)
    await db.flush()

    return {
        "simulation_id": simulation.id,
        "vector": vector_type,
        "tracking_token": tracking_token,
        "tracking_url": tracking_url,
        "training_url": tracking_url,
        "content": content,
        "red_flags": content.get("red_flags", []),
        "social_engineering_tactics": content.get("social_engineering_tactics", []),
    }


async def _generate_email_content(
    target_name: str,
    department: str,
    org_name: str,
    topic: str,
    tone: str,
    tracking_url: str,
) -> dict[str, Any]:
    """Generate email phishing content."""
    email_content = await generate_phishing_email(
        target_name=target_name,
        target_department=department,
        org_name=org_name,
        topic=topic,
        tone=tone,
        difficulty="intermediate",
    )

    # Replace tracking URL placeholders
    for field in ["body_html", "body_text"]:
        if field in email_content:
            val = str(email_content[field])
            val = val.replace("{TRACKING_URL}", tracking_url)
            val = val.replace("{{TRACKING_URL}}", tracking_url)
            email_content[field] = val

    email_content["vector"] = "email"
    return email_content


async def _generate_qr_content(
    target_name: str,
    department: str,
    org_name: str,
    topic: str,
    tracking_url: str,
) -> dict[str, Any]:
    """Generate QR code attack content with image."""
    vector = QRCodeVector()
    content = await vector.generate_content(
        target_name=target_name,
        target_department=department,
        org_name=org_name,
        topic=topic,
        tone="",
        difficulty="intermediate",
    )

    # Generate QR code image
    qr_base64 = generate_qr_image(tracking_url)
    content["qr_image_base64"] = qr_base64
    content["qr_data_uri"] = f"data:image/png;base64,{qr_base64}"

    # Generate printable poster
    content["poster_html"] = generate_poster_html(
        title=content["poster_title"],
        body=content["poster_body"],
        qr_base64=qr_base64,
        org_name=org_name,
    )

    return content


def _generate_fake_login_content(
    org_name: str,
    topic: str,
    tracking_token: str,
) -> dict[str, Any]:
    """Generate fake login page content."""
    template_name = (
        topic.lower()
        if topic.lower() in ("generic_sso", "microsoft", "google", "okta")
        else "generic_sso"
    )

    login_html = generate_login_page_html(
        template_name=template_name,
        tracking_token=tracking_token,
        org_name=org_name,
    )

    return {
        "vector": "fake_login",
        "template": template_name,
        "login_page_html": login_html,
        "red_flags": [
            "Check the URL — legitimate login pages use official domains",
            "Be suspicious of login prompts you didn't initiate",
            "Look for HTTPS and valid certificates",
            "Verify with IT if you receive unexpected login requests",
        ],
        "social_engineering_tactics": ["familiarity", "trust", "urgency"],
    }


async def _generate_pretext_content(
    target_name: str,
    department: str,
    org_name: str,
    topic: str,
) -> dict[str, Any]:
    """Generate pretexting scenario content."""
    from specter.vectors.pretext import PretextVector

    vector = PretextVector()
    return await vector.generate_content(
        target_name=target_name,
        target_department=department,
        org_name=org_name,
        topic=topic,
        tone="",
        difficulty="intermediate",
    )


@router.get("/quick/{simulation_id}/poster", response_class=HTMLResponse)
async def get_poster(
    simulation_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> HTMLResponse:
    """Get the printable poster HTML for a QR code simulation."""
    result = await db.execute(
        select(Simulation)
        .join(Campaign)
        .where(
            Simulation.id == simulation_id,
            Campaign.org_id == current_user.org_id,
        )
    )
    sim = result.scalar_one_or_none()
    if not sim or not sim.content:
        return HTMLResponse("<h1>Not found</h1>", status_code=404)

    poster_html = sim.content.get("poster_html", "<h1>No poster for this simulation</h1>")
    return HTMLResponse(poster_html)


@router.get("/quick/{simulation_id}/login", response_class=HTMLResponse)
async def get_login_page(
    simulation_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> HTMLResponse:
    """Get the fake login page HTML for a credential harvesting simulation."""
    result = await db.execute(
        select(Simulation)
        .join(Campaign)
        .where(
            Simulation.id == simulation_id,
            Campaign.org_id == current_user.org_id,
        )
    )
    sim = result.scalar_one_or_none()
    if not sim or not sim.content:
        return HTMLResponse("<h1>Not found</h1>", status_code=404)

    login_html = sim.content.get("login_page_html", "<h1>No login page for this simulation</h1>")
    return HTMLResponse(login_html)


@router.get("", response_model=list[SimulationResponse])
async def list_simulations(
    current_user: CurrentUser,
    db: DbSession,
    campaign_id: str | None = None,
) -> list[SimulationResponse]:
    """List simulations for the current org."""
    query = select(Simulation).join(Campaign).where(Campaign.org_id == current_user.org_id)

    if campaign_id:
        query = query.where(Simulation.campaign_id == campaign_id)

    query = query.order_by(Simulation.created_at.desc()).limit(100)
    result = await db.execute(query)
    simulations = result.scalars().all()

    return [SimulationResponse.model_validate(s) for s in simulations]
