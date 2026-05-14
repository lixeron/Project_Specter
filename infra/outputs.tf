output "api_url" {
  description = "Specter API URL"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "resource_group" {
  description = "Azure resource group name"
  value       = azurerm_resource_group.specter.name
}

output "database_host" {
  description = "PostgreSQL server hostname"
  value       = azurerm_postgresql_flexible_server.specter.fqdn
}
