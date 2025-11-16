# MSK Server Configuration Template

# Topic Management
auto.create.topics.enable=${auto_create_topics_enable}
delete.topic.enable=${delete_topic_enable}

# Replication
default.replication.factor=${default_replication_factor}
min.insync.replicas=${min_insync_replicas}
offsets.topic.replication.factor=3
transaction.state.log.replication.factor=3
transaction.state.log.min.isr=2

# Log Retention
log.retention.hours=${log_retention_hours}
log.segment.bytes=${log_segment_bytes}
log.retention.check.interval.ms=300000

# Compression
compression.type=${compression_type}

# Performance Tuning
num.io.threads=${num_io_threads}
num.network.threads=${num_network_threads}
num.replica.fetchers=${num_replica_fetchers}
socket.request.max.bytes=${socket_request_max_bytes}

# Leader Election
unclean.leader.election.enable=${unclean_leader_election_enable}

# Group Coordinator
group.coordinator.rebalance.protocols=classic,cooperative
