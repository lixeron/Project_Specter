"""Campaign management endpoints."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from specter.api.deps import CurrentUser, DbSession, ManagerUser
from specter.models.database import Campaign
from specter.models.enums import CampaignStatus
from specter.models.schemas import (
    CampaignCreate,
    CampaignListResponse,
    CampaignResponse,
    CampaignUpdate,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    current_user: CurrentUser,
    db: DbSession,
    status_filter: CampaignStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CampaignListResponse:
    """List campaigns for the current organization."""
    query = select(Campaign).where(Campaign.org_id == current_user.org_id)

    if status_filter:
        query = query.where(Campaign.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Campaign.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    campaigns = result.scalars().all()

    return CampaignListResponse(
        campaigns=[CampaignResponse.model_validate(c) for c in campaigns],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    current_user: ManagerUser,
    db: DbSession,
) -> CampaignResponse:
    """Create a new campaign in draft status."""
    campaign = Campaign(
        org_id=current_user.org_id,
        created_by=current_user.id,
        name=body.name,
        description=body.description,
        vectors=[v.value for v in body.vectors],
        target_group_id=body.target_group_id,
        settings=body.settings.model_dump() if body.settings else None,
    )
    db.add(campaign)
    await db.flush()

    return CampaignResponse.model_validate(campaign)


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> CampaignResponse:
    """Get campaign details."""
    campaign = await _get_campaign_or_404(campaign_id, current_user.org_id, db)
    return CampaignResponse.model_validate(campaign)


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    body: CampaignUpdate,
    current_user: ManagerUser,
    db: DbSession,
) -> CampaignResponse:
    """Update a draft campaign."""
    campaign = await _get_campaign_or_404(campaign_id, current_user.org_id, db)

    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only edit draft campaigns")

    update_data = body.model_dump(exclude_unset=True)
    if "vectors" in update_data and update_data["vectors"] is not None:
        update_data["vectors"] = [v.value for v in update_data["vectors"]]
    if "settings" in update_data and update_data["settings"] is not None:
        update_data["settings"] = update_data["settings"].model_dump()

    for field, value in update_data.items():
        setattr(campaign, field, value)

    await db.flush()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    current_user: ManagerUser,
    db: DbSession,
) -> None:
    """Delete a draft campaign."""
    campaign = await _get_campaign_or_404(campaign_id, current_user.org_id, db)

    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only delete draft campaigns")

    await db.delete(campaign)


@router.post("/{campaign_id}/launch", response_model=CampaignResponse)
async def launch_campaign(
    campaign_id: str,
    current_user: ManagerUser,
    db: DbSession,
) -> CampaignResponse:
    """Launch a draft campaign (draft → running)."""
    campaign = await _get_campaign_or_404(campaign_id, current_user.org_id, db)

    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot launch campaign in '{campaign.status}' status",
        )

    if not campaign.target_group_id:
        raise HTTPException(status_code=400, detail="Campaign must have a target group")

    # TODO: Phase 2 — dispatch to Celery worker for actual delivery
    campaign.status = CampaignStatus.RUNNING
    from datetime import UTC, datetime

    campaign.started_at = datetime.now(UTC)
    await db.flush()

    return CampaignResponse.model_validate(campaign)


@router.post("/{campaign_id}/pause", response_model=CampaignResponse)
async def pause_campaign(
    campaign_id: str,
    current_user: ManagerUser,
    db: DbSession,
) -> CampaignResponse:
    """Pause a running campaign."""
    campaign = await _get_campaign_or_404(campaign_id, current_user.org_id, db)

    if campaign.status != CampaignStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Can only pause running campaigns")

    campaign.status = CampaignStatus.PAUSED
    await db.flush()

    return CampaignResponse.model_validate(campaign)


@router.post("/{campaign_id}/resume", response_model=CampaignResponse)
async def resume_campaign(
    campaign_id: str,
    current_user: ManagerUser,
    db: DbSession,
) -> CampaignResponse:
    """Resume a paused campaign."""
    campaign = await _get_campaign_or_404(campaign_id, current_user.org_id, db)

    if campaign.status != CampaignStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Can only resume paused campaigns")

    campaign.status = CampaignStatus.RUNNING
    await db.flush()

    return CampaignResponse.model_validate(campaign)


# ── Helpers ──────────────────────────────────────────────────


async def _get_campaign_or_404(campaign_id: str, org_id: str, db: DbSession) -> Campaign:
    """Fetch a campaign scoped to the user's org, or raise 404."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.org_id == org_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign
