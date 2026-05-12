"""Public tracking endpoints — no auth required.

These handle interactions when targets click links, load tracking pixels,
scan QR codes, submit credentials on fake login pages, or report simulations.
"""

import base64

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, Response
from sqlalchemy import select

from specter.api.deps import DbSession
from specter.models.database import Event, Simulation, User
from specter.models.enums import EventType

router = APIRouter(tags=["tracking"])

# 1x1 transparent GIF for tracking pixel
TRACKING_PIXEL = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")

TRAINING_PAGE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Awareness Training — Specter</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }}
        .container {{
            max-width: 680px;
            width: 100%;
        }}
        .banner {{
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid #e74c3c;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            text-align: center;
        }}
        .banner h1 {{
            color: #e74c3c;
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }}
        .banner p {{
            color: #aaa;
            font-size: 0.95rem;
        }}
        .card {{
            background: #141414;
            border: 1px solid #2a2a2a;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }}
        .card h2 {{
            color: #3498db;
            font-size: 1.1rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        .red-flag {{
            background: #1a0a0a;
            border-left: 3px solid #e74c3c;
            padding: 0.75rem 1rem;
            margin-bottom: 0.5rem;
            border-radius: 0 6px 6px 0;
            font-size: 0.9rem;
        }}
        .tactic {{
            display: inline-block;
            background: #1a1a2e;
            border: 1px solid #3498db;
            color: #3498db;
            padding: 0.3rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            margin: 0.2rem;
        }}
        .email-preview {{
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 1rem;
            font-family: monospace;
            font-size: 0.85rem;
            color: #ccc;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}
        .email-preview .header {{
            color: #888;
            margin-bottom: 0.5rem;
        }}
        .tips {{
            list-style: none;
            padding: 0;
        }}
        .tips li {{
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
            font-size: 0.9rem;
        }}
        .tips li::before {{
            content: "✓";
            color: #2ecc71;
            position: absolute;
            left: 0;
            font-weight: bold;
        }}
        .footer {{
            text-align: center;
            color: #555;
            font-size: 0.8rem;
            margin-top: 1.5rem;
        }}
        .footer a {{ color: #3498db; text-decoration: none; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="banner">
            <h1>⚠ This was a simulated phishing attack</h1>
            <p>Your security team sent this as part of an awareness training exercise.
               No harm was done — but let's learn from it.</p>
        </div>

        <div class="card">
            <h2>📧 The email you received</h2>
            <div class="email-preview">
                <div class="header">Subject: {subject}</div>
                <div class="header">From: {sender_name} &lt;{sender_email}&gt;</div>
                <hr style="border-color:#333; margin: 0.5rem 0">
{body_text}
            </div>
        </div>

        <div class="card">
            <h2>🚩 Red flags you should have caught</h2>
            {red_flags_html}
        </div>

        <div class="card">
            <h2>🧠 Social engineering tactics used</h2>
            <div style="margin-top: 0.5rem;">
                {tactics_html}
            </div>
        </div>

        <div class="card">
            <h2>🛡 What to do next time</h2>
            <ul class="tips">
                <li>Hover over links before clicking — check the actual URL</li>
                <li>Verify urgent requests through a separate channel (call, Slack)</li>
                <li>Look for pressure tactics: deadlines, threats, authority</li>
                <li>Check the sender's email address carefully for spoofed domains</li>
                <li>When in doubt, report it to your security team</li>
            </ul>
        </div>

        <div class="footer">
            <p>Powered by <a href="https://github.com/lixeron/Project_Specter">Specter</a>
               — Adversary Simulation Platform</p>
        </div>
    </div>
</body>
</html>"""


def _build_training_page(simulation: Simulation) -> str:
    """Build the training HTML page from simulation content."""
    content = simulation.content or {}
    red_flags = simulation.red_flags or content.get("red_flags", [])
    tactics = content.get("social_engineering_tactics", [])

    red_flags_html = "\n".join(
        f'            <div class="red-flag">{flag}</div>' for flag in red_flags
    )
    tactics_html = "\n".join(f'<span class="tactic">{t}</span>' for t in tactics)

    return TRAINING_PAGE_HTML.format(
        subject=content.get("subject", "N/A"),
        sender_name=content.get("sender_name", "Unknown"),
        sender_email=content.get("sender_email", "unknown@example.com"),
        body_text=content.get("body_text", ""),
        red_flags_html=red_flags_html or '<div class="red-flag">No red flags recorded</div>',
        tactics_html=tactics_html or '<span class="tactic">none recorded</span>',
    )


async def _get_simulation_by_token(token: str, db: DbSession) -> Simulation | None:
    """Look up a simulation by its tracking token."""
    result = await db.execute(select(Simulation).where(Simulation.tracking_token == token))
    return result.scalar_one_or_none()


async def _log_event(
    db: DbSession,
    simulation_id: str,
    event_type: str,
    request: Request,
) -> None:
    """Log a tracking event."""
    event = Event(
        simulation_id=simulation_id,
        event_type=event_type,
        ip_address=request.client.host if request.client else None,
        metadata_={
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", ""),
        },
    )
    db.add(event)
    await db.flush()


@router.get("/t/{token}")
async def track_click(token: str, request: Request, db: DbSession) -> Response:
    """Track a link click and redirect to the training page."""
    simulation = await _get_simulation_by_token(token, db)
    if not simulation:
        return HTMLResponse("<h1>Link expired or invalid.</h1>", status_code=404)

    # Log the click event
    await _log_event(db, simulation.id, EventType.CLICKED, request)

    # Return the training page
    html = _build_training_page(simulation)
    return HTMLResponse(html)


@router.get("/t/{token}/px")
async def track_pixel(token: str, request: Request, db: DbSession) -> Response:
    """Tracking pixel — logs email opened event, returns 1x1 transparent GIF."""
    simulation = await _get_simulation_by_token(token, db)
    if simulation:
        await _log_event(db, simulation.id, EventType.OPENED, request)

    return Response(
        content=TRACKING_PIXEL,
        media_type="image/gif",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )


@router.post("/t/{token}/report")
async def track_report(token: str, request: Request, db: DbSession) -> dict:
    """User reports the simulation as suspicious — this is the correct action."""
    simulation = await _get_simulation_by_token(token, db)
    if not simulation:
        return {"status": "not_found"}

    await _log_event(db, simulation.id, EventType.REPORTED, request)

    # Update user's security score (+10 for reporting)
    result = await db.execute(select(User).where(User.id == simulation.target_user_id))
    user = result.scalar_one_or_none()
    if user:
        user.security_score = min(100, user.security_score + 10)
        await db.flush()

    return {
        "status": "reported",
        "message": "Great job! You correctly identified this as suspicious.",
    }


@router.post("/t/{token}/submit")
async def track_credential_submit(token: str, request: Request, db: DbSession) -> Response:
    """Fake login form submission — logs credential submission event.

    IMPORTANT: We NEVER store the actual credentials. We only log that
    a submission occurred.
    """
    simulation = await _get_simulation_by_token(token, db)
    if not simulation:
        return HTMLResponse("<h1>Link expired or invalid.</h1>", status_code=404)

    await _log_event(db, simulation.id, EventType.CREDENTIALS_SUBMITTED, request)

    # Update user's security score (-25 for submitting credentials)
    result = await db.execute(select(User).where(User.id == simulation.target_user_id))
    user = result.scalar_one_or_none()
    if user:
        user.security_score = max(0, user.security_score - 25)
        await db.flush()

    # Redirect to training page
    html = _build_training_page(simulation)
    return HTMLResponse(html)
