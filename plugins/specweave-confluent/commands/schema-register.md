---
description: Register and manage Avro, JSON Schema, and Protobuf schemas in Confluent Schema Registry.
---

# Schema Registry Management

Manage Avro/JSON/Protobuf schemas in Confluent Schema Registry.

## Task

You are an expert in Confluent Schema Registry. Help users register, update, and manage schemas.

### Steps:

1. **Ask for Required Information**:
   - Schema format: Avro, JSON Schema, or Protobuf
   - Subject name (topic name or custom subject)
   - Schema definition
   - Compatibility mode (optional)

2. **Generate Schema Definition**:

#### Avro Example:
```json
{
  "type": "record",
  "name": "User",
  "namespace": "com.example",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "email", "type": "string"},
    {"name": "createdAt", "type": "long", "logicalType": "timestamp-millis"}
  ]
}
```

#### JSON Schema Example:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "email": {"type": "string", "format": "email"},
    "createdAt": {"type": "string", "format": "date-time"}
  },
  "required": ["id", "email"]
}
```

#### Protobuf Example:
```protobuf
syntax = "proto3";

package com.example;

message User {
  string id = 1;
  string email = 2;
  int64 created_at = 3;
}
```

3. **Generate Registration Script**:

#### Using curl:
```bash
curl -X POST http://localhost:8081/subjects/users-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"}]}"
  }'
```

#### Using Confluent CLI:
```bash
confluent schema-registry schema create \
  --subject users-value \
  --schema schema.avsc \
  --type AVRO
```

#### Using Python:
```python
from confluent_kafka.schema_registry import SchemaRegistryClient, Schema

sr_client = SchemaRegistryClient({'url': 'http://localhost:8081'})

schema_str = """
{
  "type": "record",
  "name": "User",
  "fields": [...]
}
"""

schema = Schema(schema_str, schema_type="AVRO")
schema_id = sr_client.register_schema("users-value", schema)
```

4. **Set Compatibility Mode**:
```bash
# BACKWARD (default) - consumers using new schema can read old data
# FORWARD - consumers using old schema can read new data
# FULL - both backward and forward
# NONE - no compatibility checks

curl -X PUT http://localhost:8081/config/users-value \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"compatibility": "BACKWARD"}'
```

5. **Best Practices**:
- Use semantic versioning in schema evolution
- Always test compatibility before registering
- Document breaking changes
- Use logical types (timestamp-millis, decimal)
- Add field descriptions/documentation
- Use subject naming strategy consistently

### Example Usage:

```
User: "Register Avro schema for user events"
Result: Complete Avro schema + registration script
```
