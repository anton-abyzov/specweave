#!/bin/bash
# Kafka Broker Initialization Script (KRaft Mode)
#
# This script runs on first boot to set up a Kafka broker.

set -e

# ========================================
# Variables from Terraform
# ========================================

BROKER_ID="${broker_id}"
CLUSTER_NAME="${cluster_name}"
KAFKA_VERSION="${kafka_version}"
BROKER_COUNT="${broker_count}"
DATA_DISK_COUNT="${data_disk_count}"
HEAP_SIZE_GB="${heap_size_gb}"
KRAFT_CLUSTER_ID="${kraft_cluster_id}"
CONTROLLER_QUORUM="${controller_quorum}"
LOG_DIRS="${log_dirs}"
S3_BUCKET_BACKUPS="${s3_bucket_backups}"
CLOUDWATCH_NAMESPACE="${cloudwatch_namespace}"

# ========================================
# System Setup
# ========================================

echo "==> Starting Kafka broker initialization (ID: $BROKER_ID)"

# Update system
yum update -y

# Install required packages
yum install -y java-17-amazon-corretto-headless wget unzip jq awscli

# Install CloudWatch agent
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm
rm -f ./amazon-cloudwatch-agent.rpm

# ========================================
# Disk Setup (RAID 0 for data disks)
# ========================================

echo "==> Setting up data disks"

# Wait for disks to be attached
for i in $(seq 1 $DATA_DISK_COUNT); do
  DEVICE="/dev/nvme$((i))n1"
  while [ ! -b "$DEVICE" ]; do
    echo "Waiting for $DEVICE..."
    sleep 5
  done
done

# Format disks
for i in $(seq 1 $DATA_DISK_COUNT); do
  DEVICE="/dev/nvme$((i))n1"
  MOUNT_POINT="/data/kafka-logs-$((i-1))"

  # Format if not already formatted
  if ! blkid "$DEVICE"; then
    mkfs.xfs -f "$DEVICE"
  fi

  # Create mount point
  mkdir -p "$MOUNT_POINT"

  # Mount disk
  UUID=$(blkid -s UUID -o value "$DEVICE")
  echo "UUID=$UUID $MOUNT_POINT xfs defaults,noatime,nodiratime 0 2" >> /etc/fstab
  mount "$MOUNT_POINT"

  # Set ownership
  chown -R kafka:kafka "$MOUNT_POINT"
done

# ========================================
# Kafka Installation
# ========================================

echo "==> Installing Apache Kafka $KAFKA_VERSION"

# Download Kafka
cd /opt
wget -q "https://archive.apache.org/dist/kafka/$KAFKA_VERSION/kafka_2.13-$KAFKA_VERSION.tgz"
tar -xzf "kafka_2.13-$KAFKA_VERSION.tgz"
ln -s "kafka_2.13-$KAFKA_VERSION" kafka
rm -f "kafka_2.13-$KAFKA_VERSION.tgz"

# Create kafka user
useradd -r -s /bin/false kafka || true
chown -R kafka:kafka /opt/kafka*

# ========================================
# Kafka Configuration
# ========================================

echo "==> Configuring Kafka broker"

# Calculate heap size if not provided
if [ -z "$HEAP_SIZE_GB" ]; then
  TOTAL_MEM_GB=$(free -g | awk '/^Mem:/{print $2}')
  HEAP_SIZE_GB=$((TOTAL_MEM_GB * 60 / 100)) # 60% of total RAM
fi

# KRaft configuration
cat > /opt/kafka/config/kraft/server.properties <<EOF
# Broker ID
node.id=$BROKER_ID
process.roles=broker,controller
controller.quorum.voters=$CONTROLLER_QUORUM

# Socket server settings
listeners=SASL_SSL://:9092,CONTROLLER://:9093
advertised.listeners=SASL_SSL://$(hostname -f):9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=SASL_SSL:SASL_SSL,CONTROLLER:PLAINTEXT
inter.broker.listener.name=SASL_SSL

# Log directories
log.dirs=$LOG_DIRS

# Replication
default.replication.factor=3
min.insync.replicas=2
offsets.topic.replication.factor=3
transaction.state.log.replication.factor=3
transaction.state.log.min.isr=2

# Log retention
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# Performance tuning
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=1048576
socket.receive.buffer.bytes=1048576
socket.request.max.bytes=104857600
num.replica.fetchers=4

# Compression
compression.type=lz4

# Group coordinator
group.coordinator.rebalance.protocols=classic,cooperative
group.coordinator.num.threads=4

# SSL/TLS configuration
ssl.keystore.location=/opt/kafka/config/kafka.keystore.jks
ssl.keystore.password=changeme
ssl.key.password=changeme
ssl.truststore.location=/opt/kafka/config/kafka.truststore.jks
ssl.truststore.password=changeme

# SASL configuration
sasl.enabled.mechanisms=SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
EOF

# JVM settings
cat > /opt/kafka/bin/kafka-server-start-jvm.sh <<EOF
#!/bin/bash
export KAFKA_HEAP_OPTS="-Xms${HEAP_SIZE_GB}g -Xmx${HEAP_SIZE_GB}g"
export KAFKA_JVM_PERFORMANCE_OPTS="-XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:InitiatingHeapOccupancyPercent=35 -XX:G1HeapRegionSize=16M -XX:MinMetaspaceSize=96m -XX:MaxMetaspaceSize=512m -XX:+ExplicitGCInvokesConcurrent"
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote=true -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.port=9999"
exec /opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
EOF
chmod +x /opt/kafka/bin/kafka-server-start-jvm.sh

# ========================================
# KRaft Cluster ID
# ========================================

echo "==> Formatting KRaft metadata directory"

/opt/kafka/bin/kafka-storage.sh format \
  -t "$KRAFT_CLUSTER_ID" \
  -c /opt/kafka/config/kraft/server.properties

# ========================================
# Systemd Service
# ========================================

echo "==> Creating systemd service"

cat > /etc/systemd/system/kafka.service <<EOF
[Unit]
Description=Apache Kafka (KRaft Mode)
After=network.target

[Service]
Type=simple
User=kafka
ExecStart=/opt/kafka/bin/kafka-server-start-jvm.sh
Restart=on-failure
RestartSec=10s
LimitNOFILE=100000

[Install]
WantedBy=multi-user.target
EOF

# ========================================
# Start Kafka
# ========================================

systemctl daemon-reload
systemctl enable kafka
systemctl start kafka

echo "==> Kafka broker started successfully (ID: $BROKER_ID)"
echo "==> Cluster: $CLUSTER_NAME"
echo "==> Version: $KAFKA_VERSION"
