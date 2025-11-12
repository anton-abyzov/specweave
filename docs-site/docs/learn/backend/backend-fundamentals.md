---
id: backend-fundamentals
title: Backend Development Fundamentals
sidebar_label: Backend Fundamentals
description: Complete guide to backend/server-side development - API design, databases, authentication, microservices, and production best practices
---

# Backend Development Fundamentals

## What is Backend Development?

Backend development (also called server-side development) is the part of software engineering that handles everything users don't see directly. While the frontend presents the user interface, the backend processes requests, manages data, enforces business rules, and coordinates with external services.

**Backend responsibilities:**
- **Process HTTP requests** - Handle incoming API calls from frontend/mobile apps
- **Manage data** - Store, retrieve, update, and delete data in databases
- **Enforce business logic** - Apply rules (e.g., "users can't overdraw accounts")
- **Authenticate users** - Verify identities and manage sessions
- **Integrate services** - Connect with payment processors, email services, cloud storage
- **Run background jobs** - Process tasks asynchronously (generate reports, send notifications)

**Frontend vs Backend:**

```mermaid
graph LR
    User[User] --> Frontend[Frontend<br/>React/Vue/Angular]
    Frontend --> Backend[Backend<br/>Node.js/Python/Java]
    Backend --> DB[(Database<br/>PostgreSQL/MongoDB)]
    Backend --> Cache[(Cache<br/>Redis)]
    Backend --> Queue[Message Queue<br/>RabbitMQ]
    Backend --> External[External APIs<br/>Stripe/SendGrid]
```

**Key Difference:**
- **Frontend**: Runs in user's browser, focuses on presentation and interactivity
- **Backend**: Runs on servers, focuses on data integrity, security, and business logic

---

## Core Backend Responsibilities

### 1. API Endpoints

**Purpose**: Provide structured access to data and operations

**Example**: User management API
```
GET    /api/users           → List users
GET    /api/users/:id       → Get single user
POST   /api/users           → Create user
PUT    /api/users/:id       → Update user
DELETE /api/users/:id       → Delete user
```

**Best Practice**: RESTful design with HTTP methods matching operations (GET = read, POST = create, PUT = update, DELETE = delete)

### 2. Business Logic

**Purpose**: Enforce rules that define how the application works

**Examples:**
- **E-commerce**: "Can't checkout with empty cart"
- **Banking**: "Can't transfer more than account balance"
- **Social media**: "Can only delete your own posts"

**Code Example** (Order validation):
```typescript
class OrderService {
  async createOrder(userId: string, items: CartItem[]): Promise<Order> {
    // Business rule: Minimum order amount $10
    const total = this.calculateTotal(items);
    if (total < 10) {
      throw new Error('Minimum order amount is $10');
    }

    // Business rule: Check inventory
    await this.validateInventory(items);

    // Business rule: Apply discounts
    const discount = await this.calculateDiscount(userId, total);

    return this.orderRepository.create({
      userId,
      items,
      total: total - discount,
      status: 'pending'
    });
  }
}
```

### 3. Database Management

**Purpose**: Persist data reliably and efficiently

**Responsibilities:**
- **Schema design** - Define tables/collections and relationships
- **Queries** - Read/write data efficiently
- **Migrations** - Evolve schema over time
- **Transactions** - Ensure data consistency

**Example** (E-commerce database):
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL
);

-- Orders table (relationship)
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order items (many-to-many relationship)
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL
);
```

### 4. Authentication & Authorization

**Purpose**: Secure the application and control access

**Authentication** (Who are you?):
- Login with email/password
- OAuth (Google, GitHub, etc.)
- JWT tokens or sessions

**Authorization** (What can you do?):
- Role-based access control (RBAC)
- Permissions (read, write, delete)
- Resource ownership (users can only edit their own data)

**Example**:
```typescript
// Authentication middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload; // Attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Authorization middleware
function requireRole(role: string) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/api/users/:id', authenticate, requireRole('admin'), deleteUser);
```

### 5. External Integrations

**Purpose**: Leverage third-party services

**Common Integrations:**
- **Payment processing** - Stripe, PayPal
- **Email/SMS** - SendGrid, Twilio
- **Cloud storage** - AWS S3, Cloudinary
- **Analytics** - Google Analytics, Mixpanel

**Example** (Stripe payment):
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createPayment(amount: number, currency: string) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Stripe uses cents
    currency,
    payment_method_types: ['card']
  });

  return {
    clientSecret: paymentIntent.client_secret
  };
}
```

### 6. Background Jobs

**Purpose**: Process time-consuming tasks asynchronously

**Use Cases:**
- Send email notifications (don't block API response)
- Generate reports
- Process uploaded files
- Clean up old data

**Example** (Bull queue with Redis):
```typescript
import Queue from 'bull';

const emailQueue = new Queue('email', {
  redis: { host: 'localhost', port: 6379 }
});

// Producer: Add job to queue
async function sendWelcomeEmail(userId: string, email: string) {
  await emailQueue.add('welcome', { userId, email });
}

// Consumer: Process jobs
emailQueue.process('welcome', async (job) => {
  const { userId, email } = job.data;
  await emailService.send(email, 'Welcome!', 'Thanks for joining...');
});
```

---

## Backend Architecture Patterns

### MVC (Model-View-Controller)

**Concept**: Separate concerns into three layers

```mermaid
graph TD
    Client[Client Request] --> Controller[Controller<br/>Handle request, validate input]
    Controller --> Service[Service Layer<br/>Business logic]
    Service --> Model[Model<br/>Data access, database]
    Model --> DB[(Database)]
    Model --> Service
    Service --> Controller
    Controller --> View[View/Response<br/>JSON, HTML]
    View --> Client
```

**Responsibilities:**
- **Model**: Database schema and queries
- **View**: Response formatting (JSON for APIs)
- **Controller**: Route requests to appropriate services

**Example** (Express.js):
```typescript
// Model (TypeORM entity)
@Entity()
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  passwordHash: string;
}

// Controller (routes + validation)
class UserController {
  @Get('/users')
  async listUsers(req: Request, res: Response) {
    const users = await userService.findAll();
    res.json(users);
  }

  @Post('/users')
  async createUser(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await userService.create(email, password);
    res.status(201).json(user);
  }
}

// Service (business logic)
class UserService {
  async create(email: string, password: string) {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Save to database
    return userRepository.save({ email, passwordHash });
  }
}
```

### Layered Architecture

**Concept**: Organize code into distinct layers with clear dependencies

```mermaid
graph TD
    API[API Layer<br/>Express routes, validation] --> Service[Service Layer<br/>Business logic]
    Service --> Repository[Repository Layer<br/>Database queries]
    Repository --> DB[(Database)]
```

**Benefits:**
- ✅ Separation of concerns (easier to test and maintain)
- ✅ Swappable implementations (change database without touching business logic)
- ✅ Clear dependencies (upper layers depend on lower layers, not vice versa)

**Example**:
```typescript
// API Layer (routes)
app.post('/orders', async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(order);
});

// Service Layer (business logic)
class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private inventoryRepo: InventoryRepository,
    private paymentService: PaymentService
  ) {}

  async createOrder(data: CreateOrderDto) {
    // Validate inventory
    await this.inventoryRepo.checkStock(data.items);

    // Process payment
    await this.paymentService.charge(data.amount);

    // Create order
    return this.orderRepo.create(data);
  }
}

// Repository Layer (data access)
class OrderRepository {
  async create(data: CreateOrderDto) {
    return db.orders.insert(data);
  }

  async findById(id: string) {
    return db.orders.findOne({ where: { id } });
  }
}
```

### Clean Architecture

**Concept**: Dependency inversion (business logic doesn't depend on external details)

```mermaid
graph TD
    External[External Interfaces<br/>Controllers, DB, APIs] --> Application[Application Layer<br/>Use cases, services]
    Application --> Domain[Domain Layer<br/>Entities, business rules]
    Domain -.-> Application
    Application -.-> External

    style Domain fill:#90EE90
    style Application fill:#87CEEB
    style External fill:#FFD700
```

**Key Principle**: Dependencies point inward. The domain layer (core business logic) has zero external dependencies.

**Example**:
```typescript
// Domain Layer (pure business logic, no dependencies)
class Order {
  constructor(
    public id: string,
    public items: OrderItem[],
    public status: 'pending' | 'paid' | 'shipped'
  ) {}

  // Business rule: Can only ship paid orders
  canShip(): boolean {
    return this.status === 'paid' && this.items.length > 0;
  }

  // Business rule: Calculate total
  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

// Application Layer (orchestrates domain logic)
class CreateOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository, // Interface, not concrete class
    private paymentGateway: IPaymentGateway
  ) {}

  async execute(data: CreateOrderDto): Promise<Order> {
    const order = new Order(uuid(), data.items, 'pending');

    // Business rule validation (domain layer)
    if (order.getTotal() < 10) {
      throw new Error('Minimum order $10');
    }

    // External operations (application layer)
    await this.paymentGateway.charge(order.getTotal());
    await this.orderRepo.save(order);

    return order;
  }
}

// External Layer (implementation details)
class PostgresOrderRepository implements IOrderRepository {
  async save(order: Order): Promise<void> {
    await db.orders.insert(order);
  }
}
```

**Benefits:**
- ✅ Business logic is testable without databases or APIs
- ✅ Easy to swap implementations (Postgres → MongoDB, Stripe → PayPal)
- ✅ Domain model stays pure and focused

---

## Node.js Backend Development

### Why Node.js?

**Advantages:**
1. **JavaScript everywhere** - Same language for frontend and backend
2. **Async I/O** - Handle thousands of concurrent connections efficiently
3. **NPM ecosystem** - 2+ million packages
4. **Large community** - Abundant tutorials, libraries, and support
5. **Performance** - V8 engine compiles JavaScript to native code

**Use Cases:**
- ✅ REST/[GraphQL](/docs/glossary/terms/graphql) [APIs](/docs/glossary/terms/api)
- ✅ Real-time applications (chat, notifications)
- ✅ [Microservices](/docs/glossary/terms/microservices)
- ✅ Server-side rendering (Next.js, SSR)

**Not Ideal For:**
- ❌ CPU-intensive tasks (video encoding, machine learning)
- ❌ Heavy computation (use Python, Go, Rust instead)

### Express.js: Minimal Framework

**Philosophy**: Unopinionated, minimal, flexible

**Complete REST API Example:**

```typescript
import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

// In-memory database (use real DB in production)
const users: User[] = [];

// Middleware: Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Middleware: Authentication
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = jwt.verify(token, 'SECRET_KEY');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.get('/users', authenticate, (req, res) => {
  res.json(users);
});

app.get('/users/:id', authenticate, (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post(
  '/users',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: String(users.length + 1),
      email,
      passwordHash
    };
    users.push(user);

    res.status(201).json({ id: user.id, email: user.email });
  }
);

app.put('/users/:id', authenticate, async (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Update fields
  if (req.body.email) user.email = req.body.email;
  if (req.body.password) {
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
  }

  res.json({ id: user.id, email: user.email });
});

app.delete('/users/:id', authenticate, (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  users.splice(index, 1);
  res.status(204).send();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### NestJS: Enterprise Framework

**Philosophy**: Opinionated, TypeScript-first, inspired by Angular

**Key Features:**
- **Modules** - Organize code into feature modules
- **Dependency Injection** - Automatic wiring of dependencies
- **Decorators** - Express intent declaratively
- **Built-in OpenAPI** - Auto-generate API documentation

**Complete Module Example:**

```typescript
// user.entity.ts (Database model)
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;
}

// user.dto.ts (Data Transfer Objects)
import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 8 })
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, minLength: 8 })
  @MinLength(8)
  password?: string;
}

// user.service.ts (Business logic)
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user exists
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: createUserDto.email,
      passwordHash
    });

    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}

// user.controller.ts (HTTP endpoints)
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'List all users' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Get user by ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

// user.module.ts (Module definition)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService] // Available to other modules
})
export class UserModule {}
```

**NestJS Benefits:**
- ✅ Built-in validation (class-validator)
- ✅ Auto-generated OpenAPI docs
- ✅ Dependency injection (testability)
- ✅ Modular architecture (scalability)
- ✅ TypeScript-first (type safety)

---

## API Design

### REST API Principles

**REST** (Representational State Transfer) - Architectural style for networked applications

**6 Core Principles:**

1. **Resource-Based URLs**
   - URLs represent resources (nouns), not actions (verbs)
   - ✅ `/users`, `/products`, `/orders`
   - ❌ `/getUsers`, `/createProduct`, `/deleteOrder`

2. **HTTP Methods**
   - `GET` - Read (safe, idempotent)
   - `POST` - Create (not idempotent)
   - `PUT` - Update/Replace (idempotent)
   - `PATCH` - Partial update (idempotent)
   - `DELETE` - Delete (idempotent)

3. **Status Codes**
   - `200 OK` - Success
   - `201 Created` - Resource created
   - `204 No Content` - Success, no response body
   - `400 Bad Request` - Validation error
   - `401 Unauthorized` - Not authenticated
   - `403 Forbidden` - Not authorized
   - `404 Not Found` - Resource doesn't exist
   - `409 Conflict` - Duplicate resource
   - `500 Internal Server Error` - Server error

4. **Stateless**
   - Each request contains all information needed (JWT token, not session)

5. **Cacheable**
   - Responses indicate if they can be cached (`Cache-Control` headers)

6. **Uniform Interface**
   - Consistent patterns across all endpoints

**Complete Example: User Management API**

```
# List users (with pagination)
GET /api/v1/users?page=1&limit=20
Response: 200 OK
{
  "data": [
    { "id": "1", "email": "user@example.com", "name": "John Doe" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

# Get single user
GET /api/v1/users/1
Response: 200 OK
{ "id": "1", "email": "user@example.com", "name": "John Doe" }

Response: 404 Not Found
{ "error": "User not found" }

# Create user
POST /api/v1/users
Body: { "email": "new@example.com", "password": "SecurePass123" }
Response: 201 Created
{ "id": "2", "email": "new@example.com" }

Response: 400 Bad Request
{ "errors": [{ "field": "email", "message": "Invalid email format" }] }

# Update user (full replacement)
PUT /api/v1/users/1
Body: { "email": "updated@example.com", "name": "Jane Doe" }
Response: 200 OK
{ "id": "1", "email": "updated@example.com", "name": "Jane Doe" }

# Partial update
PATCH /api/v1/users/1
Body: { "name": "Jane Smith" }
Response: 200 OK
{ "id": "1", "email": "updated@example.com", "name": "Jane Smith" }

# Delete user
DELETE /api/v1/users/1
Response: 204 No Content

# Search/filter users
GET /api/v1/users?search=john&role=admin&sort=-createdAt
Response: 200 OK
{ "data": [...] }
```

### GraphQL API

**Concept**: Query language for APIs - clients request exactly what they need

**Key Features:**
- **Flexible queries** - Client specifies response shape
- **No over-fetching** - Only requested fields are returned
- **No under-fetching** - Get related data in one request
- **Strongly typed** - Schema defines all types and operations

**Complete Example:**

```graphql
# Schema definition (server-side)
type User {
  id: ID!
  email: String!
  name: String
  posts: [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  comments: [Comment!]!
  createdAt: DateTime!
}

type Comment {
  id: ID!
  content: String!
  author: User!
  createdAt: DateTime!
}

type Query {
  # Get all users (with pagination)
  users(page: Int, limit: Int): [User!]!

  # Get single user
  user(id: ID!): User

  # Search posts
  posts(search: String): [Post!]!
}

type Mutation {
  # Create user
  createUser(email: String!, password: String!): User!

  # Update user
  updateUser(id: ID!, name: String): User!

  # Delete user
  deleteUser(id: ID!): Boolean!

  # Create post
  createPost(title: String!, content: String!): Post!
}

# Client query (exactly what you need)
query GetUserWithPosts {
  user(id: "1") {
    id
    email
    name
    posts {
      id
      title
      comments {
        id
        content
        author {
          name
        }
      }
    }
  }
}

# Response (matches query structure)
{
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "name": "John Doe",
      "posts": [
        {
          "id": "10",
          "title": "My First Post",
          "comments": [
            {
              "id": "20",
              "content": "Great post!",
              "author": { "name": "Jane Smith" }
            }
          ]
        }
      ]
    }
  }
}
```

**Resolver Implementation** (Node.js + TypeGraphQL):

```typescript
import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { User } from './user.entity';
import { UserService } from './user.service';

@Resolver(User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => [User])
  async users(
    @Arg('page', { nullable: true }) page?: number,
    @Arg('limit', { nullable: true }) limit?: number
  ): Promise<User[]> {
    return this.userService.findAll({ page, limit });
  }

  @Query(() => User, { nullable: true })
  async user(@Arg('id') id: string): Promise<User | null> {
    return this.userService.findById(id);
  }

  @Mutation(() => User)
  async createUser(
    @Arg('email') email: string,
    @Arg('password') password: string
  ): Promise<User> {
    return this.userService.create({ email, password });
  }

  @Mutation(() => User)
  async updateUser(
    @Arg('id') id: string,
    @Arg('name', { nullable: true }) name?: string
  ): Promise<User> {
    return this.userService.update(id, { name });
  }

  @Mutation(() => Boolean)
  async deleteUser(@Arg('id') id: string): Promise<boolean> {
    await this.userService.delete(id);
    return true;
  }
}
```

**REST vs GraphQL:**

| Aspect | REST | GraphQL |
|--------|------|---------|
| **Endpoints** | Multiple (`/users`, `/posts`, `/comments`) | Single (`/graphql`) |
| **Response Shape** | Fixed (server decides) | Flexible (client decides) |
| **Over-fetching** | Common (get all fields) | Never (specify fields) |
| **Under-fetching** | Common (multiple requests) | Rare (nested queries) |
| **Caching** | Easy (HTTP caching) | Complex (custom caching) |
| **Learning Curve** | Low | Medium |
| **Best For** | CRUD apps, public APIs | Complex queries, mobile apps |

### API Best Practices

#### 1. Versioning

**Why:** Allow breaking changes without affecting existing clients

**Methods:**
- **URL versioning** (recommended): `/api/v1/users`, `/api/v2/users`
- **Header versioning**: `Accept: application/vnd.api.v1+json`
- **Query param**: `/api/users?version=1`

**Example:**
```typescript
// v1: Returns basic user info
app.get('/api/v1/users/:id', (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json({ id: user.id, email: user.email });
});

// v2: Returns additional fields + posts
app.get('/api/v2/users/:id', (req, res) => {
  const user = await userService.findByIdWithPosts(req.params.id);
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    posts: user.posts
  });
});
```

#### 2. Pagination

**Why:** Avoid returning thousands of records in one response

**Methods:**
- **Offset-based**: `?page=2&limit=20` (simple, but inconsistent with inserts)
- **Cursor-based**: `?cursor=abc123&limit=20` (consistent, complex)

**Example (Offset):**
```typescript
app.get('/api/v1/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const [users, total] = await db.users.findAndCount({
    skip: offset,
    take: limit
  });

  res.json({
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});
```

#### 3. Filtering and Sorting

**Example:**
```
GET /api/v1/users?role=admin&status=active&sort=-createdAt

- role=admin: Filter by role
- status=active: Filter by status
- sort=-createdAt: Sort descending by createdAt
```

**Implementation:**
```typescript
app.get('/api/v1/users', async (req, res) => {
  const { role, status, sort } = req.query;

  const query: any = {};
  if (role) query.role = role;
  if (status) query.status = status;

  let orderBy = {};
  if (sort) {
    const field = sort.startsWith('-') ? sort.slice(1) : sort;
    const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
    orderBy = { [field]: direction };
  }

  const users = await db.users.find({
    where: query,
    order: orderBy
  });

  res.json({ data: users });
});
```

#### 4. Rate Limiting

**Why:** Prevent abuse and ensure fair usage

**Example** (express-rate-limit):
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

#### 5. Error Handling

**Best Practices:**
- Consistent error format
- Helpful error messages
- Appropriate status codes
- Don't expose internal details in production

**Example:**
```typescript
// Error format
interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
}

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response: ApiError = {
    error: err.name || 'InternalServerError',
    message: err.message,
    statusCode
  };

  // Validation errors (400)
  if (err.name === 'ValidationError') {
    response.errors = err.details.map(d => ({
      field: d.path,
      message: d.message
    }));
  }

  // Don't expose stack trace in production
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});
```

#### 6. API Documentation

**OpenAPI/Swagger** (industry standard):

```typescript
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
app.get('/api/v1/users', listUsers);
```

**Auto-generated docs**: Swagger UI at `/api-docs`

---

## Database Design

### SQL vs NoSQL

**SQL (Relational Databases):**
- **Examples**: PostgreSQL, MySQL, SQLite
- **Data Model**: Tables with rows and columns
- **Schema**: Fixed, predefined schema
- **Relationships**: Foreign keys, JOIN operations
- **ACID Transactions**: Guaranteed consistency

**NoSQL (Non-Relational Databases):**
- **Examples**: MongoDB (document), Redis (key-value), Neo4j (graph)
- **Data Model**: Varies (documents, key-value pairs, graphs)
- **Schema**: Flexible, dynamic schema
- **Relationships**: Embedded documents or references
- **Eventual Consistency**: High availability over consistency

**Comparison Table:**

| Feature | SQL (PostgreSQL) | NoSQL (MongoDB) |
|---------|-----------------|----------------|
| **Schema** | Fixed (migrations required) | Flexible (add fields anytime) |
| **Relationships** | Strong (foreign keys, JOINs) | Weak (references or embed) |
| **Transactions** | ACID (strong consistency) | Eventual consistency |
| **Scalability** | Vertical (bigger server) | Horizontal (more servers) |
| **Query Language** | SQL (standardized) | Database-specific (MongoDB Query Language) |
| **Use Cases** | Financial apps, e-commerce | Content management, real-time analytics |

**When to Use SQL:**
- ✅ Complex relationships (users → orders → order_items → products)
- ✅ Transactions required (banking, payments)
- ✅ Reporting and analytics (complex JOINs)
- ✅ Data integrity is critical

**When to Use NoSQL:**
- ✅ Flexible schema (user-generated content)
- ✅ High write throughput (logs, events)
- ✅ Horizontal scaling (millions of users)
- ✅ Caching (Redis)

### Database Schema Example

**E-commerce Database** (PostgreSQL):

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table (one-to-many with users)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items (many-to-many junction table)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Example queries
-- Get user's orders with items
SELECT o.id, o.total, o.status, oi.quantity, p.name, p.price
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.user_id = 'user-uuid-here';

-- Get top-selling products
SELECT p.name, SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

**ER Diagram:**

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : included_in

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string name
        timestamp created_at
    }

    PRODUCTS {
        uuid id PK
        string name
        text description
        decimal price
        int stock
    }

    ORDERS {
        uuid id PK
        uuid user_id FK
        decimal total
        string status
        timestamp created_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal price
    }
```

### ORM (Object-Relational Mapping)

**Concept**: Map database tables to classes/objects

**Benefits:**
- ✅ Write database queries in your programming language (TypeScript/JavaScript)
- ✅ Type safety (TypeScript interfaces match database schema)
- ✅ Database-agnostic (swap PostgreSQL for MySQL without code changes)
- ✅ Migrations (version control for database schema)

**Example with TypeORM:**

```typescript
// Entity definition (matches database table)
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  stock: number;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.orders)
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ default: 'pending' })
  status: string;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, order => order.items)
  order: Order;

  @ManyToOne(() => Product)
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
}

// Repository usage (CRUD operations)
import { AppDataSource } from './data-source';

const userRepository = AppDataSource.getRepository(User);

// Create
const user = userRepository.create({
  email: 'user@example.com',
  passwordHash: 'hashed',
  name: 'John Doe'
});
await userRepository.save(user);

// Read
const users = await userRepository.find();
const user = await userRepository.findOne({ where: { email: 'user@example.com' } });

// Read with relations
const userWithOrders = await userRepository.findOne({
  where: { id: 'user-id' },
  relations: ['orders', 'orders.items', 'orders.items.product']
});

// Update
await userRepository.update({ id: 'user-id' }, { name: 'Jane Doe' });

// Delete
await userRepository.delete({ id: 'user-id' });

// Query builder (complex queries)
const topUsers = await userRepository
  .createQueryBuilder('user')
  .leftJoin('user.orders', 'order')
  .select('user.email', 'email')
  .addSelect('COUNT(order.id)', 'orderCount')
  .groupBy('user.id')
  .orderBy('orderCount', 'DESC')
  .limit(10)
  .getRawMany();
```

**Migration Example** (version control for schema):

```typescript
// migration/1234567890-CreateUsersTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'password_hash', type: 'varchar' },
          { name: 'name', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

---

## Authentication & Authorization

### Authentication Methods

#### 1. JWT (JSON Web Tokens)

**How It Works:**

```mermaid
sequenceDiagram
    Client->>Server: POST /login (email, password)
    Server->>Database: Verify credentials
    Database-->>Server: User found
    Server->>Server: Generate JWT token
    Server-->>Client: Return token + user info

    Client->>Server: GET /protected (token in header)
    Server->>Server: Verify token signature
    Server-->>Client: Protected resource
```

**JWT Structure:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

[Header].[Payload].[Signature]

Header: { "alg": "HS256", "typ": "JWT" }
Payload: { "userId": "123", "email": "user@example.com", "exp": 1735689600 }
Signature: HMAC(base64(header) + "." + base64(payload), secret)
```

**Implementation:**

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await userRepository.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  // Generate refresh token (longer expiry)
  const refreshToken = jwt.sign(
    { userId: user.id },
    SECRET_KEY,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload; // Attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const payload = jwt.verify(refreshToken, SECRET_KEY);
    const user = await userRepository.findOne({ where: { id: payload.userId } });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({ token: newToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Protected route
app.get('/api/profile', authenticate, async (req, res) => {
  const user = await userRepository.findOne({ where: { id: req.user.userId } });
  res.json(user);
});
```

#### 2. Session-Based Authentication

**How It Works:**

```mermaid
sequenceDiagram
    Client->>Server: POST /login (email, password)
    Server->>Database: Verify credentials
    Database-->>Server: User found
    Server->>Redis: Store session (userId, expiry)
    Server-->>Client: Set-Cookie: sessionId=abc123

    Client->>Server: GET /protected (cookie: sessionId)
    Server->>Redis: Get session by sessionId
    Redis-->>Server: Session data (userId)
    Server-->>Client: Protected resource
```

**Implementation:**

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

// Redis client
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

// Session middleware
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true, // Not accessible via JavaScript
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await userRepository.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Store user ID in session
  req.session.userId = user.id;
  req.session.email = user.email;

  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Protected route
app.get('/api/profile', requireAuth, async (req, res) => {
  const user = await userRepository.findOne({ where: { id: req.session.userId } });
  res.json(user);
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});
```

#### 3. OAuth2 (Third-Party Login)

**How It Works:**

```mermaid
sequenceDiagram
    User->>Client: Click "Login with Google"
    Client->>AuthProvider: Redirect to Google
    User->>AuthProvider: Authorize app
    AuthProvider-->>Client: Redirect with code
    Client->>AuthProvider: Exchange code for token
    AuthProvider-->>Client: Access token
    Client->>AuthProvider: Get user profile
    AuthProvider-->>Client: User info
    Client->>Server: Login/register user
    Server-->>Client: JWT token
```

**Implementation** (Passport.js + Google OAuth):

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      // Find or create user
      let user = await userRepository.findOne({ where: { googleId: profile.id } });

      if (!user) {
        user = await userRepository.save({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName
        });
      }

      done(null, user);
    }
  )
);

// Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    // Generate JWT
    const token = jwt.sign({ userId: req.user.id }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: req.user });
  }
);
```

### Authorization (RBAC - Role-Based Access Control)

**Concept**: Users have roles, roles have permissions

**Example Roles:**
- `admin` - Full access
- `editor` - Can create/edit content
- `viewer` - Read-only access

**Implementation:**

```typescript
// User model with role
@Entity()
class User {
  @Column({ default: 'viewer' })
  role: 'admin' | 'editor' | 'viewer';
}

// Authorization middleware
function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Usage
app.delete('/api/users/:id', authenticate, requireRole(['admin']), deleteUser);
app.put('/api/posts/:id', authenticate, requireRole(['admin', 'editor']), updatePost);
app.get('/api/posts', authenticate, requireRole(['admin', 'editor', 'viewer']), listPosts);

// Resource ownership (users can only edit their own resources)
function requireOwnership(req, res, next) {
  const resourceUserId = req.params.userId; // From URL
  const currentUserId = req.user.userId; // From JWT

  if (resourceUserId !== currentUserId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Can only edit your own resources' });
  }

  next();
}

// Usage
app.put('/api/users/:userId/profile', authenticate, requireOwnership, updateProfile);
```

---

## Microservices Architecture

### Why Microservices?

**Monolith vs Microservices:**

```mermaid
graph TD
    subgraph Monolith
        M[Single Application]
        M --> DB1[(One Database)]
    end

    subgraph Microservices
        S1[User Service] --> DB2[(Users DB)]
        S2[Product Service] --> DB3[(Products DB)]
        S3[Order Service] --> DB4[(Orders DB)]
        S4[Payment Service] --> DB5[(Payments DB)]

        API[API Gateway] --> S1
        API --> S2
        API --> S3
        API --> S4
    end
```

**Comparison:**

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | Single unit | Independent services |
| **Scaling** | Scale entire app | Scale individual services |
| **Tech Stack** | One stack | Mixed stacks (Node.js + Python + Go) |
| **Failures** | Cascade failures | Isolated failures |
| **Development** | Simple (one codebase) | Complex (coordination) |
| **Testing** | Easy (everything together) | Complex (integration tests) |

**When to Use Microservices:**
- ✅ Large teams (multiple teams working independently)
- ✅ Different scalability needs (payment service needs more resources)
- ✅ Mixed tech stacks (ML service in Python, API in Node.js)
- ✅ Frequent deployments (deploy one service without affecting others)

**When to Avoid:**
- ❌ Small team (coordination overhead)
- ❌ Simple application (unnecessary complexity)
- ❌ Early-stage startup (focus on product-market fit first)

### Service Communication

#### 1. Synchronous (REST/gRPC)

**REST Example:**

```typescript
// Order service calls Payment service
class OrderService {
  async createOrder(data: CreateOrderDto) {
    // 1. Create order
    const order = await this.orderRepo.create(data);

    // 2. Call Payment service (synchronous HTTP request)
    const paymentResult = await fetch('http://payment-service/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        amount: order.total
      })
    }).then(res => res.json());

    if (!paymentResult.success) {
      // Rollback order if payment fails
      await this.orderRepo.delete(order.id);
      throw new Error('Payment failed');
    }

    return order;
  }
}
```

**Circuit Breaker Pattern** (prevent cascade failures):

```typescript
import CircuitBreaker from 'opossum';

// Wrap payment service call in circuit breaker
const paymentBreaker = new CircuitBreaker(callPaymentService, {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000 // Try again after 30 seconds
});

paymentBreaker.fallback(() => {
  // Fallback: Queue payment for retry
  return { success: false, retry: true };
});

async function callPaymentService(data) {
  const res = await fetch('http://payment-service/api/payments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}

// Usage
const result = await paymentBreaker.fire({ orderId: '123', amount: 100 });
```

#### 2. Asynchronous (Message Queues)

**Event-Driven Architecture:**

```mermaid
sequenceDiagram
    OrderService->>RabbitMQ: Publish "OrderCreated" event
    RabbitMQ-->>PaymentService: Consume event
    PaymentService->>PaymentService: Process payment
    PaymentService->>RabbitMQ: Publish "PaymentProcessed" event
    RabbitMQ-->>OrderService: Consume event
    OrderService->>OrderService: Update order status
    RabbitMQ-->>NotificationService: Consume event
    NotificationService->>NotificationService: Send email
```

**Implementation** (RabbitMQ):

```typescript
import amqp from 'amqplib';

// Order service (producer)
class OrderService {
  async createOrder(data: CreateOrderDto) {
    const order = await this.orderRepo.create(data);

    // Publish event (asynchronous)
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const exchange = 'orders';

    await channel.assertExchange(exchange, 'fanout', { durable: true });
    channel.publish(
      exchange,
      '',
      Buffer.from(JSON.stringify({
        type: 'OrderCreated',
        data: { orderId: order.id, amount: order.total }
      }))
    );

    return order;
  }
}

// Payment service (consumer)
async function startPaymentConsumer() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  const exchange = 'orders';
  const queue = 'payment_queue';

  await channel.assertExchange(exchange, 'fanout', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, '');

  channel.consume(queue, async (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());

      if (event.type === 'OrderCreated') {
        // Process payment
        const paymentResult = await processPayment(event.data);

        // Publish result
        channel.publish(
          'payments',
          '',
          Buffer.from(JSON.stringify({
            type: 'PaymentProcessed',
            data: { orderId: event.data.orderId, success: paymentResult.success }
          }))
        );
      }

      channel.ack(msg);
    }
  });
}
```

**Benefits of Async:**
- ✅ **Decoupling** - Services don't need to know about each other
- ✅ **Reliability** - Messages are queued if consumer is down
- ✅ **Scalability** - Add more consumers to process faster
- ✅ **Resilience** - Failures don't cascade

### Example: Order Processing Microservices

**Services:**
1. **User Service** - Authentication, user profiles
2. **Product Service** - Product catalog, inventory
3. **Order Service** - Create orders, track status
4. **Payment Service** - Process payments (Stripe)
5. **Notification Service** - Send emails/SMS

**Order Flow:**

```mermaid
sequenceDiagram
    Client->>APIGateway: POST /orders
    APIGateway->>OrderService: Create order
    OrderService->>ProductService: Check inventory
    ProductService-->>OrderService: Stock available
    OrderService->>MessageQueue: Publish "OrderCreated"
    OrderService-->>APIGateway: Order created (status: pending)
    APIGateway-->>Client: 201 Created

    MessageQueue-->>PaymentService: Consume event
    PaymentService->>Stripe: Process payment
    Stripe-->>PaymentService: Payment success
    PaymentService->>MessageQueue: Publish "PaymentSuccess"

    MessageQueue-->>OrderService: Consume event
    OrderService->>OrderService: Update status to "paid"

    MessageQueue-->>NotificationService: Consume event
    NotificationService->>SendGrid: Send confirmation email
```

**API Gateway** (single entry point):

```typescript
// API Gateway routes requests to appropriate services
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Route to services
app.use('/api/users', createProxyMiddleware({ target: 'http://user-service:3001' }));
app.use('/api/products', createProxyMiddleware({ target: 'http://product-service:3002' }));
app.use('/api/orders', createProxyMiddleware({ target: 'http://order-service:3003' }));

app.listen(3000);
```

---

## Testing Backend Code

### Unit Tests

**Purpose**: Test business logic in isolation (no external dependencies)

**Example** (Order validation):

```typescript
// order.service.ts
class OrderService {
  calculateDiscount(total: number, userRole: string): number {
    if (userRole === 'premium') return total * 0.2; // 20% discount
    if (userRole === 'regular') return total * 0.1; // 10% discount
    return 0;
  }

  validateOrder(items: CartItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('Cart is empty');
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total < 10) {
      errors.push('Minimum order amount is $10');
    }

    items.forEach(item => {
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.name}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}

// order.service.test.ts (Jest)
describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService();
  });

  describe('calculateDiscount', () => {
    it('should return 20% discount for premium users', () => {
      expect(service.calculateDiscount(100, 'premium')).toBe(20);
    });

    it('should return 10% discount for regular users', () => {
      expect(service.calculateDiscount(100, 'regular')).toBe(10);
    });

    it('should return 0 discount for guest users', () => {
      expect(service.calculateDiscount(100, 'guest')).toBe(0);
    });
  });

  describe('validateOrder', () => {
    it('should fail if cart is empty', () => {
      const result = service.validateOrder([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cart is empty');
    });

    it('should fail if total is less than $10', () => {
      const items = [{ name: 'Item', price: 5, quantity: 1 }];
      const result = service.validateOrder(items);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum order amount is $10');
    });

    it('should fail if quantity is invalid', () => {
      const items = [{ name: 'Item', price: 20, quantity: -1 }];
      const result = service.validateOrder(items);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid quantity for Item');
    });

    it('should pass for valid order', () => {
      const items = [
        { name: 'Item 1', price: 10, quantity: 1 },
        { name: 'Item 2', price: 5, quantity: 2 }
      ];
      const result = service.validateOrder(items);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
```

**Mocking Databases:**

```typescript
// Mock repository
const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn()
};

// Test service with mocked repo
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(mockUserRepo);
    jest.clearAllMocks();
  });

  it('should create user', async () => {
    mockUserRepo.findOne.mockResolvedValue(null); // User doesn't exist
    mockUserRepo.save.mockResolvedValue({ id: '1', email: 'user@example.com' });

    const result = await service.create({ email: 'user@example.com', password: 'pass' });

    expect(result).toEqual({ id: '1', email: 'user@example.com' });
    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com' })
    );
  });

  it('should throw error if user exists', async () => {
    mockUserRepo.findOne.mockResolvedValue({ id: '1', email: 'user@example.com' });

    await expect(service.create({ email: 'user@example.com', password: 'pass' }))
      .rejects
      .toThrow('User already exists');
  });
});
```

### Integration Tests

**Purpose**: Test API endpoints with real database (in test environment)

**Example** (Supertest + Test Database):

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { AppDataSource } from '../src/data-source';

describe('User API', () => {
  beforeAll(async () => {
    // Connect to test database
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    // Disconnect
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clean database before each test
    await AppDataSource.getRepository(User).clear();
  });

  describe('POST /api/users', () => {
    it('should create user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'user@example.com', password: 'SecurePass123' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('user@example.com');
      expect(res.body).not.toHaveProperty('passwordHash'); // Sensitive data hidden
    });

    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'invalid', password: 'SecurePass123' })
        .expect(400);

      expect(res.body.errors).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      // Create user first
      await request(app)
        .post('/api/users')
        .send({ email: 'user@example.com', password: 'SecurePass123' });

      // Try to create again
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'user@example.com', password: 'SecurePass123' })
        .expect(409);

      expect(res.body.error).toBe('User already exists');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user', async () => {
      // Create user
      const createRes = await request(app)
        .post('/api/users')
        .send({ email: 'user@example.com', password: 'SecurePass123' });

      // Get user
      const res = await request(app)
        .get(`/api/users/${createRes.body.id}`)
        .expect(200);

      expect(res.body.email).toBe('user@example.com');
    });

    it('should return 404 if user not found', async () => {
      await request(app)
        .get('/api/users/non-existent-id')
        .expect(404);
    });
  });
});
```

**Test Containers** (use Docker for integration tests):

```typescript
import { GenericContainer } from 'testcontainers';

describe('Database Integration', () => {
  let postgresContainer;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:15')
      .withEnvironment({ POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .start();

    const connectionString = `postgresql://postgres:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/test`;

    // Connect to database
    await AppDataSource.setOptions({ url: connectionString }).initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
    await postgresContainer.stop();
  });

  // Tests...
});
```

### E2E Tests

**Purpose**: Test complete user flows (from frontend to backend to database)

**Example** (Playwright):

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should register, login, and create order', async ({ page, request }) => {
    // 1. Register user
    const signupRes = await request.post('http://localhost:3000/api/users', {
      data: {
        email: 'e2e@example.com',
        password: 'SecurePass123',
        name: 'E2E User'
      }
    });
    expect(signupRes.status()).toBe(201);
    const user = await signupRes.json();

    // 2. Login
    const loginRes = await request.post('http://localhost:3000/auth/login', {
      data: {
        email: 'e2e@example.com',
        password: 'SecurePass123'
      }
    });
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();

    // 3. Create order
    const orderRes = await request.post('http://localhost:3000/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [
          { productId: 'prod-1', quantity: 2 }
        ]
      }
    });
    expect(orderRes.status()).toBe(201);
    const order = await orderRes.json();
    expect(order.status).toBe('pending');

    // 4. Verify order in UI
    await page.goto('http://localhost:3000');
    await page.fill('[name="email"]', 'e2e@example.com');
    await page.fill('[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/orders');
    await expect(page.locator(`[data-order-id="${order.id}"]`)).toBeVisible();
  });
});
```

---

## Performance Optimization

### Caching Strategies

#### 1. Application-Level Caching (In-Memory)

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  // Check cache first
  const cached = cache.get(`product:${id}`);
  if (cached) {
    return res.json(cached);
  }

  // Cache miss: Fetch from database
  const product = await productRepo.findOne({ where: { id } });

  // Store in cache
  cache.set(`product:${id}`, product);

  res.json(product);
});
```

#### 2. Redis Caching

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: 'redis://localhost:6379' });
await redis.connect();

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  // Check Redis
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Fetch from database
  const product = await productRepo.findOne({ where: { id } });

  // Store in Redis (10 minutes)
  await redis.setEx(`product:${id}`, 600, JSON.stringify(product));

  res.json(product);
});
```

#### 3. CDN for Static Assets

**Use Case**: Images, CSS, JavaScript files

```typescript
// Store user uploads in S3/Cloudinary
// CDN caches files globally (low latency)

const imageUrl = 'https://cdn.example.com/images/product-123.jpg';
```

#### 4. Cache Invalidation

```typescript
// When product is updated, invalidate cache
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  const product = await productRepo.update(id, req.body);

  // Invalidate cache
  await redis.del(`product:${id}`);

  res.json(product);
});
```

### Database Optimization

#### 1. Indexing

```sql
-- Without index: Full table scan (slow)
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Seq Scan on users (cost=0.00..1000.00 rows=1)

-- With index: Index scan (fast)
CREATE INDEX idx_users_email ON users(email);
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email (cost=0.00..8.27 rows=1)

-- Composite index (for multi-column queries)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query benefits from composite index
SELECT * FROM orders WHERE user_id = 'user-123' AND status = 'pending';
```

#### 2. Query Optimization

```typescript
// ❌ BAD: N+1 query problem
const users = await userRepo.find();
for (const user of users) {
  user.orders = await orderRepo.find({ where: { userId: user.id } });
}
// Result: 1 + N queries (1 for users, N for orders)

// ✅ GOOD: Use JOIN (eager loading)
const users = await userRepo.find({ relations: ['orders'] });
// Result: 1 query
```

#### 3. Connection Pooling

```typescript
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'myapp',
  extra: {
    // Connection pool settings
    max: 10, // Maximum 10 connections
    min: 2, // Minimum 2 connections
    idleTimeoutMillis: 30000 // Close idle connections after 30s
  }
});
```

#### 4. Read Replicas

```mermaid
graph LR
    App[Application]
    App -->|Writes| Primary[(Primary DB)]
    App -->|Reads| Replica1[(Replica 1)]
    App -->|Reads| Replica2[(Replica 2)]
    Primary -.->|Replicate| Replica1
    Primary -.->|Replicate| Replica2
```

```typescript
// Write to primary
await primaryDataSource.getRepository(User).save(user);

// Read from replica
const users = await replicaDataSource.getRepository(User).find();
```

### Load Balancing

**Concept**: Distribute traffic across multiple servers

```mermaid
graph TD
    Client[Clients] --> LB[Load Balancer<br/>nginx]
    LB --> S1[Server 1<br/>Port 3001]
    LB --> S2[Server 2<br/>Port 3002]
    LB --> S3[Server 3<br/>Port 3003]
    S1 --> DB[(Database)]
    S2 --> DB
    S3 --> DB
```

**nginx Configuration:**

```nginx
upstream backend {
  server localhost:3001;
  server localhost:3002;
  server localhost:3003;
}

server {
  listen 80;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## Error Handling & Logging

### Structured Logging

**Why:** Easy to search and analyze logs

**Example** (Winston):

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log examples
logger.info('User created', { userId: '123', email: 'user@example.com' });
logger.error('Payment failed', { orderId: '456', error: err.message });

// Example log output (JSON)
{
  "level": "info",
  "message": "User created",
  "userId": "123",
  "email": "user@example.com",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Log Aggregation** (ELK Stack: Elasticsearch + Logstash + Kibana):

```mermaid
graph LR
    App1[App Instance 1] -->|Logs| Logstash
    App2[App Instance 2] -->|Logs| Logstash
    App3[App Instance 3] -->|Logs| Logstash
    Logstash --> ES[(Elasticsearch)]
    ES --> Kibana[Kibana<br/>Web UI]
```

### Error Handling Patterns

```typescript
// Custom error classes
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

class ValidationError extends AppError {
  constructor(message: string, public errors: any[]) {
    super(400, message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(401, message);
  }
}

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err instanceof ValidationError && { errors: err.errors })
    });
  }

  // Unknown error (don't expose details)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Usage in routes
app.post('/api/users', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Missing fields', [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' }
      ]);
    }

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      throw new AppError(409, 'User already exists');
    }

    const user = await userService.create({ email, password });
    res.status(201).json(user);
  } catch (err) {
    next(err); // Pass to error handler
  }
});
```

---

## Security Best Practices

### 10 Essential Security Practices

#### 1. Input Validation

```typescript
import { body, validationResult } from 'express-validator';

app.post(
  '/api/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*\d)/),
    body('age').isInt({ min: 18, max: 120 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Proceed...
  }
);
```

#### 2. SQL Injection Prevention

```typescript
// ❌ BAD: String concatenation (SQL injection risk)
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD: Parameterized queries (ORM handles this)
const user = await userRepo.findOne({ where: { email } });

// ✅ GOOD: Raw query with parameters
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

#### 3. XSS Protection

```typescript
import helmet from 'helmet';
import xss from 'xss';

// Helmet sets security headers
app.use(helmet());

// Sanitize user input
app.post('/api/posts', (req, res) => {
  const sanitizedContent = xss(req.body.content);
  // Save sanitizedContent...
});
```

#### 4. HTTPS Only

```typescript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// Strict-Transport-Security header
app.use(helmet.hsts({ maxAge: 31536000 })); // 1 year
```

#### 5. Secure Headers

```typescript
app.use(helmet()); // Sets multiple security headers:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security
// - Content-Security-Policy
```

#### 6. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  message: 'Too many requests'
});

app.use('/api/', limiter);

// Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 login attempts
  skipSuccessfulRequests: true
});

app.use('/auth/login', authLimiter);
```

#### 7. CORS Configuration

```typescript
import cors from 'cors';

// ❌ BAD: Allow all origins
app.use(cors({ origin: '*' }));

// ✅ GOOD: Whitelist specific origins
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

#### 8. Secrets Management

```typescript
// ❌ BAD: Hardcoded secrets
const SECRET_KEY = 'my-secret-key';

// ✅ GOOD: Environment variables
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('JWT_SECRET not set');
}

// ✅ BETTER: Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });
const response = await client.send(new GetSecretValueCommand({ SecretId: 'prod/api/jwt' }));
const SECRET_KEY = JSON.parse(response.SecretString).JWT_SECRET;
```

#### 9. Dependency Scanning

```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for outdated dependencies
npm outdated
```

#### 10. Password Security

```typescript
import bcrypt from 'bcrypt';

// Hash password before storing
const passwordHash = await bcrypt.hash(password, 10); // 10 rounds

// Verify password
const isValid = await bcrypt.compare(password, user.passwordHash);

// Password requirements
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
// - At least 8 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 digit
// - At least 1 special character
```

---

## Real-World Example: Blog API

**Complete backend system** with all concepts applied.

### Features

- User authentication (JWT)
- CRUD for posts
- Comments on posts
- Tags (many-to-many relationship)
- Search posts
- Pagination
- File uploads (S3)

### Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Indexes
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_comments_post_id ON comments(post_id);
```

### Key Files

**1. Post Entity** (TypeORM):

```typescript
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ unique: true })
  slug: string;

  @ManyToOne(() => User, user => user.posts)
  author: User;

  @ManyToMany(() => Tag)
  @JoinTable({ name: 'post_tags' })
  tags: Tag[];

  @OneToMany(() => Comment, comment => comment.post)
  comments: Comment[];

  @Column({ default: false })
  published: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**2. Post Service** (Business logic):

```typescript
export class PostService {
  async createPost(authorId: string, data: CreatePostDto): Promise<Post> {
    const slug = this.generateSlug(data.title);

    // Check for duplicate slug
    const existing = await postRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    // Create post
    const post = postRepo.create({
      ...data,
      slug,
      author: { id: authorId }
    });

    // Handle tags
    if (data.tagIds) {
      post.tags = await tagRepo.findByIds(data.tagIds);
    }

    return postRepo.save(post);
  }

  async searchPosts(query: string, page = 1, limit = 20): Promise<PaginatedResult<Post>> {
    const [posts, total] = await postRepo.findAndCount({
      where: [
        { title: Like(`%${query}%`), published: true },
        { content: Like(`%${query}%`), published: true }
      ],
      relations: ['author', 'tags'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return {
      data: posts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
```

**3. Post Controller** (API routes):

```typescript
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  async listPosts(
    @Query('page') page?: number,
    @Query('search') search?: string
  ) {
    if (search) {
      return this.postService.searchPosts(search, page);
    }
    return this.postService.findAll({ page });
  }

  @Get(':slug')
  async getPost(@Param('slug') slug: string) {
    return this.postService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Req() req, @Body() dto: CreatePostDto) {
    return this.postService.createPost(req.user.userId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  async updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.postService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @HttpCode(204)
  async deletePost(@Param('id') id: string) {
    await this.postService.delete(id);
  }
}
```

**4. File Upload** (S3):

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';

const s3 = new S3Client({ region: 'us-east-1' });
const upload = multer({ storage: multer.memoryStorage() });

@Post('upload')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('file'))
async uploadImage(@UploadedFile() file: Express.Multer.File) {
  const key = `images/${Date.now()}-${file.originalname}`;

  await s3.send(new PutObjectCommand({
    Bucket: 'my-blog-bucket',
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  return {
    url: `https://my-blog-bucket.s3.amazonaws.com/${key}`
  };
}
```

---

## How SpecWeave Supports Backend Development

**SpecWeave's incremental approach is ideal for backend development**:

### 1. API Specifications in spec.md

```markdown
## US-001: User Authentication API

**Acceptance Criteria**:
- **AC-US1-01**: POST /auth/login accepts email/password, returns JWT
- **AC-US1-02**: Protected routes require valid JWT in Authorization header
- **AC-US1-03**: Invalid credentials return 401 with error message
```

### 2. Architecture Decisions (ADRs)

```markdown
# ADR-005: Why PostgreSQL Over MongoDB

**Context**: Need to choose database for blog platform

**Decision**: PostgreSQL

**Rationale**:
- Strong relationships (users → posts → comments)
- ACID transactions (payment processing later)
- Complex queries (search, reporting)
- Mature ecosystem (TypeORM, Prisma)

**Consequences**:
- ✅ Data integrity guaranteed
- ✅ Complex queries with JOINs
- ❌ Less flexible schema (migrations required)
```

### 3. Test Coverage Tracking

SpecWeave's test-aware planning embeds tests in `tasks.md`:

```markdown
## T-001: Implement Authentication API

**Test Plan**:
- **Given** valid credentials → **When** POST /auth/login → **Then** receive JWT token

**Test Cases**:
- Unit (auth.service.test.ts): validateCredentials, generateToken → 90% coverage
- Integration (auth.api.test.ts): POST /auth/login (success, invalid, missing fields) → 85% coverage
```

### 4. Database Schema Evolution

Track schema changes in increment tasks:

```markdown
## T-003: Add Comments Feature

**Database Migration**:
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  author_id UUID REFERENCES users(id),
  content TEXT NOT NULL
);
```

**Tests**: Integration test for POST /posts/:id/comments
```

### 5. Living API Documentation

After `/specweave:done`, sync docs automatically:

```bash
/specweave:sync-docs update

# Updates:
# - .specweave/docs/public/api/authentication.md
# - .specweave/docs/public/api/posts.md
# - OpenAPI spec
```

---

## Next Steps

**After mastering backend fundamentals:**

1. **Related Guides**:
   - [API Design Best Practices](.specweave/docs/learn/backend/api-design)
   - [Database Design Guide](.specweave/docs/learn/backend/database-design)
   - [Microservices Architecture](.specweave/docs/learn/backend/microservices)

2. **Glossary Terms**:
   - [REST API](../glossary/terms/rest-api)
   - [PostgreSQL](../glossary/terms/postgresql)
   - [JWT](../glossary/terms/jwt)
   - [Docker](../glossary/terms/docker)
   - [CI/CD](../glossary/terms/ci-cd)

3. **Hands-On Practice**:
   - Build a blog API (follow this guide)
   - Add authentication (JWT)
   - Deploy to production (Docker + AWS)

4. **Advanced Topics**:
   - [GraphQL API Development](.specweave/docs/learn/backend/graphql)
   - [Serverless Architecture](.specweave/docs/learn/backend/serverless)
   - [Event-Driven Systems](.specweave/docs/learn/backend/event-driven)

---

**Questions or feedback?** [Open an issue](https://github.com/anton-abyzov/specweave/issues) or [join discussions](https://github.com/anton-abyzov/specweave/discussions).
