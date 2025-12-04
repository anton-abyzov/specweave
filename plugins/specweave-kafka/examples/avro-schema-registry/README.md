# Avro Schema Registry Example

**Schema-based serialization with Confluent Schema Registry**

Demonstrates Avro schema registration, evolution, and message validation.

## Prerequisites

- Node.js 18+
- Kafka cluster with Schema Registry
- Schemas can evolve while maintaining backward compatibility

## Setup

```bash
npm install
cp .env.example .env
# Configure KAFKA_BROKERS and SCHEMA_REGISTRY_URL
```

## Run

```bash
# Register schema and produce
npm run producer

# Consume with schema validation
npm run consumer
```

## Features

- **Schema Registration** - Auto-register Avro schemas
- **Schema Evolution** - Add optional fields safely
- **Validation** - Messages must match schema
- **Serialization** - Binary Avro encoding (smaller than JSON)

## Schema Evolution Example

```javascript
// V1 - Initial schema
const userSchemaV1 = {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'name', type: 'string' }
  ]
};

// V2 - BACKWARD compatible (add optional field)
const userSchemaV2 = {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'name', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null } // NEW
  ]
};

// Old consumers can still read V2 messages (ignore email)
// New producers can send V2 messages with email field
```

## Documentation

- [Avro Specification](https://avro.apache.org/docs/current/spec.html)
- [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
