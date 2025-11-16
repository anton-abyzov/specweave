# Azure Event Hubs Terraform Module - Outputs

output "namespace_id" {
  description = "Event Hubs namespace ID"
  value       = azurerm_eventhub_namespace.main.id
}

output "namespace_name" {
  description = "Event Hubs namespace name"
  value       = azurerm_eventhub_namespace.main.name
}

output "kafka_endpoint" {
  description = "Kafka endpoint (bootstrap servers)"
  value       = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093"
}

output "default_primary_connection_string" {
  description = "Default primary connection string"
  value       = azurerm_eventhub_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "default_primary_key" {
  description = "Default primary key"
  value       = azurerm_eventhub_namespace.main.default_primary_key
  sensitive   = true
}

output "listen_connection_string" {
  description = "Listen-only connection string"
  value       = var.create_listen_authorization_rule ? azurerm_eventhub_namespace_authorization_rule.listen[0].primary_connection_string : null
  sensitive   = true
}

output "send_connection_string" {
  description = "Send-only connection string"
  value       = var.create_send_authorization_rule ? azurerm_eventhub_namespace_authorization_rule.send[0].primary_connection_string : null
  sensitive   = true
}

output "manage_connection_string" {
  description = "Manage connection string"
  value       = var.create_manage_authorization_rule ? azurerm_eventhub_namespace_authorization_rule.manage[0].primary_connection_string : null
  sensitive   = true
}

output "event_hub_ids" {
  description = "Map of Event Hub names to IDs"
  value       = { for k, v in azurerm_eventhub.topics : k => v.id }
}

output "consumer_group_ids" {
  description = "Map of consumer group names to IDs"
  value       = { for k, v in azurerm_eventhub_consumer_group.groups : k => v.id }
}

output "connection_examples" {
  description = "Example connection configurations for Kafka API"
  value = {
    java = <<-EOT
      Properties props = new Properties();
      props.put("bootstrap.servers", "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093");
      props.put("security.protocol", "SASL_SSL");
      props.put("sasl.mechanism", "PLAIN");
      props.put("sasl.jaas.config", "org.apache.kafka.common.security.plain.PlainLoginModule required username=\"$$ConnectionString\" password=\"${var.create_send_authorization_rule ? "CONNECTION_STRING_HERE" : "USE_DEFAULT_CONNECTION_STRING"}\";");
      props.put("group.id", "my-consumer-group");
    EOT

    nodejs = <<-EOT
      const { Kafka } = require('kafkajs');

      const kafka = new Kafka({
        clientId: 'my-app',
        brokers: ['${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093'],
        ssl: true,
        sasl: {
          mechanism: 'plain',
          username: '$$ConnectionString',
          password: 'CONNECTION_STRING_HERE'
        }
      });
    EOT

    python = <<-EOT
      from kafka import KafkaProducer, KafkaConsumer

      producer = KafkaProducer(
          bootstrap_servers='${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093',
          security_protocol='SASL_SSL',
          sasl_mechanism='PLAIN',
          sasl_plain_username='$$ConnectionString',
          sasl_plain_password='CONNECTION_STRING_HERE'
      )
    EOT

    cli = <<-EOT
      # Using kcat
      kcat -b ${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093 \\
        -X security.protocol=SASL_SSL \\
        -X sasl.mechanism=PLAIN \\
        -X sasl.username='$$ConnectionString' \\
        -X sasl.password='CONNECTION_STRING_HERE' \\
        -L
    EOT
  }
}

output "capacity_info" {
  description = "Capacity and throughput information"
  value = {
    sku                      = var.sku
    capacity                 = var.capacity
    auto_inflate_enabled     = var.auto_inflate_enabled
    maximum_throughput_units = var.maximum_throughput_units
    zone_redundant           = var.zone_redundant
  }
}
