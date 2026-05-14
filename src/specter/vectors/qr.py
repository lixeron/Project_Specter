"""QR code attack vector (quishing) — generates tracked QR codes.

Part of the OSS tier. Generates QR codes that point to Specter tracking URLs.
Can be embedded in emails, exported as images, or used in printable posters.
"""

from __future__ import annotations

import base64
import io
from typing import Any

import qrcode  # type: ignore[import-untyped]
from qrcode.constants import ERROR_CORRECT_M  # type: ignore[import-untyped]

from specter.vectors.base import AttackVector

# Pre-built QR code scenarios
QR_SCENARIOS: dict[str, dict[str, Any]] = {
    "wifi": {
        "pretext": "Free Company WiFi",
        "description": "Scan to connect to guest WiFi network",
        "poster_title": "📶 Free WiFi",
        "poster_body": "Scan the QR code below to connect to our guest WiFi network.",
        "red_flags": [
            "Unsolicited QR code — legitimate WiFi networks use standard connection methods",
            "No verification of who placed the QR code or poster",
            "QR codes can redirect anywhere — you can't see the URL before scanning",
        ],
        "tactics": ["convenience", "trust"],
    },
    "survey": {
        "pretext": "Employee Satisfaction Survey",
        "description": "Scan to complete your annual employee survey",
        "poster_title": "📋 Employee Survey",
        "poster_body": (
            "Your feedback matters! Scan the QR code to complete "
            "the annual employee satisfaction survey. Takes only 2 minutes."
        ),
        "red_flags": [
            "Legitimate surveys are distributed through official channels (email, intranet)",
            "No verification that this poster is from HR or management",
            "QR code URL is not visible — could lead anywhere",
        ],
        "tactics": ["authority", "social_proof"],
    },
    "event": {
        "pretext": "Company Event RSVP",
        "description": "Scan to RSVP for the upcoming company event",
        "poster_title": "🎉 You're Invited!",
        "poster_body": (
            "Company Summer Mixer — Friday at 5 PM. "
            "Scan to RSVP and see the menu. Space is limited!"
        ),
        "red_flags": [
            "Urgency tactic: 'Space is limited' pressures quick action",
            "Event RSVPs should go through calendar invites, not random QR codes",
            "No way to verify the QR code links to a legitimate page before scanning",
        ],
        "tactics": ["urgency", "scarcity", "social_proof"],
    },
    "general": {
        "pretext": "Account Verification",
        "description": "Scan to verify your account",
        "poster_title": "⚠️ Action Required",
        "poster_body": (
            "Your account requires verification. Scan the QR code below to verify your identity."
        ),
        "red_flags": [
            "Vague urgency: 'action required' without specifics",
            "Legitimate account verification happens through official apps or email",
            "QR code hides the destination URL — classic quishing technique",
        ],
        "tactics": ["urgency", "authority", "fear"],
    },
}


class QRCodeVector(AttackVector):
    """QR code attack vector — generates tracked QR codes.

    Generates QR codes that encode Specter tracking URLs. When scanned,
    the target is redirected to the training page and the scan is logged.
    """

    requires_pro = False  # Part of OSS tier

    @property
    def vector_type(self) -> str:
        return "qr"

    async def generate_content(
        self,
        target_name: str,
        target_department: str,
        org_name: str,
        topic: str,
        tone: str,
        difficulty: str,
    ) -> dict[str, Any]:
        """Generate QR code attack content.

        Returns scenario text and a base64-encoded QR code image.
        The tracking URL placeholder {TRACKING_URL} will be replaced
        by the caller with the actual tracking URL.
        """
        scenario_key = topic.lower() if topic.lower() in QR_SCENARIOS else "general"
        scenario = dict(QR_SCENARIOS[scenario_key])

        return {
            "vector": "qr",
            "scenario": scenario_key,
            "pretext": scenario["pretext"],
            "description": scenario["description"],
            "poster_title": scenario["poster_title"],
            "poster_body": scenario["poster_body"],
            "qr_url_placeholder": "{TRACKING_URL}",
            "red_flags": scenario["red_flags"],
            "social_engineering_tactics": scenario["tactics"],
        }

    def get_training_summary(self, content: dict[str, Any]) -> dict[str, Any]:
        return {
            "attack_type": "QR Code Phishing (Quishing)",
            "red_flags": content.get("red_flags", []),
            "tactics": content.get("social_engineering_tactics", []),
            "explanation": (
                "This was a simulated QR code phishing attack. "
                "QR codes can encode any URL, and unlike links in emails, "
                "you can't hover over them to preview the destination. "
                "Always verify QR codes come from a trusted source before scanning."
            ),
        }


def generate_qr_image(url: str, size: int = 300) -> str:
    """Generate a QR code image as a base64-encoded PNG string.

    Args:
        url: The URL to encode in the QR code.
        size: Pixel dimensions for the output image.

    Returns:
        Base64-encoded PNG image string (suitable for data: URI or API response).
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size))

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode("utf-8")


def generate_poster_html(
    title: str,
    body: str,
    qr_base64: str,
    org_name: str = "Your Organization",
) -> str:
    """Generate a printable HTML poster with an embedded QR code."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }}
        .poster {{
            background: white;
            border-radius: 16px;
            padding: 3rem;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.1);
        }}
        .poster h1 {{ font-size: 2rem; margin-bottom: 1rem; }}
        .poster p {{ font-size: 1.1rem; color: #555; margin-bottom: 2rem; }}
        .poster img {{ border-radius: 8px; }}
        .poster .org {{ color: #999; font-size: 0.85rem; margin-top: 1.5rem; }}
    </style>
</head>
<body>
    <div class="poster">
        <h1>{title}</h1>
        <p>{body}</p>
        <img src="data:image/png;base64,{qr_base64}" width="250" height="250"
             alt="QR Code">
        <p class="org">{org_name}</p>
    </div>
</body>
</html>"""
