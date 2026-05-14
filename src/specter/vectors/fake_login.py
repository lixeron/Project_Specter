"""Fake login page vector — credential harvesting page templates.

Pro tier feature. Generates realistic-looking login pages that log
when credentials are submitted (without storing the actual credentials),
then redirect to the training page.
"""

from __future__ import annotations

from typing import Any

from specter.vectors.base import AttackVector

LOGIN_TEMPLATES: dict[str, dict[str, str]] = {
    "generic_sso": {
        "title": "Sign In",
        "subtitle": "Enter your credentials to continue",
        "logo_text": "SSO Portal",
        "accent_color": "#4285f4",
        "bg_color": "#f0f2f5",
    },
    "microsoft": {
        "title": "Sign in",
        "subtitle": "Use your organizational account",
        "logo_text": "Microsoft",
        "accent_color": "#0078d4",
        "bg_color": "#f2f2f2",
    },
    "google": {
        "title": "Sign in",
        "subtitle": "Use your Google Account",
        "logo_text": "Google",
        "accent_color": "#1a73e8",
        "bg_color": "#ffffff",
    },
    "okta": {
        "title": "Sign In",
        "subtitle": "Your company single sign-on",
        "logo_text": "Okta",
        "accent_color": "#007dc1",
        "bg_color": "#f9f9f9",
    },
}


def generate_login_page_html(
    template_name: str,
    tracking_token: str,
    org_name: str = "Organization",
) -> str:
    """Generate a fake login page HTML.

    The form POSTs to /t/{token}/submit which logs the event
    (without storing credentials) and redirects to training.
    """
    template = LOGIN_TEMPLATES.get(template_name, LOGIN_TEMPLATES["generic_sso"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{template["title"]}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: {template["bg_color"]};
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }}
        .login-card {{
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 2.5rem;
            width: 380px;
            max-width: 90vw;
        }}
        .logo {{
            text-align: center;
            font-size: 1.5rem;
            font-weight: 600;
            color: {template["accent_color"]};
            margin-bottom: 0.5rem;
        }}
        .subtitle {{
            text-align: center;
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }}
        .form-group {{
            margin-bottom: 1.25rem;
        }}
        .form-group label {{
            display: block;
            font-size: 0.85rem;
            color: #333;
            margin-bottom: 0.4rem;
        }}
        .form-group input {{
            width: 100%;
            padding: 0.7rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.95rem;
            transition: border-color 0.2s;
        }}
        .form-group input:focus {{
            outline: none;
            border-color: {template["accent_color"]};
        }}
        .submit-btn {{
            width: 100%;
            padding: 0.75rem;
            background: {template["accent_color"]};
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 0.5rem;
        }}
        .submit-btn:hover {{ opacity: 0.9; }}
        .footer {{
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: #999;
        }}
    </style>
</head>
<body>
    <div class="login-card">
        <div class="logo">{template["logo_text"]}</div>
        <div class="subtitle">{template["subtitle"]}</div>
        <div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email"
                       placeholder="user@{org_name.lower().replace(" ", "")}.com">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password"
                       placeholder="Enter your password">
            </div>
            <button class="submit-btn" onclick="submitForm()">
                {template["title"]}
            </button>
        </div>
        <div class="footer">
            Protected by your organization's security policy
        </div>
    </div>
    <script>
        function submitForm() {{
            fetch('/t/{tracking_token}/submit', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
            }}).then(resp => resp.text()).then(html => {{
                document.open();
                document.write(html);
                document.close();
            }});
        }}
    </script>
</body>
</html>"""


class FakeLoginVector(AttackVector):
    """Fake login page vector — serves credential harvesting pages.

    Pro tier. Generates realistic-looking login pages that log submissions
    (without storing credentials) and redirect to training.
    """

    requires_pro = True

    @property
    def vector_type(self) -> str:
        return "fake_login"

    async def generate_content(
        self,
        target_name: str,
        target_department: str,
        org_name: str,
        topic: str,
        tone: str,
        difficulty: str,
    ) -> dict[str, Any]:
        """Generate fake login page content."""
        # Pick template based on topic
        template_key = topic.lower() if topic.lower() in LOGIN_TEMPLATES else "generic_sso"

        return {
            "vector": "fake_login",
            "template": template_key,
            "template_config": LOGIN_TEMPLATES[template_key],
            "org_name": org_name,
            "red_flags": [
                "Check the URL — legitimate login pages use official domains",
                "Be suspicious of login prompts you didn't initiate",
                "Look for HTTPS and valid certificates",
                "Verify with IT if you receive unexpected login requests",
            ],
            "social_engineering_tactics": ["familiarity", "trust", "urgency"],
        }

    def get_training_summary(self, content: dict[str, Any]) -> dict[str, Any]:
        return {
            "attack_type": "Credential Harvesting (Fake Login Page)",
            "red_flags": content.get("red_flags", []),
            "tactics": content.get("social_engineering_tactics", []),
            "explanation": (
                "This was a simulated credential harvesting attack. "
                "The login page was designed to look like a real SSO portal. "
                "Always check the URL bar before entering credentials, and "
                "verify unexpected login prompts with your IT department."
            ),
        }
