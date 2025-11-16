"""
Kafka Producer Example (Python)

Install: pip install kafka-python
"""

from kafka import KafkaProducer
from kafka.errors import KafkaError
import json
import time
import signal
import sys

# ========================================
# Configuration
# ========================================

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    client_id='my-app',

    # Serialization
    key_serializer=lambda k: k.encode('utf-8') if k else None,
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),

    # Performance tuning
    compression_type='lz4',  # 'gzip', 'snappy', 'lz4', 'zstd'
    batch_size=16384,        # 16 KB
    linger_ms=10,            # Wait 10ms to batch
    buffer_memory=33554432,  # 32 MB

    # Acknowledgment
    acks=1,  # 0=none, 1=leader, all=all replicas

    # Retries
    retries=3,
    max_in_flight_requests_per_connection=5,

    # Optional: SASL/SSL (for production)
    # security_protocol='SASL_SSL',
    # sasl_mechanism='SCRAM-SHA-512',
    # sasl_plain_username='user',
    # sasl_plain_password='password'
)

# ========================================
# Producer Functions
# ========================================

def produce_message(topic, key, value):
    """Send a single message"""
    try:
        future = producer.send(
            topic,
            key=key,
            value=value,
            headers=[
                ('source', b'my-app'),
                ('timestamp', str(int(time.time() * 1000)).encode())
            ]
        )

        # Block for 'synchronous' send
        record_metadata = future.get(timeout=10)

        print(f"✅ Message sent to {record_metadata.topic} "
              f"partition {record_metadata.partition} "
              f"offset {record_metadata.offset}")

        return record_metadata

    except KafkaError as e:
        print(f"❌ Error producing message: {e}")
        raise

def produce_message_async(topic, key, value):
    """Send message asynchronously with callback"""
    def on_send_success(record_metadata):
        print(f"✅ Message sent: partition={record_metadata.partition}, "
              f"offset={record_metadata.offset}")

    def on_send_error(excp):
        print(f"❌ Error sending message: {excp}")

    producer.send(topic, key=key, value=value) \\
        .add_callback(on_send_success) \\
        .add_errback(on_send_error)

def produce_batch(topic, messages):
    """Send multiple messages in a batch"""
    try:
        for msg in messages:
            producer.send(
                topic,
                key=msg['key'],
                value=msg['value'],
                headers=[('source', b'my-app')]
            )

        # Flush to ensure all messages are sent
        producer.flush()
        print(f"✅ {len(messages)} messages sent")

    except KafkaError as e:
        print(f"❌ Error producing batch: {e}")
        raise

# ========================================
# Main Function
# ========================================

def main():
    print("📡 Producer connected")

    # Example 1: Single message (synchronous)
    produce_message(
        'my-topic',
        'user-123',
        {
            'event': 'user_login',
            'userId': 'user-123',
            'timestamp': int(time.time() * 1000)
        }
    )

    # Example 2: Async message
    produce_message_async(
        'my-topic',
        'user-124',
        {'event': 'page_view', 'page': '/home'}
    )

    # Example 3: Batch of messages
    produce_batch('my-topic', [
        {'key': 'user-123', 'value': {'event': 'page_view', 'page': '/home'}},
        {'key': 'user-124', 'value': {'event': 'page_view', 'page': '/products'}},
        {'key': 'user-125', 'value': {'event': 'page_view', 'page': '/checkout'}}
    ])

    # Ensure all messages are sent
    producer.flush()

    print("👋 Producer disconnected")

# ========================================
# Graceful Shutdown
# ========================================

def signal_handler(sig, frame):
    print('\n🛑 Shutting down producer...')
    producer.flush()
    producer.close()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ========================================
# Run
# ========================================

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        producer.close()
