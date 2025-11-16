# Apache Kafka Terraform Module - Outputs

output "cluster_name" {
  description = "Full Kafka cluster name"
  value       = local.cluster_name
}

output "broker_ids" {
  description = "List of Kafka broker IDs"
  value       = [for i in range(local.broker_count) : i]
}

output "broker_instance_ids" {
  description = "List of EC2 instance IDs for Kafka brokers"
  value       = aws_instance.kafka_broker[*].id
}

output "broker_private_ips" {
  description = "List of private IPs for Kafka brokers"
  value       = aws_instance.kafka_broker[*].private_ip
}

output "broker_dns_names" {
  description = "List of DNS names for Kafka brokers"
  value       = [for i in range(local.broker_count) : "kafka-broker-${i}.${var.domain}"]
}

output "bootstrap_servers" {
  description = "Kafka bootstrap servers connection string"
  value       = join(",", [for i in range(local.broker_count) : "kafka-broker-${i}.${var.domain}:9092"])
}

output "bootstrap_servers_sasl_ssl" {
  description = "Kafka bootstrap servers (SASL_SSL)"
  value       = join(",", [for i in range(local.broker_count) : "kafka-broker-${i}.${var.domain}:9092"])
}

output "controller_quorum" {
  description = "KRaft controller quorum endpoints"
  value       = join(",", [for i in range(local.broker_count) : "${i}@kafka-broker-${i}.${var.domain}:9093"])
}

output "kraft_cluster_id" {
  description = "KRaft cluster ID (UUID)"
  value       = random_uuid.kraft_cluster_id.result
  sensitive   = true
}

output "security_group_id" {
  description = "Security group ID for Kafka brokers"
  value       = aws_security_group.kafka_broker.id
}

output "iam_role_arn" {
  description = "IAM role ARN for Kafka brokers"
  value       = aws_iam_role.kafka_broker.arn
}

output "backup_s3_bucket" {
  description = "S3 bucket name for Kafka backups"
  value       = aws_s3_bucket.kafka_backups.bucket
}

output "cloudwatch_namespace" {
  description = "CloudWatch namespace for Kafka metrics"
  value       = "Kafka/${local.cluster_name}"
}

output "connection_examples" {
  description = "Example connection configurations"
  value = {
    java = <<-EOT
      Properties props = new Properties();
      props.put("bootstrap.servers", "${join(",", [for i in range(local.broker_count) : "kafka-broker-${i}.${var.domain}:9092"])}");
      props.put("security.protocol", "SASL_SSL");
      props.put("sasl.mechanism", "SCRAM-SHA-512");
      props.put("sasl.jaas.config", "org.apache.kafka.common.security.scram.ScramLoginModule required username=\"user\" password=\"password\";");
    EOT

    nodejs = <<-EOT
      const kafka = new Kafka({
        clientId: 'my-app',
        brokers: ${jsonencode([for i in range(local.broker_count) : "kafka-broker-${i}.${var.domain}:9092"])},
        ssl: true,
        sasl: {
          mechanism: 'scram-sha-512',
          username: 'user',
          password: 'password'
        }
      });
    EOT

    cli = <<-EOT
      kcat -b ${join(",", [for i in range(local.broker_count) : "kafka-broker-${i}.${var.domain}:9092"])} \\
        -X security.protocol=SASL_SSL \\
        -X sasl.mechanism=SCRAM-SHA-512 \\
        -X sasl.username=user \\
        -X sasl.password=password \\
        -L
    EOT
  }
}

output "kafka_version" {
  description = "Apache Kafka version deployed"
  value       = var.kafka_version
}
