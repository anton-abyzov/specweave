# Exactly-Once Semantics (EOS) Example

**Zero message duplication or loss with transactional producers**

Demonstrates end-to-end exactly-once processing for financial transactions.

## Features

- **Transactional Producer** - Atomic writes to multiple topics
- **Read-Committed Consumer** - Only reads committed messages
- **Offset Management** - Commits offsets within transactions
- **Guaranteed Delivery** - Zero duplicates, zero message loss

## Run

```bash
npm install
npm run eos-pipeline
```

## Use Cases

- Financial transactions
- Order processing
- Billing systems
- Any scenario where duplicates are unacceptable

## Documentation

See [Advanced Usage Guide](../../.specweave/docs/public/guides/kafka-advanced-usage.md#exactly-once-semantics-eos)
