"""
Kafka Consumer Example (Python)

Install: pip install kafka-python
"""

from kafka import KafkaConsumer
from kafka.errors import KafkaError
import json
import signal
import sys

# ========================================
# Configuration
# ========================================

consumer = KafkaConsumer(
    'my-topic',  # Can subscribe to multiple topics
    bootstrap_servers=['localhost:9092'],
    client_id='my-app',
    group_id='my-consumer-group',

    # Deserialization
    key_deserializer=lambda k: k.decode('utf-8') if k else None,
    value_deserializer=lambda v: json.loads(v.decode('utf-8')),

    # Offset management
    auto_offset_reset='earliest',  # 'earliest', 'latest', 'none'
    enable_auto_commit=True,
    auto_commit_interval_ms=5000,

    # Performance tuning
    fetch_min_bytes=1,          # Minimum data to fetch
    fetch_max_wait_ms=500,      # Max wait time
    max_poll_records=500,       # Messages per poll
    max_poll_interval_ms=300000,  # 5 minutes

    # Session management
    session_timeout_ms=30000,
    heartbeat_interval_ms=3000,

    # Optional: SASL/SSL (for production)
    # security_protocol='SASL_SSL',
    # sasl_mechanism='SCRAM-SHA-512',
    # sasl_plain_username='user',
    # sasl_plain_password='password'
)

# ========================================
# Consumer Functions
# ========================================

def process_message(message):
    """Process a single message"""
    try:
        print(f"""
📨 Message received:
  Topic: {message.topic}
  Partition: {message.partition}
  Offset: {message.offset}
  Key: {message.key}
  Value: {message.value}
  Timestamp: {message.timestamp}
  Headers: {dict(message.headers) if message.headers else {}}
        """)

        # Your business logic here
        event_type = message.value.get('event')

        if event_type == 'user_login':
            handle_user_login(message.value)
        elif event_type == 'order_created':
            handle_order_created(message.value)
        else:
            print(f"Unknown event type: {event_type}")

    except Exception as e:
        print(f"❌ Error processing message: {e}")
        # Send to dead letter queue
        send_to_dlq(message, e)

def handle_user_login(data):
    """Handle user login event"""
    print(f"👤 User login: {data.get('userId')}")
    # Update user last login time
    # Send welcome email
    # etc.

def handle_order_created(data):
    """Handle order created event"""
    print(f"🛒 Order created: {data}")
    # Process order
    # Send confirmation email
    # Update inventory

def send_to_dlq(message, error):
    """Send failed message to dead letter queue"""
    from kafka import KafkaProducer
    import json

    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    dlq_message = {
        'original_topic': message.topic,
        'original_partition': message.partition,
        'original_offset': message.offset,
        'original_key': message.key,
        'original_value': message.value,
        'error_message': str(error),
        'failed_at': int(time.time() * 1000)
    }

    producer.send('my-topic-dlq', value=dlq_message)
    producer.flush()
    producer.close()

    print("📮 Message sent to DLQ")

# ========================================
# Consume Methods
# ========================================

def consume_simple():
    """Simple consume loop"""
    print("📡 Consumer connected (simple mode)")

    try:
        for message in consumer:
            process_message(message)
    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()
        print("👋 Consumer disconnected")

def consume_batch():
    """Consume messages in batches"""
    print("📡 Consumer connected (batch mode)")

    try:
        while True:
            # Poll for messages (returns a dict of topic partition to records)
            message_batch = consumer.poll(timeout_ms=1000, max_records=100)

            if not message_batch:
                continue

            for topic_partition, messages in message_batch.items():
                print(f"📦 Processing batch: {len(messages)} messages "
                      f"from {topic_partition.topic} partition {topic_partition.partition}")

                for message in messages:
                    process_message(message)

                # Commit offsets after processing batch
                consumer.commit()

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()
        print("👋 Consumer disconnected")

def consume_manual_commit():
    """Consume with manual offset management"""
    print("📡 Consumer connected (manual commit)")

    # Disable auto-commit
    consumer._config['enable_auto_commit'] = False

    try:
        for message in consumer:
            try:
                process_message(message)

                # Manual commit after successful processing
                consumer.commit()

            except Exception as e:
                print(f"❌ Error processing, skipping commit: {e}")
                # Don't commit offset, message will be redelivered

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()
        print("👋 Consumer disconnected")

# ========================================
# Main Function
# ========================================

def main():
    # Choose consumption method
    # consume_simple()
    # consume_batch()
    consume_simple()

# ========================================
# Graceful Shutdown
# ========================================

def signal_handler(sig, frame):
    print('\n🛑 Shutting down consumer...')
    consumer.close()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ========================================
# Run
# ========================================

if __name__ == '__main__':
    import time
    main()
