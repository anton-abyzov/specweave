# Azure Event Hubs (Kafka API) - Terraform Module
#
# Provisions Azure Event Hubs namespace with Kafka protocol support.
# Event Hubs is Azure's managed Kafka-compatible service.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  namespace_name = "${var.environment}-${var.namespace_name}"

  common_tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Service     = "EventHubs"
  })
}

# ========================================
# Event Hubs Namespace
# ========================================

resource "azurerm_eventhub_namespace" "main" {
  name                = local.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku
  capacity            = var.capacity

  # Kafka support
  kafka_enabled = true

  # Network configuration
  public_network_access_enabled = var.public_network_access_enabled
  minimum_tls_version           = "1.2"

  # Auto-inflate (Standard/Premium only)
  auto_inflate_enabled     = var.auto_inflate_enabled
  maximum_throughput_units = var.auto_inflate_enabled ? var.maximum_throughput_units : null

  # Zone redundancy (Premium only)
  zone_redundant = var.sku == "Premium" ? var.zone_redundant : false

  # Identity for managed identity auth
  identity {
    type = "SystemAssigned"
  }

  # Network rules
  dynamic "network_rulesets" {
    for_each = length(var.allowed_ip_addresses) > 0 || length(var.allowed_subnet_ids) > 0 ? [1] : []
    content {
      default_action = "Deny"
      trusted_service_access_enabled = true

      dynamic "ip_rule" {
        for_each = var.allowed_ip_addresses
        content {
          ip_mask = ip_rule.value
        }
      }

      dynamic "virtual_network_rule" {
        for_each = var.allowed_subnet_ids
        content {
          subnet_id = virtual_network_rule.value
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = local.namespace_name
  })
}

# ========================================
# Event Hubs (Topics)
# ========================================

resource "azurerm_eventhub" "topics" {
  for_each = { for topic in var.event_hubs : topic.name => topic }

  name                = each.value.name
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name
  partition_count     = each.value.partition_count
  message_retention   = each.value.message_retention_days

  # Capture to storage (optional)
  dynamic "capture_description" {
    for_each = try(each.value.capture_enabled, false) ? [1] : []
    content {
      enabled             = true
      encoding            = "Avro"
      interval_in_seconds = 300
      size_limit_in_bytes = 314572800

      destination {
        name                = "EventHubArchive.AzureBlockBlob"
        archive_name_format = "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"
        blob_container_name = each.value.capture_container_name
        storage_account_id  = each.value.capture_storage_account_id
      }
    }
  }
}

# ========================================
# Consumer Groups
# ========================================

resource "azurerm_eventhub_consumer_group" "groups" {
  for_each = {
    for item in flatten([
      for topic in var.event_hubs : [
        for group in try(topic.consumer_groups, []) : {
          topic = topic.name
          group = group
        }
      ]
    ]) : "${item.topic}-${item.group}" => item
  }

  name                = each.value.group
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.topics[each.value.topic].name
  resource_group_name = var.resource_group_name
}

# ========================================
# Authorization Rules (SAS Keys)
# ========================================

resource "azurerm_eventhub_namespace_authorization_rule" "listen" {
  count = var.create_listen_authorization_rule ? 1 : 0

  name                = "${local.namespace_name}-listen"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name

  listen = true
  send   = false
  manage = false
}

resource "azurerm_eventhub_namespace_authorization_rule" "send" {
  count = var.create_send_authorization_rule ? 1 : 0

  name                = "${local.namespace_name}-send"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name

  listen = false
  send   = true
  manage = false
}

resource "azurerm_eventhub_namespace_authorization_rule" "manage" {
  count = var.create_manage_authorization_rule ? 1 : 0

  name                = "${local.namespace_name}-manage"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name

  listen = true
  send   = true
  manage = true
}

# ========================================
# Diagnostic Settings
# ========================================

resource "azurerm_monitor_diagnostic_setting" "namespace" {
  count = var.enable_diagnostic_logs ? 1 : 0

  name                       = "${local.namespace_name}-diagnostics"
  target_resource_id         = azurerm_eventhub_namespace.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  dynamic "enabled_log" {
    for_each = [
      "OperationalLogs",
      "AutoScaleLogs",
      "KafkaCoordinatorLogs",
      "KafkaUserErrorLogs",
      "EventHubVNetConnectionEvent",
      "CustomerManagedKeyUserLogs"
    ]
    content {
      category = enabled_log.value
    }
  }

  metric {
    category = "AllMetrics"
  }
}

# ========================================
# Private Endpoint (Premium SKU only)
# ========================================

resource "azurerm_private_endpoint" "namespace" {
  count = var.sku == "Premium" && var.enable_private_endpoint ? 1 : 0

  name                = "${local.namespace_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${local.namespace_name}-psc"
    private_connection_resource_id = azurerm_eventhub_namespace.main.id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }

  tags = local.common_tags
}

# ========================================
# Alerts
# ========================================

resource "azurerm_monitor_metric_alert" "throttled_requests" {
  count = var.enable_alerts ? 1 : 0

  name                = "${local.namespace_name}-throttled-requests"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_eventhub_namespace.main.id]
  description         = "Alert when throttled requests exceed threshold"
  severity            = 2

  criteria {
    metric_namespace = "Microsoft.EventHub/namespaces"
    metric_name      = "ThrottledRequests"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 100
  }

  action {
    action_group_id = var.action_group_id
  }

  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "server_errors" {
  count = var.enable_alerts ? 1 : 0

  name                = "${local.namespace_name}-server-errors"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_eventhub_namespace.main.id]
  description         = "Alert when server errors occur"
  severity            = 1

  criteria {
    metric_namespace = "Microsoft.EventHub/namespaces"
    metric_name      = "ServerErrors"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = var.action_group_id
  }

  tags = local.common_tags
}
