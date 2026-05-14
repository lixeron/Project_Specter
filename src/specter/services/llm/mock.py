"""Mock LLM provider — deterministic responses for testing and development."""

from __future__ import annotations

from typing import Any

MOCK_PHISHING_EMAILS = {
    "credential_harvest": {
        "subject": "Action Required: Your password expires in 24 hours",
        "sender_name": "IT Security Team",
        "sender_email": "security-noreply@{org_domain}",
        "body_html": (
            "<p>Dear {target_name},</p>"
            "<p>Our records indicate that your account password is set to expire "
            "within the next <strong>24 hours</strong>. To avoid any disruption to "
            "your access, please update your password immediately.</p>"
            "<p><a href='{{TRACKING_URL}}'>Click here to reset your password</a></p>"
            "<p>If you do not update your password by the deadline, your account "
            "will be temporarily locked and you will need to contact the helpdesk.</p>"
            "<p>Best regards,<br>IT Security Team</p>"
        ),
        "body_text": (
            "Dear {target_name},\n\n"
            "Our records indicate that your account password is set to expire "
            "within the next 24 hours. To avoid any disruption to your access, "
            "please update your password immediately.\n\n"
            "Reset your password: {{TRACKING_URL}}\n\n"
            "If you do not update your password by the deadline, your account "
            "will be temporarily locked and you will need to contact the helpdesk.\n\n"
            "Best regards,\nIT Security Team"
        ),
        "red_flags": [
            "Urgency tactic: '24 hours' deadline creates pressure to act quickly",
            "Generic sender: 'IT Security Team' with no specific person named",
            "Threat of consequence: account will be 'temporarily locked'",
            "Suspicious link: password reset should go through official SSO portal",
        ],
        "social_engineering_tactics": ["urgency", "authority", "fear"],
    },
    "bec": {
        "subject": "Quick favor — need this handled today",
        "sender_name": "Michael Chen",
        "sender_email": "m.chen@{org_domain}",
        "body_html": (
            "<p>Hi {target_name},</p>"
            "<p>I'm in back-to-back meetings all day and need a quick favor. "
            "Can you process a wire transfer for a vendor payment? It's time-sensitive "
            "and I can't get to it myself right now.</p>"
            "<p><a href='{{TRACKING_URL}}'>View payment details here</a></p>"
            "<p>Please handle this ASAP and confirm when done. I'll explain more "
            "when I'm out of meetings.</p>"
            "<p>Thanks,<br>Michael</p>"
            "<p style='font-size:11px;color:#999'>Sent from my iPhone</p>"
        ),
        "body_text": (
            "Hi {target_name},\n\n"
            "I'm in back-to-back meetings all day and need a quick favor. "
            "Can you process a wire transfer for a vendor payment? It's time-sensitive "
            "and I can't get to it myself right now.\n\n"
            "View payment details: {{TRACKING_URL}}\n\n"
            "Please handle this ASAP and confirm when done. I'll explain more "
            "when I'm out of meetings.\n\n"
            "Thanks,\nMichael\n\nSent from my iPhone"
        ),
        "red_flags": [
            "Executive impersonation: uses a specific name to invoke authority",
            "Urgency: 'ASAP', 'time-sensitive', 'can't get to it myself'",
            "Unusual request: wire transfer via email without standard approval process",
            "Discourages verification: 'I'll explain more when I'm out of meetings'",
            "'Sent from my iPhone' — used to excuse brevity and informality",
        ],
        "social_engineering_tactics": ["authority", "urgency", "social_proof"],
    },
    "general": {
        "subject": "Important: Verify your account information",
        "sender_name": "Account Services",
        "sender_email": "accounts@{org_domain}",
        "body_html": (
            "<p>Dear {target_name},</p>"
            "<p>We've detected unusual activity on your account and need you to "
            "verify your information to ensure your account security.</p>"
            "<p><a href='{{TRACKING_URL}}'>Verify your account now</a></p>"
            "<p>If you did not initiate this request, please verify your account "
            "immediately to prevent unauthorized access.</p>"
            "<p>Regards,<br>Account Services Department</p>"
        ),
        "body_text": (
            "Dear {target_name},\n\n"
            "We've detected unusual activity on your account and need you to "
            "verify your information to ensure your account security.\n\n"
            "Verify your account: {{TRACKING_URL}}\n\n"
            "If you did not initiate this request, please verify your account "
            "immediately to prevent unauthorized access.\n\n"
            "Regards,\nAccount Services Department"
        ),
        "red_flags": [
            "Vague threat: 'unusual activity' without specifics",
            "Generic greeting and sender: 'Account Services Department'",
            "Urgency: 'immediately' to prevent unauthorized access",
            "Suspicious link: legitimate services use their own domain portals",
        ],
        "social_engineering_tactics": ["fear", "urgency", "authority"],
    },
}


class MockProvider:
    """Mock LLM provider that returns pre-built phishing templates.

    Used for testing, development, and the free tier when no API key is configured.
    """

    async def generate(self, prompt: str, system: str = "", max_tokens: int = 1000) -> str:
        """Return a mock text response."""
        return "This is a mock LLM response. Configure an LLM provider for real generation."

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1000,
    ) -> dict[str, Any]:
        """Return a mock structured phishing email.

        Picks a template based on keywords in the prompt.
        """
        prompt_lower = prompt.lower()

        if "credential" in prompt_lower or "password" in prompt_lower:
            template_key = "credential_harvest"
        elif "bec" in prompt_lower or "wire" in prompt_lower or "executive" in prompt_lower:
            template_key = "bec"
        else:
            template_key = "general"

        return dict(MOCK_PHISHING_EMAILS[template_key])

    async def generate_phishing_email(
        self,
        target_name: str = "User",
        target_department: str = "General",
        org_name: str = "Organization",
        topic: str = "general",
        tone: str = "urgent",
        difficulty: str = "intermediate",
    ) -> dict[str, Any]:
        """Generate a mock phishing email with target personalization."""
        prompt_lower = topic.lower()

        if "credential" in prompt_lower or "password" in prompt_lower:
            template_key = "credential_harvest"
        elif "bec" in prompt_lower or "wire" in prompt_lower or "executive" in prompt_lower:
            template_key = "bec"
        else:
            template_key = "general"

        template = dict(MOCK_PHISHING_EMAILS[template_key])

        # Personalize the template
        org_domain = org_name.lower().replace(" ", "") + ".com"
        for field in ["body_html", "body_text", "sender_email"]:
            val = str(template[field])
            template[field] = val.replace("{target_name}", target_name).replace(
                "{org_domain}", org_domain
            )

        return template
