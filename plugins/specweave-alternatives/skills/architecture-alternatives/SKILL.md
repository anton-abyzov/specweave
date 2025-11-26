---
name: architecture-alternatives
description: Software architecture patterns and alternatives expert. Covers monolith vs microservices, serverless, event-driven, CQRS, hexagonal architecture, clean architecture, DDD, and architecture decision frameworks. Activates for architecture patterns, monolith, microservices, serverless, event-driven, CQRS, hexagonal architecture, clean architecture, DDD, architecture decisions, system design, scalability patterns.
allowed-tools: Read, Grep, Glob
---

# Architecture Alternatives Expert Skill

Expert in software architecture patterns, their tradeoffs, and when to use each approach. Helps teams make informed architecture decisions based on context, scale, and organizational constraints.

## Core Architecture Patterns

### 1. Monolith vs Microservices

#### Monolithic Architecture

**Definition**: Single deployable unit containing all application logic.

**Strengths**:
- **Simplicity**: Single codebase, deployment, and database
- **Performance**: In-process communication (no network overhead)
- **Development Speed**: Easy local development and debugging
- **Data Consistency**: ACID transactions across entire system
- **Lower Operational Complexity**: One service to deploy, monitor, scale

**Weaknesses**:
- **Scaling**: Must scale entire application (can't scale components independently)
- **Deployment Risk**: Single point of failure, entire app redeploys for small changes
- **Team Coordination**: Large teams may conflict on shared codebase
- **Technology Lock-in**: Hard to adopt new languages/frameworks incrementally

**Best For**:
- Startups and MVPs (speed to market)
- Teams < 15 engineers
- Well-defined domains with low complexity
- Applications with predictable load patterns

**Example**:
```typescript
// Monolithic e-commerce app
class EcommerceApp {
  constructor(
    private userService: UserService,
    private productService: ProductService,
    private orderService: OrderService,
    private paymentService: PaymentService
  ) {}

  async checkout(userId: string, cartItems: CartItem[]) {
    // All in-process, single transaction
    const user = await this.userService.getUser(userId);
    const products = await this.productService.validateStock(cartItems);
    const order = await this.orderService.createOrder(user, products);
    const payment = await this.paymentService.processPayment(order);
    return { order, payment };
  }
}
```

#### Microservices Architecture

**Definition**: System composed of independently deployable services, each owning its domain.

**Strengths**:
- **Independent Scaling**: Scale services based on their specific load
- **Technology Diversity**: Use best tool for each service
- **Team Autonomy**: Teams own services end-to-end
- **Fault Isolation**: Failure in one service doesn't crash entire system
- **Faster Deployment**: Deploy services independently

**Weaknesses**:
- **Operational Complexity**: Distributed tracing, service mesh, monitoring
- **Data Consistency**: No ACID transactions across services (eventual consistency)
- **Network Overhead**: Inter-service communication latency
- **Testing Complexity**: End-to-end testing requires running multiple services
- **Organizational Overhead**: Requires mature DevOps culture

**Best For**:
- Large teams (50+ engineers)
- Complex domains requiring team specialization
- Independent scaling requirements
- Organizations with mature DevOps practices

**Example**:
```typescript
// Microservices e-commerce (order service)
class OrderService {
  async createOrder(userId: string, items: CartItem[]) {
    // 1. Call User Service via HTTP/gRPC
    const user = await this.httpClient.get(`http://user-service/users/${userId}`);

    // 2. Call Product Service to validate stock
    const stockCheck = await this.httpClient.post('http://product-service/validate', { items });

    // 3. Create order locally
    const order = await this.orderRepo.create({ userId, items, total: stockCheck.total });

    // 4. Publish OrderCreated event (eventual consistency)
    await this.eventBus.publish('OrderCreated', { orderId: order.id, items });

    return order;
  }
}
```

**Decision Matrix**:

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Team Size | < 15 | 50+ |
| Domain Complexity | Low-Medium | High |
| Deployment Frequency | Weekly | Multiple/day |
| Scalability Needs | Uniform | Heterogeneous |
| Ops Maturity | Basic | Advanced |

### 2. Serverless Architecture

**Definition**: Application logic runs in managed, ephemeral compute environments (FaaS - Function as a Service).

**Patterns**:

#### Event-Driven Functions
```typescript
// AWS Lambda example
export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    // Process uploaded image
    const image = await s3.getObject({ Bucket: bucket, Key: key });
    const thumbnail = await generateThumbnail(image);
    await s3.putObject({ Bucket: `${bucket}-thumbnails`, Key: key, Body: thumbnail });
  }
};
```

#### API Gateway + Lambda
```typescript
// API Gateway Lambda handler
export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = event.pathParameters?.userId;
  const user = await dynamoDB.get({ TableName: 'Users', Key: { id: userId } });

  return {
    statusCode: 200,
    body: JSON.stringify(user),
  };
};
```

**Strengths**:
- **Zero Server Management**: No infrastructure provisioning
- **Automatic Scaling**: Scales to zero, scales to millions
- **Pay-per-Use**: Only pay for actual execution time
- **Fast Iteration**: Deploy functions independently

**Weaknesses**:
- **Cold Starts**: 100ms-5s latency for infrequent functions
- **Vendor Lock-in**: AWS Lambda, Azure Functions, GCP Cloud Functions
- **Debugging Complexity**: Distributed logs, limited local testing
- **Statelessness**: No in-memory state (must use external storage)
- **Timeout Limits**: AWS Lambda max 15 minutes

**Best For**:
- Event-driven workloads (file processing, webhooks)
- Sporadic traffic patterns
- Rapid prototyping and MVPs
- Cost-sensitive projects with variable load

**Anti-Patterns**:
- Long-running processes (>15 min)
- Latency-sensitive APIs (<50ms required)
- Stateful applications (WebSocket servers)

### 3. Event-Driven Architecture

**Definition**: System components communicate through events rather than direct calls.

**Patterns**:

#### Event Sourcing
```typescript
// Store events, not current state
type AccountEvent =
  | { type: 'AccountOpened'; accountId: string; initialBalance: number }
  | { type: 'MoneyDeposited'; accountId: string; amount: number }
  | { type: 'MoneyWithdrawn'; accountId: string; amount: number };

class BankAccount {
  private balance = 0;

  // Replay events to reconstruct state
  applyEvent(event: AccountEvent) {
    switch (event.type) {
      case 'AccountOpened':
        this.balance = event.initialBalance;
        break;
      case 'MoneyDeposited':
        this.balance += event.amount;
        break;
      case 'MoneyWithdrawn':
        this.balance -= event.amount;
        break;
    }
  }

  // Commands produce events
  withdraw(amount: number): AccountEvent[] {
    if (this.balance < amount) throw new Error('Insufficient funds');
    return [{ type: 'MoneyWithdrawn', accountId: this.id, amount }];
  }
}
```

#### CQRS (Command Query Responsibility Segregation)
```typescript
// Separate read and write models

// WRITE MODEL (Commands)
class OrderCommandHandler {
  async createOrder(command: CreateOrderCommand) {
    const order = new Order(command.userId, command.items);
    await this.orderWriteRepo.save(order);
    await this.eventBus.publish('OrderCreated', order.toEvent());
  }
}

// READ MODEL (Queries - optimized for reads)
class OrderQueryHandler {
  async getUserOrders(userId: string): Promise<OrderSummary[]> {
    // Denormalized view, optimized for fast reads
    return this.orderReadRepo.findByUserId(userId);
  }
}

// Event handler updates read model asynchronously
class OrderEventHandler {
  async onOrderCreated(event: OrderCreatedEvent) {
    // Update denormalized read model
    await this.orderReadRepo.insertSummary({
      orderId: event.orderId,
      userId: event.userId,
      total: event.total,
      status: 'pending',
    });
  }
}
```

**Strengths**:
- **Decoupling**: Services don't need to know about each other
- **Scalability**: Asynchronous processing handles load spikes
- **Audit Trail**: Event log provides complete history
- **Flexibility**: Add new event consumers without changing producers

**Weaknesses**:
- **Eventual Consistency**: Read models lag behind writes
- **Complexity**: Debugging distributed event flows
- **Event Schema Evolution**: Managing event versioning
- **Ordering Guarantees**: Hard to maintain event order across partitions

**Best For**:
- Systems requiring audit trails (finance, healthcare)
- High-throughput systems (IoT, analytics)
- Complex business workflows
- Systems with multiple consumers of same events

### 4. Hexagonal Architecture (Ports & Adapters)

**Definition**: Application core is independent of external concerns (frameworks, databases, UI).

```typescript
// DOMAIN (Core - no external dependencies)
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

class Order {
  constructor(
    public readonly id: string,
    public readonly items: OrderItem[],
    public status: OrderStatus
  ) {}

  // Business logic here, independent of infrastructure
  complete() {
    if (this.status !== 'pending') throw new Error('Order already completed');
    this.status = 'completed';
  }
}

// APPLICATION (Use Cases)
class CompleteOrderUseCase {
  constructor(private orderRepo: OrderRepository) {}

  async execute(orderId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new Error('Order not found');

    order.complete();
    await this.orderRepo.save(order);
  }
}

// INFRASTRUCTURE (Adapters)
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order) {
    await this.db.query('UPDATE orders SET status = $1 WHERE id = $2', [order.status, order.id]);
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!row) return null;
    return new Order(row.id, row.items, row.status);
  }
}

// UI (Adapter)
class ExpressOrderController {
  constructor(private completeOrder: CompleteOrderUseCase) {}

  async handleCompleteOrder(req: Request, res: Response) {
    try {
      await this.completeOrder.execute(req.params.orderId);
      res.status(200).send({ message: 'Order completed' });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  }
}
```

**Strengths**:
- **Testability**: Core business logic testable without infrastructure
- **Flexibility**: Swap databases, frameworks without changing core
- **Clear Separation**: Business rules isolated from technical concerns
- **Domain-Focused**: Encourages focus on business logic, not frameworks

**Weaknesses**:
- **Boilerplate**: More interfaces and abstraction layers
- **Learning Curve**: Requires understanding of dependency inversion
- **Overkill for Simple Apps**: CRUD apps may not need this complexity

**Best For**:
- Domain-rich applications (complex business rules)
- Long-lived projects (future-proofing)
- Teams practicing DDD (Domain-Driven Design)

### 5. Clean Architecture (Uncle Bob)

**Definition**: Layered architecture with dependency inversion - dependencies point inward.

**Layers** (outermost to innermost):
1. **Frameworks & Drivers**: UI, Database, External APIs
2. **Interface Adapters**: Controllers, Presenters, Gateways
3. **Application Business Rules**: Use Cases
4. **Enterprise Business Rules**: Entities (domain models)

**Dependency Rule**: Inner layers NEVER depend on outer layers.

```typescript
// ENTITIES (innermost layer)
class User {
  constructor(public id: string, public email: string, public passwordHash: string) {}

  validatePassword(plainPassword: string, hasher: PasswordHasher): boolean {
    return hasher.compare(plainPassword, this.passwordHash);
  }
}

// USE CASES (application layer)
interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
}

class LoginUseCase {
  constructor(
    private userRepo: UserRepository,
    private passwordHasher: PasswordHasher,
    private tokenGenerator: TokenGenerator
  ) {}

  async execute(email: string, password: string): Promise<{ token: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.validatePassword(password, this.passwordHasher)) {
      throw new Error('Invalid credentials');
    }

    const token = this.tokenGenerator.generate(user.id);
    return { token };
  }
}

// INTERFACE ADAPTERS (controllers)
class AuthController {
  constructor(private loginUseCase: LoginUseCase) {}

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await this.loginUseCase.execute(email, password);
    res.json(result);
  }
}

// FRAMEWORKS & DRIVERS (infrastructure)
class BcryptPasswordHasher implements PasswordHasher {
  compare(plain: string, hash: string): boolean {
    return bcrypt.compareSync(plain, hash);
  }
}

class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!row) return null;
    return new User(row.id, row.email, row.password_hash);
  }
}
```

**Strengths**:
- **Framework Independence**: Core business logic doesn't depend on Express, React, etc.
- **Database Independence**: Swap PostgreSQL for MongoDB without changing use cases
- **Testability**: Mock interfaces easily for unit testing
- **UI Independence**: Same use cases work with REST API, GraphQL, CLI

**Weaknesses**:
- **Complexity**: Many layers and interfaces
- **Indirection**: Tracing logic through layers can be difficult
- **Over-Engineering**: CRUD apps don't benefit from this structure

**Best For**:
- Enterprise applications with long lifespans
- Applications with multiple UIs (web, mobile, CLI)
- Teams with experienced architects

### 6. Domain-Driven Design (DDD)

**Strategic Design Patterns**:

#### Bounded Contexts
```typescript
// SALES CONTEXT
class Customer {
  constructor(public id: string, public creditLimit: number) {}
}

// SUPPORT CONTEXT (different model for same entity!)
class Customer {
  constructor(public id: string, public supportTier: 'basic' | 'premium') {}
}

// Each context has its own model, even for same real-world concept
```

#### Context Mapping
```
Sales Context → Customer Context (Shared Kernel)
  - Share: CustomerId, CustomerName
  - Separate: CreditLimit (Sales only), SupportTickets (Support only)

Inventory Context → Sales Context (Upstream/Downstream)
  - Inventory publishes StockUpdated events
  - Sales consumes events to update product availability
```

**Tactical Design Patterns**:

#### Aggregates
```typescript
// Order is the Aggregate Root
class Order {
  private items: OrderItem[] = [];

  // Enforce business invariants
  addItem(product: Product, quantity: number) {
    if (quantity <= 0) throw new Error('Quantity must be positive');

    // Business rule: max 10 items per order
    if (this.items.length >= 10) throw new Error('Order cannot exceed 10 items');

    this.items.push(new OrderItem(product, quantity));
  }

  // Aggregate ensures consistency
  get total(): number {
    return this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
}

// OrderItem is NOT an Aggregate Root, only accessible through Order
class OrderItem {
  constructor(public product: Product, public quantity: number) {}

  get subtotal(): number {
    return this.product.price * this.quantity;
  }
}
```

#### Value Objects
```typescript
class Money {
  constructor(public readonly amount: number, public readonly currency: string) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}

// Immutable, defined by value (not identity)
const price1 = new Money(100, 'USD');
const price2 = new Money(100, 'USD');
console.log(price1.equals(price2)); // true (same value)
```

#### Domain Events
```typescript
class OrderPlaced {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly total: Money,
    public readonly occurredAt: Date
  ) {}
}

class Order {
  private events: DomainEvent[] = [];

  place() {
    if (this.status !== 'draft') throw new Error('Order already placed');
    this.status = 'placed';
    this.events.push(new OrderPlaced(this.id, this.userId, this.total, new Date()));
  }

  getEvents(): DomainEvent[] {
    return this.events;
  }
}
```

**Best For**:
- Complex business domains (finance, insurance, logistics)
- Large teams needing clear boundaries
- Long-lived systems with evolving requirements

## Architecture Decision Framework

### 1. Context Analysis

**Team Context**:
- Team size: 5-10 (Monolith), 20-50 (Modular Monolith), 50+ (Microservices)
- Experience: Junior (simpler patterns), Senior (can handle complexity)
- Org structure: Conway's Law - architecture mirrors communication

**Technical Context**:
- Current scale: 1k users (Monolith), 100k users (Modular Monolith), 1M+ (Microservices)
- Growth rate: Steady (simpler), Exponential (plan for scale)
- Performance requirements: <100ms (consider caching, CDN), <10ms (in-memory, edge)

**Business Context**:
- Time to market: Fast (Monolith, Serverless), Can wait (Microservices)
- Budget: Limited (Serverless, Monolith), Generous (custom infrastructure)
- Risk tolerance: Low (proven patterns), High (bleeding edge)

### 2. Decision Matrix

| Architecture | Complexity | Scalability | Ops Overhead | Best For |
|--------------|------------|-------------|--------------|----------|
| Monolith | Low | Medium | Low | Startups, MVPs |
| Modular Monolith | Medium | Medium | Low | Growing startups |
| Microservices | High | High | High | Large orgs |
| Serverless | Low | Very High | Very Low | Event-driven, variable load |
| Event-Driven | High | Very High | High | High throughput, audit trails |

### 3. Migration Paths

**Monolith → Modular Monolith**:
1. Identify bounded contexts
2. Extract modules with clear interfaces
3. Enforce module boundaries (linting, architecture tests)
4. Keep single deployment unit

**Modular Monolith → Microservices**:
1. Start with most independent module
2. Extract as service with API
3. Introduce message bus for events
4. Gradually extract remaining modules

**Monolith → Serverless**:
1. Extract background jobs to Lambda functions
2. Move APIs to API Gateway + Lambda
3. Migrate to managed databases (RDS, DynamoDB)
4. Decompose monolith incrementally

## Anti-Patterns

### 1. Distributed Monolith
Microservices with tight coupling - worst of both worlds.

❌ **Symptom**: Services can't deploy independently (require coordinated releases)
✅ **Fix**: Introduce message bus, versioned APIs, backward compatibility

### 2. Premature Microservices
Starting with microservices before understanding domain.

❌ **Symptom**: Constantly moving logic between services
✅ **Fix**: Start with modular monolith, extract services when boundaries are clear

### 3. Anemic Domain Model
Entities with only getters/setters, all logic in services.

❌ **Symptom**: Entities are just data containers
✅ **Fix**: Move business logic into domain entities

### 4. God Aggregate
Single aggregate managing entire system state.

❌ **Symptom**: All commands touch the same aggregate
✅ **Fix**: Split into smaller aggregates with clear boundaries

## Resources

- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)
- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)

## Activation Keywords

Ask me about:
- "Monolith vs microservices tradeoffs"
- "When to use serverless architecture"
- "Event-driven architecture patterns"
- "CQRS and event sourcing"
- "Hexagonal architecture examples"
- "Clean architecture in practice"
- "Domain-Driven Design patterns"
- "How to migrate from monolith to microservices"
- "Architecture decision frameworks"
