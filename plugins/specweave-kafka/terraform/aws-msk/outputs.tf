# AWS MSK Terraform Module - Outputs

output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.main.arn
}

output "cluster_name" {
  description = "MSK cluster name"
  value       = aws_msk_cluster.main.cluster_name
}

output "zookeeper_connect_string" {
  description = "ZooKeeper connection string (legacy)"
  value       = aws_msk_cluster.main.zookeeper_connect_string
}

output "bootstrap_brokers" {
  description = "Plaintext bootstrap brokers"
  value       = aws_msk_cluster.main.bootstrap_brokers
}

output "bootstrap_brokers_tls" {
  description = "TLS bootstrap brokers"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "bootstrap_brokers_sasl_scram" {
  description = "SASL/SCRAM bootstrap brokers"
  value       = var.enable_scram_auth ? aws_msk_cluster.main.bootstrap_brokers_sasl_scram : null
}

output "bootstrap_brokers_sasl_iam" {
  description = "IAM auth bootstrap brokers"
  value       = var.enable_iam_auth ? aws_msk_cluster.main.bootstrap_brokers_sasl_iam : null
}

output "security_group_id" {
  description = "Security group ID for MSK cluster"
  value       = aws_security_group.msk_cluster.id
}

output "configuration_arn" {
  description = "MSK configuration ARN"
  value       = aws_msk_configuration.main.arn
}

output "configuration_revision" {
  description = "MSK configuration revision"
  value       = aws_msk_configuration.main.latest_revision
}

output "connection_examples" {
  description = "Example connection configurations"
  value = {
    java_iam = <<-EOT
      Properties props = new Properties();
      props.put("bootstrap.servers", "${aws_msk_cluster.main.bootstrap_brokers_sasl_iam}");
      props.put("security.protocol", "SASL_SSL");
      props.put("sasl.mechanism", "AWS_MSK_IAM");
      props.put("sasl.jaas.config", "software.amazon.msk.auth.iam.IAMLoginModule required;");
      props.put("sasl.client.callback.handler.class", "software.amazon.msk.auth.iam.IAMClientCallbackHandler");
    EOT

    nodejs_iam = <<-EOT
      const { Kafka } = require('kafkajs');
      const { KafkaJSAWSIAMAuthenticationMechanism } = require('@jm18457/kafkajs-msk-iam-authentication-mechanism');

      const kafka = new Kafka({
        clientId: 'my-app',
        brokers: ${jsonencode(split(",", aws_msk_cluster.main.bootstrap_brokers_sasl_iam))},
        ssl: true,
        sasl: {
          mechanism: 'aws',
          authenticationProvider: KafkaJSAWSIAMAuthenticationMechanism({
            region: '${data.aws_region.current.name}'
          })
        }
      });
    EOT

    cli_iam = <<-EOT
      # Using kcat (requires aws-msk-iam-auth plugin)
      kcat -b ${aws_msk_cluster.main.bootstrap_brokers_sasl_iam} \\
        -X security.protocol=SASL_SSL \\
        -X sasl.mechanism=AWS_MSK_IAM \\
        -L
    EOT
  }
}

# Data sources
data "aws_region" "current" {}
