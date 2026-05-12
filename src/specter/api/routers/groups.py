"""Target group management endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from specter.api.deps import CurrentUser, DbSession, ManagerUser
from specter.models.database import TargetGroup, User
from specter.models.schemas import (
    MembersAddRequest,
    MembersRemoveRequest,
    TargetGroupCreate,
    TargetGroupDetailResponse,
    TargetGroupResponse,
    TargetGroupUpdate,
    UserResponse,
)

router = APIRouter(prefix="/groups", tags=["target-groups"])


@router.get("", response_model=list[TargetGroupResponse])
async def list_groups(current_user: CurrentUser, db: DbSession) -> list[TargetGroupResponse]:
    """List all target groups for the current organization."""
    result = await db.execute(
        select(TargetGroup)
        .where(TargetGroup.org_id == current_user.org_id)
        .options(selectinload(TargetGroup.members))
        .order_by(TargetGroup.name)
    )
    groups = result.scalars().all()

    return [
        TargetGroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            member_count=len(g.members),
            created_at=g.created_at,
        )
        for g in groups
    ]


@router.post("", response_model=TargetGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: TargetGroupCreate,
    current_user: ManagerUser,
    db: DbSession,
) -> TargetGroupResponse:
    """Create a new target group."""
    group = TargetGroup(
        org_id=current_user.org_id,
        name=body.name,
        description=body.description,
    )
    db.add(group)
    await db.flush()

    return TargetGroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        member_count=0,
        created_at=group.created_at,
    )


@router.get("/{group_id}", response_model=TargetGroupDetailResponse)
async def get_group(
    group_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> TargetGroupDetailResponse:
    """Get target group details with members."""
    group = await _get_group_or_404(group_id, current_user.org_id, db)

    return TargetGroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        member_count=len(group.members),
        created_at=group.created_at,
        members=[UserResponse.model_validate(m) for m in group.members],
    )


@router.patch("/{group_id}", response_model=TargetGroupResponse)
async def update_group(
    group_id: str,
    body: TargetGroupUpdate,
    current_user: ManagerUser,
    db: DbSession,
) -> TargetGroupResponse:
    """Update a target group."""
    group = await _get_group_or_404(group_id, current_user.org_id, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    await db.flush()

    return TargetGroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        member_count=len(group.members),
        created_at=group.created_at,
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: str,
    current_user: ManagerUser,
    db: DbSession,
) -> None:
    """Delete a target group."""
    group = await _get_group_or_404(group_id, current_user.org_id, db)
    await db.delete(group)


@router.post("/{group_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def add_members(
    group_id: str,
    body: MembersAddRequest,
    current_user: ManagerUser,
    db: DbSession,
) -> None:
    """Add users to a target group."""
    group = await _get_group_or_404(group_id, current_user.org_id, db)

    # Fetch users that belong to the same org
    result = await db.execute(
        select(User).where(User.id.in_(body.user_ids), User.org_id == current_user.org_id)
    )
    users = result.scalars().all()

    existing_ids = {m.id for m in group.members}
    for user in users:
        if user.id not in existing_ids:
            group.members.append(user)

    await db.flush()


@router.delete("/{group_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def remove_members(
    group_id: str,
    body: MembersRemoveRequest,
    current_user: ManagerUser,
    db: DbSession,
) -> None:
    """Remove users from a target group."""
    group = await _get_group_or_404(group_id, current_user.org_id, db)

    remove_ids = set(body.user_ids)
    group.members = [m for m in group.members if m.id not in remove_ids]
    await db.flush()


# ── Helpers ──────────────────────────────────────────────────


async def _get_group_or_404(group_id: str, org_id: str, db: DbSession) -> TargetGroup:
    result = await db.execute(
        select(TargetGroup)
        .where(TargetGroup.id == group_id, TargetGroup.org_id == org_id)
        .options(selectinload(TargetGroup.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Target group not found")
    return group
