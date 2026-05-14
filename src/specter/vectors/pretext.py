"""Pretexting scenario vector — social engineering scripts for tabletop exercises.

Pro tier. Generates AI-powered pretexting scenarios (phone scripts,
physical access attempts, chat-based social engineering) for security
teams to use in live exercises.
"""

from __future__ import annotations

from typing import Any

from specter.vectors.base import AttackVector

PRETEXT_SCENARIOS: dict[str, dict[str, Any]] = {
    "it_support": {
        "title": "IT Support Call",
        "scenario_type": "phone",
        "description": "Impersonating IT helpdesk to extract credentials",
        "script": (
            "Hello, this is {caller_name} from the IT helpdesk. "
            "We've detected some unusual login activity on your account "
            "and need to verify your identity to secure it.\n\n"
            "Can I confirm your full name and employee ID?\n"
            "[After confirmation]\n"
            "Great, thank you. I need to reset your MFA token — "
            "can you read me the current code from your authenticator app? "
            "This will only take a moment.\n\n"
            "If they provide the code:\n"
            "'Thank you, your account is now secured. "
            "You may need to re-enroll in MFA within the next hour.'\n\n"
            "If they push back:\n"
            "'I understand your concern. I can send you a verification "
            "email — but please note that your account will remain "
            "at risk until we complete this process.'"
        ),
        "red_flags": [
            "IT support should never ask for MFA codes over the phone",
            "Unsolicited calls claiming 'unusual activity' are a classic pretext",
            "Pressure to act immediately discourages verification",
            "Real IT staff can verify identity through internal systems",
        ],
        "scoring_rubric": [
            "Target asks for caller's name and callback number: +10",
            "Target refuses to share MFA code: +15",
            "Target contacts IT through official channels to verify: +20",
            "Target shares MFA code: -25",
            "Target shares employee ID without verification: -10",
        ],
        "tactics": ["authority", "urgency", "fear"],
    },
    "vendor_visit": {
        "title": "Vendor Site Visit",
        "scenario_type": "physical",
        "description": "Impersonating a vendor to gain physical access",
        "script": (
            "Hi, I'm {caller_name} from {vendor_name} — I have a meeting "
            "with someone in your {target_department} department about "
            "the new system migration. I'm running a bit late and they "
            "told me to just come up.\n\n"
            "Can you badge me in? I left my visitor pass at the front desk "
            "by mistake.\n\n"
            "If challenged:\n"
            "'I totally understand the policy. Can you call {contact_name} "
            "in {target_department}? They'll confirm the meeting. "
            "I just don't want to keep them waiting.'"
        ),
        "red_flags": [
            "Visitor should have been pre-registered and received a pass",
            "Name-dropping a department or person to establish legitimacy",
            "Urgency: 'running late', 'don't want to keep them waiting'",
            "Asking to bypass physical security controls (badge access)",
        ],
        "scoring_rubric": [
            "Employee directs visitor to reception: +15",
            "Employee calls the named contact to verify: +10",
            "Employee refuses to badge them in: +20",
            "Employee badges the visitor in without verification: -25",
        ],
        "tactics": ["authority", "social_proof", "urgency"],
    },
    "general": {
        "title": "Account Verification Call",
        "scenario_type": "phone",
        "description": "General pretexting scenario for credential extraction",
        "script": (
            "Hi {target_name}, this is {caller_name} from the security team. "
            "We're doing a routine audit and need to verify some account "
            "details. This should only take a minute.\n\n"
            "Can you confirm your email address and the last four digits "
            "of your employee ID?\n\n"
            "[After they provide info]\n"
            "Perfect. One last thing — I need you to confirm your password "
            "hasn't been changed in the last 30 days. Can you verify it "
            "for me so I can update our records?"
        ),
        "red_flags": [
            "Security teams never ask for passwords, even 'for verification'",
            "'Routine audit' is a common pretext for social engineering",
            "Gradual escalation: starts with harmless info, then asks for credentials",
            "No way to verify the caller's identity",
        ],
        "scoring_rubric": [
            "Target refuses to share password: +15",
            "Target asks to verify caller through official channels: +20",
            "Target provides password: -30",
            "Target provides partial info but stops at password: +5",
        ],
        "tactics": ["authority", "trust", "gradual_commitment"],
    },
}


class PretextVector(AttackVector):
    """Pretexting scenario vector — generates social engineering scripts.

    Pro tier. These scenarios are not delivered automatically — they're
    generated for security teams to use in tabletop exercises and
    live social engineering tests.
    """

    requires_pro = True

    @property
    def vector_type(self) -> str:
        return "pretext"

    async def generate_content(
        self,
        target_name: str,
        target_department: str,
        org_name: str,
        topic: str,
        tone: str,
        difficulty: str,
    ) -> dict[str, Any]:
        """Generate a pretexting scenario."""
        scenario_key = topic.lower() if topic.lower() in PRETEXT_SCENARIOS else "general"
        scenario = dict(PRETEXT_SCENARIOS[scenario_key])

        # Personalize the script
        script = scenario["script"].format(
            target_name=target_name,
            target_department=target_department,
            caller_name="Alex from IT Support",
            vendor_name="TechServe Solutions",
            contact_name="the project lead",
        )

        return {
            "vector": "pretext",
            "scenario_type": scenario["scenario_type"],
            "title": scenario["title"],
            "description": scenario["description"],
            "script": script,
            "red_flags": scenario["red_flags"],
            "scoring_rubric": scenario["scoring_rubric"],
            "social_engineering_tactics": scenario["tactics"],
        }

    def get_training_summary(self, content: dict[str, Any]) -> dict[str, Any]:
        return {
            "attack_type": f"Pretexting ({content.get('scenario_type', 'phone')})",
            "red_flags": content.get("red_flags", []),
            "tactics": content.get("social_engineering_tactics", []),
            "scoring_rubric": content.get("scoring_rubric", []),
            "explanation": (
                "This was a simulated social engineering scenario. "
                "Pretexting attacks rely on building a false story to "
                "gain trust and extract information or access. Always "
                "verify identity through official channels."
            ),
        }
