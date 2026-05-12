"""Specter CLI — main entry point."""

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from specter import __version__

console = Console()


@click.group()
@click.version_option(__version__, prog_name="specter")
def cli() -> None:
    """Specter — Adversary Simulation Platform."""
    pass


# ── Auth commands ────────────────────────────────────────────


@cli.command()
@click.option("--url", default="http://localhost:8000", help="Specter API URL")
def init(url: str) -> None:
    """First-time setup — configure API URL."""
    from specter.cli.client import save_api_url

    save_api_url(url)
    console.print(f"API URL set to [cyan]{url}[/cyan]")
    console.print("Now run [cyan]specter login[/cyan] to authenticate.")


@cli.command()
@click.option("--email", prompt="Email", help="Account email")
@click.option("--password", prompt=True, hide_input=True, help="Account password")
def login(email: str, password: str) -> None:
    """Authenticate with the Specter API."""
    import httpx

    from specter.cli.client import _get_api_url, save_tokens

    api_url = _get_api_url()
    try:
        resp = httpx.post(
            f"{api_url}/api/v1/auth/login",
            json={"email": email, "password": password},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            save_tokens(data["access_token"], data["refresh_token"])
            console.print("[green]Logged in successfully.[/green]")
        elif resp.status_code == 401:
            console.print("[red]Invalid email or password.[/red]")
        else:
            console.print(f"[red]Login failed: {resp.status_code}[/red]")
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {api_url}[/red]")
        console.print("Is the server running? Try: [cyan]specter server start[/cyan]")


@cli.command()
def logout() -> None:
    """Clear stored credentials."""
    from specter.cli.client import clear_tokens

    clear_tokens()
    console.print("Logged out.")


@cli.command()
@click.option("--org-name", prompt="Organization name", help="Your org name")
@click.option("--name", prompt="Your name", help="Admin user name")
@click.option("--email", prompt="Email", help="Admin email")
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
def register(org_name: str, name: str, email: str, password: str) -> None:
    """Register a new organization and admin account."""
    import httpx

    from specter.cli.client import _get_api_url, save_tokens

    api_url = _get_api_url()
    try:
        resp = httpx.post(
            f"{api_url}/api/v1/auth/register",
            json={
                "org_name": org_name,
                "email": email,
                "password": password,
                "name": name,
            },
            timeout=10,
        )
        if resp.status_code == 201:
            data = resp.json()
            save_tokens(data["access_token"], data["refresh_token"])
            console.print(f"[green]Organization '{org_name}' created. You're logged in.[/green]")
        elif resp.status_code == 409:
            console.print("[red]Email already registered.[/red]")
        else:
            console.print(f"[red]Registration failed: {resp.json().get('detail', resp.status_code)}[/red]")
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {api_url}[/red]")


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
    uvicorn.run("specter.api.main:app", host=host, port=port, reload=reload)


@server.command()
def health() -> None:
    """Check API health status."""
    import httpx

    from specter.cli.client import _get_api_url

    url = f"{_get_api_url()}/api/v1/health"
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


@server.command()
def migrate() -> None:
    """Run database migrations."""
    import subprocess
    import sys

    console.print("Running Alembic migrations...")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        console.print("[green]Migrations complete.[/green]")
        if result.stdout.strip():
            console.print(result.stdout.strip())
    else:
        console.print(f"[red]Migration failed:[/red]\n{result.stderr}")


# ── Campaign commands ────────────────────────────────────────


@cli.group()
def campaign() -> None:
    """Campaign management."""
    pass


@campaign.command("list")
@click.option("--status", "status_filter", default=None, help="Filter by status")
def campaign_list(status_filter: str | None) -> None:
    """List all campaigns."""
    from specter.cli.client import get_client

    client = get_client()
    params = {}
    if status_filter:
        params["status"] = status_filter

    resp = client.get("/api/v1/campaigns", params=params)
    if resp.status_code != 200:
        console.print(f"[red]Error: {resp.status_code}[/red]")
        return

    data = resp.json()
    if not data["campaigns"]:
        console.print("[dim]No campaigns found.[/dim]")
        return

    table = Table(title="Campaigns", border_style="blue")
    table.add_column("ID", style="dim", max_width=8)
    table.add_column("Name", style="bold")
    table.add_column("Status")
    table.add_column("Vectors")
    table.add_column("Created")

    status_colors = {
        "draft": "white",
        "scheduled": "yellow",
        "running": "green",
        "paused": "yellow",
        "completed": "cyan",
        "archived": "dim",
    }

    for c in data["campaigns"]:
        status = c["status"]
        color = status_colors.get(status, "white")
        vectors = ", ".join(c.get("vectors") or [])
        created = c["created_at"][:10]
        table.add_row(
            c["id"][:8],
            c["name"],
            f"[{color}]{status}[/{color}]",
            vectors or "—",
            created,
        )

    console.print(table)
    console.print(f"[dim]Total: {data['total']}[/dim]")


@campaign.command("create")
@click.option("--name", prompt="Campaign name", help="Campaign name")
@click.option("--description", default=None, help="Campaign description")
@click.option(
    "--vector",
    multiple=True,
    default=["email"],
    help="Attack vectors (repeatable: --vector email --vector qr)",
)
def campaign_create(name: str, description: str | None, vector: tuple[str, ...]) -> None:
    """Create a new campaign."""
    from specter.cli.client import get_client

    client = get_client()
    payload: dict = {"name": name, "vectors": list(vector)}
    if description:
        payload["description"] = description

    resp = client.post("/api/v1/campaigns", json=payload)
    if resp.status_code == 201:
        data = resp.json()
        console.print(f"[green]Campaign created:[/green] {data['name']}")
        console.print(f"  ID:      [cyan]{data['id']}[/cyan]")
        console.print(f"  Status:  {data['status']}")
        console.print(f"  Vectors: {', '.join(data.get('vectors') or [])}")
    else:
        detail = resp.json().get("detail", resp.status_code)
        console.print(f"[red]Failed: {detail}[/red]")


@campaign.command("show")
@click.argument("campaign_id")
def campaign_show(campaign_id: str) -> None:
    """Show campaign details."""
    from specter.cli.client import get_client

    client = get_client()
    resp = client.get(f"/api/v1/campaigns/{campaign_id}")
    if resp.status_code == 404:
        console.print("[red]Campaign not found.[/red]")
        return
    if resp.status_code != 200:
        console.print(f"[red]Error: {resp.status_code}[/red]")
        return

    c = resp.json()
    vectors = ", ".join(c.get("vectors") or [])
    console.print(
        Panel(
            f"Name:         [bold]{c['name']}[/bold]\n"
            f"ID:           [dim]{c['id']}[/dim]\n"
            f"Status:       {c['status']}\n"
            f"Vectors:      {vectors or '—'}\n"
            f"Description:  {c.get('description') or '—'}\n"
            f"Target group: {c.get('target_group_id') or '—'}\n"
            f"Created:      {c['created_at'][:19]}",
            title="[bold]Campaign Detail[/bold]",
            border_style="blue",
        )
    )


@campaign.command("launch")
@click.argument("campaign_id")
def campaign_launch(campaign_id: str) -> None:
    """Launch a draft campaign."""
    from specter.cli.client import get_client

    client = get_client()
    resp = client.post(f"/api/v1/campaigns/{campaign_id}/launch")
    if resp.status_code == 200:
        console.print("[green]Campaign launched![/green]")
    else:
        detail = resp.json().get("detail", resp.status_code)
        console.print(f"[red]Failed: {detail}[/red]")


@campaign.command("delete")
@click.argument("campaign_id")
@click.confirmation_option(prompt="Are you sure you want to delete this campaign?")
def campaign_delete(campaign_id: str) -> None:
    """Delete a draft campaign."""
    from specter.cli.client import get_client

    client = get_client()
    resp = client.delete(f"/api/v1/campaigns/{campaign_id}")
    if resp.status_code == 204:
        console.print("[green]Campaign deleted.[/green]")
    else:
        detail = resp.json().get("detail", resp.status_code)
        console.print(f"[red]Failed: {detail}[/red]")


# ── Target group commands ────────────────────────────────────


@cli.group()
def targets() -> None:
    """Target group management."""
    pass


@targets.command("list")
def targets_list() -> None:
    """List all target groups."""
    from specter.cli.client import get_client

    client = get_client()
    resp = client.get("/api/v1/groups")
    if resp.status_code != 200:
        console.print(f"[red]Error: {resp.status_code}[/red]")
        return

    groups = resp.json()
    if not groups:
        console.print("[dim]No target groups found.[/dim]")
        return

    table = Table(title="Target Groups", border_style="blue")
    table.add_column("ID", style="dim", max_width=8)
    table.add_column("Name", style="bold")
    table.add_column("Members", justify="right")
    table.add_column("Description")

    for g in groups:
        table.add_row(
            g["id"][:8],
            g["name"],
            str(g.get("member_count", 0)),
            (g.get("description") or "—")[:40],
        )

    console.print(table)


@targets.command("create")
@click.option("--name", prompt="Group name", help="Target group name")
@click.option("--description", default=None, help="Group description")
def targets_create(name: str, description: str | None) -> None:
    """Create a new target group."""
    from specter.cli.client import get_client

    client = get_client()
    payload: dict = {"name": name}
    if description:
        payload["description"] = description

    resp = client.post("/api/v1/groups", json=payload)
    if resp.status_code == 201:
        data = resp.json()
        console.print(f"[green]Group created:[/green] {data['name']} ({data['id'][:8]})")
    else:
        detail = resp.json().get("detail", resp.status_code)
        console.print(f"[red]Failed: {detail}[/red]")


@targets.command("import")
@click.argument("csv_file", type=click.Path(exists=True))
@click.option("--group", "group_name", prompt="Target group name", help="Group to import into")
def targets_import(csv_file: str, group_name: str) -> None:
    """Import targets from a CSV file into a new group."""
    import csv
    from pathlib import Path

    from specter.cli.client import get_client

    client = get_client()

    # Read CSV
    csv_path = Path(csv_file)
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        console.print("[red]CSV file is empty.[/red]")
        return

    # Validate required columns
    required = {"email", "name"}
    headers = {h.lower().strip() for h in rows[0].keys()}
    missing = required - headers
    if missing:
        console.print(f"[red]CSV missing required columns: {', '.join(missing)}[/red]")
        console.print("Expected columns: email, name (optional: department, role)")
        return

    # Normalize header casing
    normalized_rows = []
    for row in rows:
        normalized = {k.lower().strip(): v.strip() for k, v in row.items()}
        normalized_rows.append(normalized)

    console.print(f"Found [cyan]{len(normalized_rows)}[/cyan] targets in {csv_path.name}")

    # Send to API
    resp = client.post(
        "/api/v1/groups/import",
        json={"group_name": group_name, "targets": normalized_rows},
    )

    if resp.status_code == 201:
        data = resp.json()
        console.print(f"[green]Imported {data['imported_count']} targets into '{data['group_name']}'[/green]")
        if data.get("skipped_count", 0) > 0:
            console.print(f"[yellow]Skipped {data['skipped_count']} (duplicate emails)[/yellow]")
    else:
        detail = resp.json().get("detail", resp.status_code)
        console.print(f"[red]Import failed: {detail}[/red]")


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
    from specter.cli.client import get_client

    try:
        client = get_client()
        resp = client.get("/api/v1/campaigns")
        if resp.status_code == 200:
            data = resp.json()
            total = data["total"]
            active = sum(1 for c in data["campaigns"] if c["status"] == "running")
            console.print(
                Panel(
                    f"Total campaigns:   [bold]{total}[/bold]\n"
                    f"Active campaigns:  [bold]{active}[/bold]\n"
                    f"Total simulations: [dim]— (Phase 2)[/dim]\n"
                    f"Overall click rate: [dim]— (Phase 2)[/dim]\n"
                    f"Report rate:        [dim]— (Phase 2)[/dim]\n"
                    f"Avg security score: [dim]— (Phase 5)[/dim]\n"
                    f"Risk level:         [dim]— (Phase 5)[/dim]",
                    title="[bold]Specter — Org Overview[/bold]",
                    border_style="blue",
                )
            )
        else:
            console.print(f"[red]Error fetching stats: {resp.status_code}[/red]")
    except SystemExit:
        pass


if __name__ == "__main__":
    cli()
