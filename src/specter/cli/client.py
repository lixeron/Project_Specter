"""CLI HTTP client — handles auth tokens and API requests."""

import contextlib
import json
import sys
from pathlib import Path

import httpx
from rich.console import Console

console = Console()

# Token storage location
CONFIG_DIR = Path.home() / ".specter"
TOKEN_FILE = CONFIG_DIR / "credentials.json"


def _get_api_url() -> str:
    """Get the API base URL from config or default."""
    config_file = CONFIG_DIR / "config.json"
    if config_file.exists():
        config = json.loads(config_file.read_text())
        return str(config.get("api_url", "http://localhost:8000"))
    return "http://localhost:8000"


def save_tokens(access_token: str, refresh_token: str) -> None:
    """Save auth tokens to disk."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_text(
        json.dumps({"access_token": access_token, "refresh_token": refresh_token})
    )


def load_tokens() -> dict[str, str] | None:
    """Load auth tokens from disk."""
    if not TOKEN_FILE.exists():
        return None
    try:
        data: dict[str, str] = json.loads(TOKEN_FILE.read_text())
        return data
    except (json.JSONDecodeError, KeyError):
        return None


def clear_tokens() -> None:
    """Remove stored tokens."""
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()


def get_client() -> httpx.Client:
    """Get an authenticated HTTP client. Exits if not logged in."""
    tokens = load_tokens()
    if not tokens:
        console.print("[red]Not logged in.[/red] Run [cyan]specter login[/cyan] first.")
        sys.exit(1)

    api_url = _get_api_url()
    return httpx.Client(
        base_url=api_url,
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        timeout=10,
    )


def save_api_url(url: str) -> None:
    """Save the API URL to config."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    config_file = CONFIG_DIR / "config.json"
    config: dict = {}
    if config_file.exists():
        with contextlib.suppress(json.JSONDecodeError):
            config = json.loads(config_file.read_text())
    config["api_url"] = url.rstrip("/")
    config_file.write_text(json.dumps(config, indent=2))
