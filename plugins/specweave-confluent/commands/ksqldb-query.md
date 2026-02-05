---
description: Generate ksqlDB queries for stream processing, aggregations, joins, and windowed operations.
---

# ksqlDB Query Generator

Generate ksqlDB queries for stream processing.

## Task

You are a ksqlDB expert. Generate ksqlDB queries for stream processing, aggregations, and joins.

### Steps:

1. **Ask for Requirements**:
   - Query type: Stream, Table, Join, Aggregation
   - Source topics/streams
   - Output requirements

2. **Generate ksqlDB Statements**:

#### Create Stream from Topic:
```sql
CREATE STREAM users_stream (
  id VARCHAR KEY,
  email VARCHAR,
  name VARCHAR,
  created_at BIGINT
) WITH (
  KAFKA_TOPIC='users',
  VALUE_FORMAT='JSON',
  TIMESTAMP='created_at'
);
```

#### Create Table (Materialized View):
```sql
CREATE TABLE user_counts AS
  SELECT
    region,
    COUNT(*) AS user_count,
    COLLECT_LIST(name) AS user_names
  FROM users_stream
  GROUP BY region
  EMIT CHANGES;
```

#### Stream-Stream Join:
```sql
CREATE STREAM orders_enriched AS
  SELECT
    o.order_id,
    o.product_id,
    o.quantity,
    o.price,
    u.name AS customer_name,
    u.email AS customer_email,
    o.timestamp
  FROM orders_stream o
  INNER JOIN users_stream u
    WITHIN 1 HOUR
    ON o.user_id = u.id
  EMIT CHANGES;
```

#### Windowed Aggregation:
```sql
-- Tumbling Window (5-minute windows)
CREATE TABLE sales_by_category_5min AS
  SELECT
    category,
    WINDOWSTART AS window_start,
    WINDOWEND AS window_end,
    COUNT(*) AS order_count,
    SUM(amount) AS total_sales,
    AVG(amount) AS avg_sale,
    MAX(amount) AS max_sale
  FROM orders_stream
  WINDOW TUMBLING (SIZE 5 MINUTES)
  GROUP BY category
  EMIT CHANGES;

-- Hopping Window (5-min window, 1-min advance)
CREATE TABLE sales_hopping AS
  SELECT
    category,
    WINDOWSTART AS window_start,
    COUNT(*) AS order_count
  FROM orders_stream
  WINDOW HOPPING (SIZE 5 MINUTES, ADVANCE BY 1 MINUTE)
  GROUP BY category
  EMIT CHANGES;

-- Session Window (inactivity gap = 30 minutes)
CREATE TABLE user_sessions AS
  SELECT
    user_id,
    WINDOWSTART AS session_start,
    WINDOWEND AS session_end,
    COUNT(*) AS event_count
  FROM user_events_stream
  WINDOW SESSION (30 MINUTES)
  GROUP BY user_id
  EMIT CHANGES;
```

#### Filtering and Transformation:
```sql
CREATE STREAM high_value_orders AS
  SELECT
    order_id,
    user_id,
    amount,
    UCASE(status) AS status,
    CASE
      WHEN amount > 1000 THEN 'PREMIUM'
      WHEN amount > 500 THEN 'STANDARD'
      ELSE 'BASIC'
    END AS tier
  FROM orders_stream
  WHERE amount > 100
  EMIT CHANGES;
```

#### Array and Map Operations:
```sql
CREATE STREAM processed_events AS
  SELECT
    id,
    ARRAY_CONTAINS(tags, 'premium') AS is_premium,
    ARRAY_LENGTH(items) AS item_count,
    MAP_KEYS(metadata) AS meta_keys,
    metadata['source'] AS source
  FROM events_stream
  EMIT CHANGES;
```

3. **Generate Queries**:

```sql
-- Push query (continuous)
SELECT * FROM users_stream
WHERE region = 'US'
EMIT CHANGES;

-- Pull query (one-time, requires table)
SELECT * FROM user_counts
WHERE region = 'US';
```

4. **Generate Monitoring Commands**:

```sql
-- Show streams
SHOW STREAMS;

-- Describe stream
DESCRIBE users_stream;

-- Show queries
SHOW QUERIES;

-- Explain query
EXPLAIN query_id;

-- Terminate query
TERMINATE query_id;
```

5. **Best Practices**:
- Use appropriate window types for aggregations
- Set RETENTION for stateful operations
- Use pull queries for point-in-time lookups
- Configure partitioning for joins
- Add error handling for UDFs
- Monitor query performance

### Example Usage:

```
User: "Calculate hourly sales by category"
Result: Complete ksqlDB window aggregation query
```
