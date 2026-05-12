"""Simulation endpoints — quick simulate for testing, list/get for viewing."""

import secrets

from fastapi import APIRouter, status
from sqlalchemy import select

from specter.api.deps import CurrentUser, DbSession
from specter.models.database import Campaign, Organization, Simulation
from specter.models.schemas import QuickSimulateRequest, SimulationResponse
from specter.services.llm import generate_phishing_email

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("/quick", status_code=status.HTTP_201_CREATED)
async def quick_simulate(
    body: QuickSimulateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Generate a single simulation for testing — no campaign needed.

    This is the endpoint behind `specter simulate`. It generates a phishing email
    using the LLM, saves it as a simulation, and returns the full content
    including the generated email and red flags.
    """
    # Get org info for personalization
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = result.scalar_one_or_none()
    org_name = org.name if org else "Organization"

    # Generate phishing email via LLM
    email_content = await generate_phishing_email(
        target_name=current_user.name,
        target_department=current_user.department or "General",
        org_name=org_name,
        topic=body.topic,
        tone=body.tone,
        difficulty="intermediate",
    )

    # Create a tracking token
    tracking_token = secrets.token_urlsafe(32)

    # Replace tracking URL placeholder in the generated content
    from specter.config import get_settings

    settings = get_settings()
    tracking_url = f"{settings.base_url}/t/{tracking_token}"

    for field in ["body_html", "body_text"]:
        if field in email_content:
            email_content[field] = email_content[field].replace("{TRACKING_URL}", tracking_url)
            # Also handle double-braced version from LLM output
            email_content[field] = email_content[field].replace("{{TRACKING_URL}}", tracking_url)

    # Save as a simulation (no campaign association for quick sims)
    # Create a dummy campaign for quick simulations
    quick_campaign = Campaign(
        org_id=current_user.org_id,
        created_by=current_user.id,
        name=f"Quick Sim — {body.topic}",
        status="completed",
        vectors=[body.vector.value],
    )
    db.add(quick_campaign)
    await db.flush()

    simulation = Simulation(
        campaign_id=quick_campaign.id,
        target_user_id=current_user.id,
        vector=body.vector.value,
        difficulty_tier="intermediate",
        content=email_content,
        red_flags=email_content.get("red_flags", []),
        tracking_token=tracking_token,
        status="delivered",
    )
    db.add(simulation)
    await db.flush()

    return {
        "simulation_id": simulation.id,
        "tracking_token": tracking_token,
        "tracking_url": tracking_url,
        "training_url": tracking_url,
        "email": {
            "subject": email_content.get("subject", ""),
            "sender_name": email_content.get("sender_name", ""),
            "sender_email": email_content.get("sender_email", ""),
            "body_text": email_content.get("body_text", ""),
            "body_html": email_content.get("body_html", ""),
        },
        "red_flags": email_content.get("red_flags", []),
        "social_engineering_tactics": email_content.get("social_engineering_tactics", []),
    }


@router.get("", response_model=list[SimulationResponse])
async def list_simulations(
    current_user: CurrentUser,
    db: DbSession,
    campaign_id: str | None = None,
) -> list[SimulationResponse]:
    """List simulations for the current org, optionally filtered by campaign."""
    query = select(Simulation).join(Campaign).where(Campaign.org_id == current_user.org_id)

    if campaign_id:
        query = query.where(Simulation.campaign_id == campaign_id)

    query = query.order_by(Simulation.created_at.desc()).limit(100)
    result = await db.execute(query)
    simulations = result.scalars().all()

    return [SimulationResponse.model_validate(s) for s in simulations]
