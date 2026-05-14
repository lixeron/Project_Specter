terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# ── Resource Group ───────────────────────────────────────────

resource "azurerm_resource_group" "specter" {
  name     = "rg-specter-${var.environment}"
  location = var.location

  tags = {
    project     = "specter"
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ── Log Analytics (required for Container Apps) ──────────────

resource "azurerm_log_analytics_workspace" "specter" {
  name                = "log-specter-${var.environment}"
  location            = azurerm_resource_group.specter.location
  resource_group_name = azurerm_resource_group.specter.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# ── Container App Environment ────────────────────────────────

resource "azurerm_container_app_environment" "specter" {
  name                       = "cae-specter-${var.environment}"
  location                   = azurerm_resource_group.specter.location
  resource_group_name        = azurerm_resource_group.specter.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.specter.id
}

# ── PostgreSQL Flexible Server ───────────────────────────────

resource "azurerm_postgresql_flexible_server" "specter" {
  name                   = "psql-specter-${var.environment}"
  resource_group_name    = azurerm_resource_group.specter.name
  location               = azurerm_resource_group.specter.location
  version                = "16"
  administrator_login    = "specter"
  administrator_password = var.db_password
  zone                   = "1"

  storage_mb = 32768
  sku_name   = "B_Standard_B1ms" # Burstable, cheapest tier

  tags = {
    project     = "specter"
    environment = var.environment
  }
}

resource "azurerm_postgresql_flexible_server_database" "specter" {
  name      = "specter"
  server_id = azurerm_postgresql_flexible_server.specter.id
  charset   = "utf8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.specter.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ── Container App (API) ─────────────────────────────────────

resource "azurerm_container_app" "api" {
  name                         = "specter-api"
  container_app_environment_id = azurerm_container_app_environment.specter.id
  resource_group_name          = azurerm_resource_group.specter.name
  revision_mode                = "Single"

  template {
    min_replicas = 0
    max_replicas = 3

    container {
      name   = "specter-api"
      image  = "ghcr.io/lixeron/project_specter:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "APP_ENV"
        value = var.environment == "prod" ? "production" : var.environment
      }
      env {
        name  = "DEBUG"
        value = var.environment == "prod" ? "false" : "true"
      }
      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name  = "LOG_FORMAT"
        value = "json"
      }
      env {
        name  = "LOG_LEVEL"
        value = var.environment == "prod" ? "INFO" : "DEBUG"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  secret {
    name  = "secret-key"
    value = var.secret_key
  }

  secret {
    name  = "database-url"
    value = "postgresql+asyncpg://specter:${var.db_password}@${azurerm_postgresql_flexible_server.specter.fqdn}:5432/specter?sslmode=require"
  }

  tags = {
    project     = "specter"
    environment = var.environment
  }
}
