# Azure Event Hubs Terraform Module - Variables

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "namespace_name" {
  description = "Event Hubs namespace name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "sku" {
  description = "Event Hubs SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be Basic, Standard, or Premium."
  }
}

variable "capacity" {
  description = "Throughput units (1-40 for Standard, 1-10 for Premium)"
  type        = number
  default     = 2
}

variable "auto_inflate_enabled" {
  description = "Enable auto-inflate (Standard/Premium only)"
  type        = bool
  default     = false
}

variable "maximum_throughput_units" {
  description = "Maximum throughput units for auto-inflate"
  type        = number
  default     = 20
}

variable "zone_redundant" {
  description = "Enable zone redundancy (Premium only)"
  type        = bool
  default     = true
}

variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

variable "allowed_ip_addresses" {
  description = "Allowed IP addresses (CIDR format)"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs"
  type        = list(string)
  default     = []
}

variable "event_hubs" {
  description = "List of Event Hubs (topics) to create"
  type = list(object({
    name                   = string
    partition_count        = number
    message_retention_days = number
    consumer_groups        = optional(list(string), [])
    capture_enabled        = optional(bool, false)
    capture_container_name = optional(string, null)
    capture_storage_account_id = optional(string, null)
  }))
  default = []
}

variable "create_listen_authorization_rule" {
  description = "Create listen-only authorization rule"
  type        = bool
  default     = true
}

variable "create_send_authorization_rule" {
  description = "Create send-only authorization rule"
  type        = bool
  default     = true
}

variable "create_manage_authorization_rule" {
  description = "Create manage authorization rule"
  type        = bool
  default     = false
}

variable "enable_diagnostic_logs" {
  description = "Enable diagnostic logs"
  type        = bool
  default     = true
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  type        = string
  default     = null
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint (Premium only)"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = null
}

variable "enable_alerts" {
  description = "Enable metric alerts"
  type        = bool
  default     = true
}

variable "action_group_id" {
  description = "Action group ID for alerts"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
