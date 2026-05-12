"""Specter CLI — main entry point."""

import click
from rich.console import Console
from rich.panel import Panel

from specter import __version__

console = Console()


@click.group()
@click.version_option(__version__, prog_name="specter")
def cli() -> None:
    """Specter — Adversary Simulation Platform."""
    pass


# ── Server commands ──────────────────────────────────────────


@cli.group()
def server() -> None:
    """Server management commands."""
    pass


@server.command()
@click.option("--host", default="0.0.0.0", help="Bind host")
@click.option("--port", default=8000, type=int, help="Bind port")
@click.option("--reload", is_flag=True, help="Enable auto-reload for development")
def start(host: str, port: int, reload: bool) -> None:
    """Start the Specter API server."""
    import uvicorn

    console.print(
        Panel(
            f"[bold]Specter v{__version__}[/bold]\n"
            f"Starting on [cyan]http://{host}:{port}[/cyan]\n"
            f"API docs: [cyan]http://{host}:{port}/api/docs[/cyan]",
            title="[bold green]Specter[/bold green]",
            border_style="green",
        )
    )

    uvicorn.run(
        "specter.api.main:app",
        host=host,
        port=port,
        reload=reload,
    )


@server.command()
def health() -> None:
    """Check API health status."""
    import httpx

    from specter.config import get_settings

    settings = get_settings()
    url = f"{settings.base_url}/api/v1/health"

    try:
        resp = httpx.get(url, timeout=5)
        data = resp.json()

        status_color = "green" if data["status"] == "ok" else "yellow"
        db_color = "green" if data["database"] == "healthy" else "red"

        console.print(
            Panel(
                f"Status:      [{status_color}]{data['status']}[/{status_color}]\n"
                f"Version:     {data['version']}\n"
                f"Database:    [{db_color}]{data['database']}[/{db_color}]\n"
                f"Environment: {data['environment']}",
                title="[bold]Health Check[/bold]",
                border_style=status_color,
            )
        )
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {url}[/red]")
        console.print("Is the server running? Try: [cyan]specter server start[/cyan]")


# ── Campaign commands ────────────────────────────────────────


@cli.group()
def campaign() -> None:
    """Campaign management."""
    pass


@campaign.command("list")
def campaign_list() -> None:
    """List all campaigns."""
    # TODO: Wire to API client
    console.print("[yellow]Campaign list — coming soon (wire to API client)[/yellow]")
    console.print("For now, use the API directly: GET /api/v1/campaigns")


@campaign.command("create")
@click.option("--name", prompt="Campaign name", help="Campaign name")
@click.option("--vector", default="email", help="Attack vector (email, sms, qr)")
def campaign_create(name: str, vector: str) -> None:
    """Create a new campaign."""
    console.print(f"[yellow]Creating campaign '{name}' with vector '{vector}'[/yellow]")
    console.print("[yellow]Full CLI → API wiring coming in Phase 1 completion[/yellow]")


# ── Quick simulate ───────────────────────────────────────────


@cli.command()
@click.option("--vector", default="email", help="Attack vector")
@click.option("--topic", default="general", help="Phishing topic")
@click.option("--tone", default="urgent", help="Email tone")
def simulate(vector: str, topic: str, tone: str) -> None:
    """Quick-run a single simulation (dev/testing)."""
    console.print(
        Panel(
            f"Vector: [cyan]{vector}[/cyan]\n"
            f"Topic:  [cyan]{topic}[/cyan]\n"
            f"Tone:   [cyan]{tone}[/cyan]\n\n"
            "[yellow]LLM integration coming in Phase 2[/yellow]",
            title="[bold]Quick Simulate[/bold]",
            border_style="blue",
        )
    )


# ── Stats ────────────────────────────────────────────────────


@cli.command()
def stats() -> None:
    """Show organization overview stats."""
    console.print(
        Panel(
            "Active campaigns:  [dim]0[/dim]\n"
            "Total simulations: [dim]0[/dim]\n"
            "Overall click rate: [dim]—[/dim]\n"
            "Report rate:        [dim]—[/dim]\n"
            "Avg security score: [dim]—[/dim]\n"
            "Risk level:         [dim]N/A[/dim]\n\n"
            "[yellow]Analytics engine coming in Phase 5[/yellow]",
            title="[bold]Specter — Org Overview[/bold]",
            border_style="blue",
        )
    )


if __name__ == "__main__":
    cli()
